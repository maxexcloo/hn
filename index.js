const express = require("express");
const helmet = require("helmet");
const path = require("path");
const sanitizeHtml = require("sanitize-html");

const API_BASE_URL = "https://hacker-news.firebaseio.com/v0/";
const API_CONCURRENCY = 20;
const API_RESPONSE_LIMIT = 1024 * 1024;
const API_TIMEOUT = 10 * 1000;
const CACHE_DURATION = 5 * 60 * 1000;
const CACHE_SIZE_LIMIT = 32 * 1024 * 1024;
const COMMENT_DEPTH_LIMIT = 20;
const COMMENT_LIMIT = 500;
const COMMENT_REQUEST_TIMEOUT = 30 * 1000;
const COMMENT_RESPONSE_LIMIT = 8 * 1024 * 1024;
const MAX_CACHE_SIZE = 100;
const MAX_COMMENT_REQUESTS = 5;
const MAX_STORY_IDS = 500;
const SHUTDOWN_TIMEOUT = 10 * 1000;
const STORY_RESPONSE_LIMIT = 16 * 1024 * 1024;
const VALID_FILTERS = new Set(["all", "top-10", "top-20", "top-50"]);

class NotFoundError extends Error {}
class OperationLimitError extends Error {}

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
  apiResponseLimit = API_RESPONSE_LIMIT,
  apiTimeout = API_TIMEOUT,
  commentRequestTimeout = COMMENT_REQUEST_TIMEOUT,
  commentResponseLimit = COMMENT_RESPONSE_LIMIT,
  storyResponseLimit = STORY_RESPONSE_LIMIT,
} = {}) => {
  const cache = new Map();
  const commentRequests = new Map();
  const limitRequest = createLimiter(API_CONCURRENCY);
  let cacheSize = 0;
  let lastStoryError = null;
  let lastStorySuccessAt = null;
  let storiesRequest = null;

  const deleteOldestCacheEntry = () => {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cacheSize -= cache.get(oldestKey).size;
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
    const size = Buffer.byteLength(JSON.stringify(data));
    if (size > CACHE_SIZE_LIMIT) {
      return;
    }

    const existing = cache.get(key);
    if (existing) {
      cacheSize -= existing.size;
    }
    cache.delete(key);
    while (
      cache.size >= MAX_CACHE_SIZE ||
      cacheSize + size > CACHE_SIZE_LIMIT
    ) {
      deleteOldestCacheEntry();
    }
    cache.set(key, { data, size, timestamp: now() });
    cacheSize += size;
  };

  const fetchJson = async (pathname, { budget, signal } = {}) => {
    const controller = new AbortController();
    const abortFromParent = () => controller.abort(signal.reason);
    if (signal) {
      if (signal.aborted) {
        abortFromParent();
      } else {
        signal.addEventListener("abort", abortFromParent, { once: true });
      }
    }
    const timeout = setTimeout(() => controller.abort(), apiTimeout);
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
      if (contentLength > apiResponseLimit) {
        throw new OperationLimitError(
          `HN API response exceeded ${apiResponseLimit} bytes`,
        );
      }

      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        const buffer = Buffer.from(chunk);
        size += buffer.length;
        if (size > apiResponseLimit) {
          controller.abort();
          throw new OperationLimitError(
            `HN API response exceeded ${apiResponseLimit} bytes`,
          );
        }
        if (budget && budget.used + buffer.length > budget.limit) {
          const error = new OperationLimitError(
            `HN API operation exceeded ${budget.limit} bytes`,
          );
          budget.abort(error);
          throw error;
        }
        if (budget) {
          budget.used += buffer.length;
        }
        chunks.push(buffer);
      }

      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch (error) {
      if (signal?.aborted && signal.reason instanceof Error) {
        throw signal.reason;
      }
      if (error.name === "AbortError") {
        throw new Error(`HN API request timed out for ${pathname}`, {
          cause: error,
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromParent);
    }
  };

  const fetchItem = (id, options) =>
    limitRequest(() => fetchJson(`item/${id}.json`, options));

  const createBudget = (limit, controller) => ({
    abort: (error) => controller.abort(error),
    limit,
    used: 0,
  });

  const projectStory = (story) => ({
    by: story.by || "unknown",
    descendants: Number.isSafeInteger(story.descendants)
      ? story.descendants
      : 0,
    id: story.id,
    score: Number.isFinite(story.score) ? story.score : 0,
    time: story.time,
    title: story.title,
    type: "story",
    ...(typeof story.url === "string" ? { url: story.url } : {}),
  });

  const sanitiseComment = (comment) => ({
    by: comment.by,
    id: comment.id,
    text: sanitizeHtml(comment.text || "", {
      allowedAttributes: { a: ["href", "rel"] },
      allowedSchemes: ["http", "https"],
      allowedTags: ["a", "code", "i", "p", "pre"],
      allowProtocolRelative: false,
      transformTags: {
        a: (tagName, attributes) => {
          const itemMatch = attributes.href?.match(/^\/?item\?id=(\d+)$/);
          const itemId = itemMatch ? Number(itemMatch[1]) : null;
          const href = Number.isSafeInteger(itemId)
            ? `/comments/${itemId}`
            : attributes.href;
          return {
            attribs: {
              ...attributes,
              ...(href ? { href } : {}),
              rel: "nofollow noreferrer",
            },
            tagName,
          };
        },
      },
    }),
    time: comment.time,
  });

  const fetchCommentsUncached = async (storyId) => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () =>
        controller.abort(
          new OperationLimitError("Comment request exceeded its deadline"),
        ),
      commentRequestTimeout,
    );
    const options = {
      budget: createBudget(commentResponseLimit, controller),
      signal: controller.signal,
    };

    try {
      const rawStory = await fetchItem(storyId, options);
      if (!rawStory || rawStory.type !== "story" || !rawStory.title) {
        throw new NotFoundError("Story not found");
      }

      const visited = new Set();
      let remainingComments = COMMENT_LIMIT;

      const fetchComment = async (commentId, depth) => {
        if (
          !Number.isSafeInteger(commentId) ||
          commentId <= 0 ||
          depth > COMMENT_DEPTH_LIMIT ||
          remainingComments <= 0 ||
          visited.has(commentId)
        ) {
          return null;
        }

        remainingComments -= 1;
        visited.add(commentId);

        try {
          const comment = await fetchItem(commentId, options);
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
          if (error instanceof OperationLimitError) {
            throw error;
          }
          logger.warn(`Failed to fetch comment ${commentId}: ${error.message}`);
          return null;
        }
      };

      const comments = await Promise.all(
        (rawStory.kids || []).map((id) => fetchComment(id, 0)),
      );

      return {
        comments: comments.filter(Boolean),
        story: projectStory(rawStory),
      };
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
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
    const controller = new AbortController();
    const options = {
      budget: createBudget(storyResponseLimit, controller),
      signal: controller.signal,
    };
    try {
      const storyIds = await limitRequest(() =>
        fetchJson("topstories.json", options),
      );
      if (!Array.isArray(storyIds)) {
        throw new Error("HN API returned an invalid story list");
      }

      const stories = await Promise.all(
        storyIds
          .filter((id) => Number.isSafeInteger(id) && id > 0)
          .slice(0, MAX_STORY_IDS)
          .map((id) =>
            fetchItem(id, options).catch((error) => {
              if (error instanceof OperationLimitError) {
                throw error;
              }
              logger.warn(`Failed to fetch story ${id}: ${error.message}`);
              return null;
            }),
          ),
      );

      const validStories = stories.filter(
        (story) =>
          story &&
          story.type === "story" &&
          typeof story.title === "string" &&
          story.title &&
          Number.isSafeInteger(story.id) &&
          story.id > 0 &&
          Number.isFinite(story.time),
      );
      if (validStories.length === 0) {
        throw new Error("HN API returned no valid stories");
      }

      return validStories.map(projectStory);
    } finally {
      controller.abort();
    }
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

    const ready = cache.has("all-stories");
    return {
      cache: {
        bytes: cacheSize,
        entries,
        maxBytes: CACHE_SIZE_LIMIT,
        maxSize: MAX_CACHE_SIZE,
        size: cache.size,
      },
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

const filterStories = (stories, filter) => {
  const byScore = [...stories].sort(
    (first, second) => second.score - first.score,
  );
  const limit = {
    "top-10": 10,
    "top-20": 20,
    "top-50": Math.ceil(stories.length * 0.5),
  }[filter];

  return (limit ? byScore.slice(0, limit) : [...stories]).sort(
    (first, second) => second.time - first.time,
  );
};

const groupStories = (stories, filter) => {
  const groups = new Map();
  for (const story of stories) {
    const date = new Date(story.time * 1000);
    const key = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");

    if (!groups.has(key)) {
      groups.set(key, {
        label: date.toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
          weekday: "short",
          year: "numeric",
        }),
        stories: [],
      });
    }
    groups.get(key).stories.push(story);
  }

  return [...groups.entries()]
    .sort(([first], [second]) => second.localeCompare(first))
    .map(([, group]) => ({
      ...group,
      stories: filterStories(group.stories, filter).map((story) => {
        const storyUrl = normaliseStoryUrl(story.url);
        return {
          ...story,
          storyHost: storyUrl ? new URL(storyUrl).hostname : null,
          storyUrl,
        };
      }),
    }));
};

const serialiseForHtml = (value) =>
  JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");

const isValidId = (id) => {
  if (!/^\d+$/.test(id)) {
    return false;
  }
  const value = Number(id);
  return Number.isSafeInteger(value) && value > 0;
};

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
      const currentFilter = normaliseFilter(request.query.filter);

      response.render("index", {
        bootstrapData: serialiseForHtml({
          currentFilter,
          stories: recentStories,
        }),
        storyGroups: groupStories(recentStories, currentFilter),
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
  exit = process.exit,
  logger = console,
  port = process.env.PORT || 3000,
  shutdownTimeout = SHUTDOWN_TIMEOUT,
  storyService,
} = {}) => {
  let forceTimer = null;
  let refreshTimer = null;
  let shuttingDown = false;
  const server = app.listen(port, (error) => {
    if (error) {
      logger.error(`Unable to start server: ${error.message}`);
      exit(1);
      return;
    }
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
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    process.removeListener("SIGINT", onSigint);
    process.removeListener("SIGTERM", onSigterm);
    logger.log(`${signal} received, shutting down`);
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    forceTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out");
      server.closeAllConnections?.();
      exit(1);
    }, shutdownTimeout);
    forceTimer.unref();
    server.close(() => {
      clearTimeout(forceTimer);
      exit(0);
    });
  };

  const onSigint = () => shutdown("SIGINT");
  const onSigterm = () => shutdown("SIGTERM");
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);
  return server;
};

if (require.main === module) {
  const storyService = createStoryService();
  startServer({ app: createApp({ storyService }), storyService });
}

module.exports = {
  NotFoundError,
  OperationLimitError,
  createApp,
  createLimiter,
  createStoryService,
  filterStories,
  groupStories,
  isValidId,
  normaliseFilter,
  normaliseStoryUrl,
  serialiseForHtml,
  startServer,
};
