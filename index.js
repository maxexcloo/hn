const express = require("express");
const helmet = require("helmet");
const path = require("path");
const sanitizeHtml = require("sanitize-html");

const API_BASE_URL = "https://hacker-news.firebaseio.com/v0/";
const API_CONCURRENCY = 20;
const API_RESPONSE_LIMIT = 1024 * 1024;
const API_TIMEOUT = 10 * 1000;
const CACHE_DURATION = 5 * 60 * 1000;
const COMMENT_DEPTH_LIMIT = 20;
const COMMENT_LIMIT = 500;
const MAX_CACHE_SIZE = 100;
const MAX_COMMENT_REQUESTS = 5;
const MAX_STORY_IDS = 500;
const VALID_FILTERS = new Set(["all", "top-10", "top-20", "top-50"]);

class NotFoundError extends Error {}

const createLimiter = (concurrency) => {
  const queue = [];
  let activeCount = 0;

  const runNext = () => {
    if (activeCount >= concurrency || queue.length === 0) {
      return;
    }

    activeCount += 1;
    const { reject, resolve, task } = queue.shift();

    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        activeCount -= 1;
        runNext();
      });
  };

  return (task) =>
    new Promise((resolve, reject) => {
      queue.push({ reject, resolve, task });
      runNext();
    });
};

const createStoryService = ({
  apiBaseUrl = API_BASE_URL,
  fetchImpl = globalThis.fetch,
  logger = console,
  now = Date.now,
} = {}) => {
  const cache = new Map();
  const commentRequests = new Map();
  const limitRequest = createLimiter(API_CONCURRENCY);
  let lastStoryError = null;
  let lastStorySuccessAt = null;
  let storiesRequest = null;

  const deleteOldestCacheEntry = () => {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  };

  const getCached = (key, { allowExpired = false } = {}) => {
    const cached = cache.get(key);
    if (!cached) {
      return null;
    }

    const expired = now() - cached.timestamp >= CACHE_DURATION;
    if (expired && !allowExpired) {
      return null;
    }

    cache.delete(key);
    cache.set(key, cached);
    return cached.data;
  };

  const setCached = (key, data) => {
    cache.delete(key);
    while (cache.size >= MAX_CACHE_SIZE) {
      deleteOldestCacheEntry();
    }
    cache.set(key, { data, timestamp: now() });
  };

  const fetchJson = async (pathname) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
    const url = new URL(pathname, apiBaseUrl);

    try {
      const response = await fetchImpl(url, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `HN API returned HTTP ${response.status} for ${pathname}`,
        );
      }

      const contentLength = Number(response.headers.get("content-length"));
      if (contentLength > API_RESPONSE_LIMIT) {
        throw new Error(`HN API response exceeded ${API_RESPONSE_LIMIT} bytes`);
      }

      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        const buffer = Buffer.from(chunk);
        size += buffer.length;
        if (size > API_RESPONSE_LIMIT) {
          controller.abort();
          throw new Error(
            `HN API response exceeded ${API_RESPONSE_LIMIT} bytes`,
          );
        }
        chunks.push(buffer);
      }

      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(`HN API request timed out for ${pathname}`, {
          cause: error,
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const fetchItem = (id) => limitRequest(() => fetchJson(`item/${id}.json`));

  const sanitiseComment = (comment) => ({
    ...comment,
    text: sanitizeHtml(comment.text || "", {
      allowedAttributes: { a: ["href", "rel"] },
      allowedSchemes: ["http", "https"],
      allowedTags: ["a", "code", "i", "p", "pre"],
      transformTags: {
        a: sanitizeHtml.simpleTransform(
          "a",
          { rel: "nofollow noreferrer" },
          true,
        ),
      },
    }),
  });

  const fetchCommentsUncached = async (storyId) => {
    const story = await fetchItem(storyId);
    if (!story || story.type !== "story" || !story.title) {
      throw new NotFoundError("Story not found");
    }

    const visited = new Set();
    let remainingComments = COMMENT_LIMIT;

    const fetchComment = async (commentId, depth) => {
      if (
        depth > COMMENT_DEPTH_LIMIT ||
        remainingComments <= 0 ||
        visited.has(commentId)
      ) {
        return null;
      }

      remainingComments -= 1;
      visited.add(commentId);

      try {
        const comment = await fetchItem(commentId);
        if (!comment || comment.type !== "comment") {
          return null;
        }

        const children = await Promise.all(
          (comment.kids || []).map((id) => fetchComment(id, depth + 1)),
        );

        return {
          ...sanitiseComment(comment),
          children: children.filter(Boolean),
        };
      } catch (error) {
        logger.warn(`Failed to fetch comment ${commentId}: ${error.message}`);
        return null;
      }
    };

    const comments = await Promise.all(
      (story.kids || []).map((id) => fetchComment(id, 0)),
    );

    return { comments: comments.filter(Boolean), story };
  };

  const fetchComments = async (storyId) => {
    const cacheKey = `comments-${storyId}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }

    if (commentRequests.has(storyId)) {
      return commentRequests.get(storyId);
    }

    if (commentRequests.size >= MAX_COMMENT_REQUESTS) {
      throw new Error("Too many comment requests are in progress");
    }

    const request = fetchCommentsUncached(storyId)
      .then((result) => {
        setCached(cacheKey, result);
        return result;
      })
      .catch((error) => {
        const stale = getCached(cacheKey, { allowExpired: true });
        if (stale) {
          logger.warn(
            `Returning stale comments for ${storyId}: ${error.message}`,
          );
          return stale;
        }
        throw error;
      })
      .finally(() => commentRequests.delete(storyId));

    commentRequests.set(storyId, request);
    return request;
  };

  const fetchStoriesUncached = async () => {
    const storyIds = await limitRequest(() => fetchJson("topstories.json"));
    if (!Array.isArray(storyIds)) {
      throw new Error("HN API returned an invalid story list");
    }

    const stories = await Promise.all(
      storyIds
        .filter((id) => Number.isSafeInteger(id) && id > 0)
        .slice(0, MAX_STORY_IDS)
        .map((id) =>
          fetchItem(id).catch((error) => {
            logger.warn(`Failed to fetch story ${id}: ${error.message}`);
            return null;
          }),
        ),
    );

    const validStories = stories.filter(
      (story) => story && story.type === "story" && story.title,
    );
    if (validStories.length === 0) {
      throw new Error("HN API returned no valid stories");
    }

    return validStories;
  };

  const fetchStories = async ({ force = false } = {}) => {
    const cached = force ? null : getCached("all-stories");
    if (cached) {
      return cached;
    }

    if (storiesRequest) {
      return storiesRequest;
    }

    storiesRequest = fetchStoriesUncached()
      .then((stories) => {
        lastStoryError = null;
        lastStorySuccessAt = now();
        setCached("all-stories", stories);
        return stories;
      })
      .catch((error) => {
        lastStoryError = error.message;
        const stale = getCached("all-stories", { allowExpired: true });
        if (stale) {
          logger.warn(`Returning stale stories: ${error.message}`);
          return stale;
        }
        throw error;
      })
      .finally(() => {
        storiesRequest = null;
      });

    return storiesRequest;
  };

  const getStatus = () => {
    const entries = [];
    for (const [key, value] of cache.entries()) {
      const age = now() - value.timestamp;
      entries.push({
        ageSeconds: Math.round(age / 1000),
        expired: age >= CACHE_DURATION,
        key,
      });
    }

    const ready = getCached("all-stories", { allowExpired: true }) !== null;
    return {
      cache: { entries, maxSize: MAX_CACHE_SIZE, size: cache.size },
      lastStoryError,
      lastStorySuccessAt,
      ready,
      status: ready ? (lastStoryError ? "degraded" : "ready") : "unavailable",
    };
  };

  return { fetchComments, fetchStories, getStatus };
};

const normaliseFilter = (filter) =>
  typeof filter === "string" && VALID_FILTERS.has(filter) ? filter : "top-20";

const normaliseStoryUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

const serialiseForHtml = (value) =>
  JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");

const isValidId = (id) => /^\d+$/.test(id) && Number(id) > 0;

const createApp = ({ storyService = createStoryService() } = {}) => {
  const app = express();

  app.disable("x-powered-by");
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/", async (request, response) => {
    try {
      const allStories = await storyService.fetchStories();
      const sevenDaysAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;
      const recentStories = allStories.filter(
        (story) => story.time > sevenDaysAgo,
      );

      response.render("index", {
        bootstrapData: serialiseForHtml({
          currentFilter: normaliseFilter(request.query.filter),
          stories: recentStories,
        }),
      });
    } catch (error) {
      console.error(`Unable to load stories: ${error.message}`);
      response.status(503).render("error", {
        error: "Stories unavailable",
        message:
          "Unable to load Hacker News stories. Please try again shortly.",
      });
    }
  });

  app.get("/comments/:id", async (request, response) => {
    const storyId = request.params.id;
    if (!isValidId(storyId)) {
      return response.status(400).render("error", {
        error: "Invalid story ID",
        message: "The requested story could not be found.",
      });
    }

    try {
      const { comments, story } = await storyService.fetchComments(storyId);
      return response.render("comments", {
        comments,
        story,
        storyUrl: normaliseStoryUrl(story.url),
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return response.status(404).render("error", {
          error: "Story not found",
          message: "The requested story could not be found.",
        });
      }

      console.error(`Unable to load comments for ${storyId}: ${error.message}`);
      return response.status(503).render("error", {
        error: "Comments unavailable",
        message: "Unable to load comments. Please try again shortly.",
      });
    }
  });

  app.get("/cache-status", (request, response) => {
    response.json(storyService.getStatus().cache);
  });

  app.get("/health", (request, response) => {
    response.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/ready", (request, response) => {
    const status = storyService.getStatus();
    response.status(status.ready ? 200 : 503).json({
      lastStoryError: status.lastStoryError,
      lastStorySuccessAt: status.lastStorySuccessAt,
      status: status.status,
      timestamp: new Date().toISOString(),
    });
  });

  app.use((request, response) => {
    response.status(404).render("error", {
      error: "Page not found",
      message: "The page you are looking for does not exist.",
    });
  });

  return app;
};

const startServer = ({
  app = createApp(),
  logger = console,
  port = process.env.PORT || 3000,
  storyService,
} = {}) => {
  let refreshTimer = null;
  const server = app.listen(port, () => {
    logger.log(`Server listening on port ${port}`);

    if (!storyService) {
      return;
    }

    const refresh = async () => {
      try {
        await storyService.fetchStories({ force: true });
        logger.log("Stories cache refreshed");
      } catch (error) {
        logger.error(`Stories cache refresh failed: ${error.message}`);
      } finally {
        refreshTimer = setTimeout(refresh, CACHE_DURATION);
        refreshTimer.unref();
      }
    };

    void refresh();
  });

  const shutdown = (signal) => {
    logger.log(`${signal} received, shutting down`);
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    server.close(() => process.exit(0));
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  return server;
};

if (require.main === module) {
  const storyService = createStoryService();
  startServer({ app: createApp({ storyService }), storyService });
}

module.exports = {
  NotFoundError,
  createApp,
  createLimiter,
  createStoryService,
  isValidId,
  normaliseFilter,
  normaliseStoryUrl,
  serialiseForHtml,
  startServer,
};
