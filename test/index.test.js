const assert = require("node:assert/strict");
const test = require("node:test");

const {
  NotFoundError,
  OperationLimitError,
  createApp,
  createLimiter,
  createStoryService,
  isValidId,
  normaliseFilter,
  normaliseStoryUrl,
  serialiseForHtml,
  startServer,
} = require("../index");

const createApi = (items) => {
  const calls = [];
  const fetchImpl = async (url) => {
    const pathname = new URL(url).pathname;
    calls.push(pathname);
    const value = items[pathname];
    if (value instanceof Error) {
      throw value;
    }
    return new Response(JSON.stringify(value), {
      headers: { "content-type": "application/json" },
      status: value === undefined ? 404 : 200,
    });
  };
  return { calls, fetchImpl };
};

const listen = (app) =>
  new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(server);
      }
    });
  });

const request = async (server, pathname) => {
  const { port } = server.address();
  return fetch(`http://127.0.0.1:${port}${pathname}`);
};

test("normalises filters and external story URLs", () => {
  assert.equal(normaliseFilter("all"), "all");
  assert.equal(normaliseFilter("bogus"), "top-20");
  assert.equal(
    normaliseStoryUrl("https://example.com/story"),
    "https://example.com/story",
  );
  assert.equal(normaliseStoryUrl("javascript:alert(1)"), null);
  assert.equal(normaliseStoryUrl("not a URL"), null);
  assert.equal(isValidId("123"), true);
  assert.equal(isValidId("0"), false);
  assert.equal(isValidId("9007199254740992"), false);
});

test("serialises bootstrap data without closing its script element", () => {
  const serialised = serialiseForHtml({
    title: "</script><script>alert(1)</script>",
  });
  assert.doesNotMatch(serialised, /<\/script>/);
  assert.deepEqual(JSON.parse(serialised), {
    title: "</script><script>alert(1)</script>",
  });
});

test("limits concurrent work", async () => {
  const limit = createLimiter(2);
  let active = 0;
  let maximum = 0;
  const tasks = Array.from({ length: 8 }, () =>
    limit(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    }),
  );
  await Promise.all(tasks);
  assert.equal(maximum, 2);
});

test("coalesces story refreshes and falls back to stale data", async () => {
  const items = {
    "/v0/item/1.json": {
      by: "alice",
      id: 1,
      score: 10,
      time: 1,
      title: "Story",
      type: "story",
    },
    "/v0/topstories.json": [1],
  };
  const api = createApi(items);
  let timestamp = 0;
  const service = createStoryService({
    fetchImpl: api.fetchImpl,
    logger: { warn() {} },
    now: () => timestamp,
  });

  const [first, second] = await Promise.all([
    service.fetchStories(),
    service.fetchStories(),
  ]);
  assert.deepEqual(first, second);
  assert.equal(
    api.calls.filter((call) => call.endsWith("topstories.json")).length,
    1,
  );

  timestamp = 10 * 60 * 1000;
  items["/v0/topstories.json"] = new Error("offline");
  assert.deepEqual(await service.fetchStories({ force: true }), first);
  assert.equal(service.getStatus().status, "degraded");
});

test("sanitises comments and coalesces comment requests", async () => {
  const api = createApi({
    "/v0/item/1.json": {
      id: 1,
      kids: [2],
      title: "Story",
      type: "story",
    },
    "/v0/item/2.json": {
      by: "alice",
      id: 2,
      text: '<p>Hello</p><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><a href="https://example.com">safe</a><a href="item?id=3">thread</a><a href="//example.com">relative</a>',
      time: 1,
      type: "comment",
    },
  });
  const service = createStoryService({ fetchImpl: api.fetchImpl });
  const [first, second] = await Promise.all([
    service.fetchComments("1"),
    service.fetchComments("1"),
  ]);
  const text = first.comments[0].text;

  assert.deepEqual(first, second);
  assert.doesNotMatch(text, /img|javascript|onerror/);
  assert.match(text, /href="https:\/\/example.com"/);
  assert.match(text, /href="\/comments\/3"/);
  assert.match(text, /rel="nofollow noreferrer"/);
  assert.doesNotMatch(text, /href="\/\/example.com"/);
  assert.equal("kids" in first.story, false);
  assert.equal("kids" in first.comments[0], false);
  assert.equal(
    api.calls.filter((call) => call.endsWith("/item/1.json")).length,
    1,
  );
});

test("falls back to stale comments after an upstream failure", async () => {
  const items = {
    "/v0/item/1.json": {
      id: 1,
      kids: [],
      title: "Story",
      type: "story",
    },
  };
  const api = createApi(items);
  let timestamp = 0;
  const service = createStoryService({
    fetchImpl: api.fetchImpl,
    logger: { warn() {} },
    now: () => timestamp,
  });
  const first = await service.fetchComments("1");

  timestamp = 10 * 60 * 1000;
  items["/v0/item/1.json"] = new Error("offline");
  assert.deepEqual(await service.fetchComments("1"), first);
});

test("enforces per-response and aggregate response limits", async () => {
  const api = createApi({
    "/v0/item/1.json": {
      id: 1,
      kids: [2],
      title: "A story title larger than the configured response limit",
      type: "story",
    },
    "/v0/item/2.json": {
      by: "alice",
      id: 2,
      text: "A comment that pushes the operation over its aggregate limit",
      time: 1,
      type: "comment",
    },
    "/v0/topstories.json": [1],
  });

  await assert.rejects(
    createStoryService({
      apiResponseLimit: 20,
      fetchImpl: api.fetchImpl,
    }).fetchStories(),
    OperationLimitError,
  );
  await assert.rejects(
    createStoryService({
      commentResponseLimit: 150,
      fetchImpl: api.fetchImpl,
    }).fetchComments("1"),
    OperationLimitError,
  );
});

test("applies a deadline to a complete comment-tree request", async () => {
  const fetchImpl = (url, { signal }) =>
    new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
    });
  const service = createStoryService({
    apiTimeout: 1000,
    commentRequestTimeout: 5,
    fetchImpl,
  });

  await assert.rejects(service.fetchComments("1"), /exceeded its deadline/);
});

test("stops traversing comments beyond the depth limit", async () => {
  const items = {
    "/v0/item/1.json": {
      id: 1,
      kids: [2],
      title: "Story",
      type: "story",
    },
  };
  for (let id = 2; id <= 24; id += 1) {
    items[`/v0/item/${id}.json`] = {
      by: "alice",
      id,
      kids: id < 24 ? [id + 1] : [],
      text: `Comment ${id}`,
      time: id,
      type: "comment",
    };
  }
  const api = createApi(items);

  await createStoryService({ fetchImpl: api.fetchImpl }).fetchComments("1");
  assert.equal(api.calls.includes("/v0/item/22.json"), true);
  assert.equal(api.calls.includes("/v0/item/23.json"), false);
});

test("stops traversing comments at the count limit", async () => {
  const items = {
    "/v0/item/1.json": {
      id: 1,
      kids: Array.from({ length: 501 }, (_, index) => index + 2),
      title: "Story",
      type: "story",
    },
  };
  for (let id = 2; id <= 502; id += 1) {
    items[`/v0/item/${id}.json`] = {
      by: "alice",
      id,
      text: `Comment ${id}`,
      time: id,
      type: "comment",
    };
  }
  const api = createApi(items);

  const result = await createStoryService({
    fetchImpl: api.fetchImpl,
  }).fetchComments("1");
  assert.equal(result.comments.length, 500);
  assert.equal(api.calls.includes("/v0/item/501.json"), true);
  assert.equal(api.calls.includes("/v0/item/502.json"), false);
});

test("bounds simultaneous comment-tree loads", async () => {
  const pending = [];
  const fetchImpl = (url) =>
    new Promise((resolve) => pending.push({ resolve, url: new URL(url) }));
  const service = createStoryService({ fetchImpl });
  const requests = [1, 2, 3, 4, 5].map((id) =>
    service.fetchComments(String(id)),
  );

  await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(
    service.fetchComments("6"),
    /Too many comment requests are in progress/,
  );

  pending.forEach(({ resolve, url }) => {
    const id = Number(url.pathname.split("/").at(-1).replace(".json", ""));
    resolve(
      new Response(
        JSON.stringify({ id, kids: [], title: `Story ${id}`, type: "story" }),
        { status: 200 },
      ),
    );
  });
  await Promise.all(requests);
});

test("serves reachable status routes and a strict CSP", async (context) => {
  const storyService = {
    async fetchStories() {
      return [
        {
          by: "alice",
          descendants: 0,
          id: 1,
          score: 1,
          time: Date.now() / 1000,
          title: "</script><script>alert(1)</script>",
          type: "story",
        },
      ];
    },
    getStatus() {
      return {
        cache: { entries: [], maxSize: 100, size: 0 },
        lastStoryError: null,
        lastStorySuccessAt: null,
        ready: false,
        status: "unavailable",
      };
    },
  };
  const server = await listen(createApp({ storyService }));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const cacheStatus = await request(server, "/cache-status");
  assert.equal(cacheStatus.status, 200);

  const ready = await request(server, "/ready");
  assert.equal(ready.status, 503);

  const homepage = await request(server, "/");
  const contentSecurityPolicy = homepage.headers.get("content-security-policy");
  const html = await homepage.text();
  assert.equal(homepage.status, 200);
  assert.doesNotMatch(contentSecurityPolicy, /unsafe-inline/);
  assert.doesNotMatch(html, /<\/script><script>alert/);
  assert.match(html, /&lt;\/script&gt;&lt;script&gt;alert/);

  const invalidId = await request(server, "/comments/9007199254740992");
  assert.equal(invalidId.status, 400);
});

test("returns 404 when a requested story does not exist", async (context) => {
  const storyService = {
    async fetchComments() {
      throw new NotFoundError("missing");
    },
  };
  const server = await listen(createApp({ storyService }));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await request(server, "/comments/1");
  assert.equal(response.status, 404);
});

test("forces stalled connections closed after the shutdown deadline", async () => {
  const exits = [];
  let forced = false;
  const server = {
    close() {},
    closeAllConnections() {
      forced = true;
    },
  };
  const app = {
    listen(port, callback) {
      queueMicrotask(() => callback());
      return server;
    },
  };

  startServer({
    app,
    exit: (code) => exits.push(code),
    logger: { error() {}, log() {} },
    shutdownTimeout: 5,
  });
  process.emit("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(forced, true);
  assert.deepEqual(exits, [1]);
});
