import {
  MOCK_POSTS,
  createFacebookFetcher,
  facebookPostLooksLikeAttack,
  facebookToIncident,
  fetchGraphPosts,
  parseFacebookPageIds,
  resolveFacebookConfig,
} from "../src/lib/ingest/facebook";

let failed = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL ${msg}`);
  } else {
    console.log(`ok  ${msg}`);
  }
}

assert(parseFacebookPageIds("123, 456 789").join(",") === "123,456,789", "parse comma/space page IDs");
assert(parseFacebookPageIds(["YellowstoneNPS", ""]).join(",") === "YellowstoneNPS", "parse array page IDs");

const mockCfg = resolveFacebookConfig({});
assert(!mockCfg.token && mockCfg.pageIds.length === 0, "empty env → no live creds");
assert(mockCfg.graphVersion === "v19.0", "default Graph version v19.0");

const liveCfg = resolveFacebookConfig({
  FACEBOOK_ACCESS_TOKEN: "token",
  FACEBOOK_PAGE_IDS: "111,222",
  FACEBOOK_GRAPH_VERSION: "v21.0",
  FACEBOOK_POST_LIMIT: "10",
});
assert(liveCfg.token === "token" && liveCfg.pageIds.length === 2, "env token + page IDs");
assert(liveCfg.graphVersion === "v21.0" && liveCfg.postLimit === 10, "env version + limit");

async function main() {
const mockFetcher = createFacebookFetcher();
assert(mockFetcher.mode === "mock", "missing creds → mock fetcher");
const mockPosts = await mockFetcher.fetchPosts();
assert(mockPosts.length === MOCK_POSTS.length, "mock fetcher returns labeled stubs");

const moose = facebookToIncident(MOCK_POSTS[0]);
const elk = facebookToIncident(MOCK_POSTS[1]);
const sports = facebookToIncident(MOCK_POSTS[2]);
assert(moose?.species === "moose" && moose.sourceType === "facebook", "mock moose → incident");
assert(elk?.species === "elk" && elk.severity === "injury", "mock elk charge → injury");
assert(sports === null, "sports mock is filtered");
assert(facebookPostLooksLikeAttack(MOCK_POSTS[0].message), "keyword filter accepts moose close call");
assert(!facebookPostLooksLikeAttack(MOCK_POSTS[2].message), "keyword filter rejects Bears football");

const captured: string[] = [];
const fakeFetch: typeof fetch = (async (input: RequestInfo | URL) => {
  captured.push(String(input));
  return new Response(
    JSON.stringify({
      data: [
        {
          id: "p1",
          message: "Black bear attacks camper near Bozeman this morning. One injury.",
          permalink_url: "https://www.facebook.com/example/posts/p1",
          created_time: "2026-09-01T12:00:00Z",
          from: { name: "Montana FWP" },
        },
        {
          id: "p2",
          message: "Chicago Bears attack the Packers tonight. Tickets still available.",
          permalink_url: "https://www.facebook.com/example/posts/p2",
          created_time: "2026-09-01T13:00:00Z",
          from: { name: "Montana FWP" },
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}) as typeof fetch;

const live = createFacebookFetcher({
  token: "test-token",
  pageIds: "999",
  fetchImpl: fakeFetch,
  postLimit: 10,
});
assert(live.mode === "live", "token + page IDs → live fetcher");
const livePosts = await live.fetchPosts();
assert(livePosts.length === 2, "Graph fixture returned both posts");
assert(livePosts[0].pageName === "Montana FWP", "page name from Graph `from`");
assert(captured[0].includes("graph.facebook.com/v19.0/999/posts"), "Graph URL uses page id + v19");
assert(captured[0].includes("access_token=test-token"), "token is query-param (Page token)");

const bear = facebookToIncident(livePosts[0]);
assert(bear?.species === "bear" && bear.severity === "injury", "Graph bear attack upserts");
assert(facebookToIncident(livePosts[1]) === null, "Graph sports post filtered before upsert");

const pagedFetch: typeof fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes("after=cursor")) {
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  }
  return new Response(
    JSON.stringify({
      data: [
        {
          id: "p3",
          message: "Cougar attacked a jogger outside Missoula. Conservation officers responding.",
          created_time: "2026-08-20T09:00:00Z",
          from: { name: "FWP" },
        },
      ],
      paging: { next: "https://graph.facebook.com/v19.0/999/posts?after=cursor&access_token=x" },
    }),
    { status: 200 },
  );
}) as typeof fetch;

const paged = await fetchGraphPosts({
  token: "x",
  pageIds: ["999"],
  fetchImpl: pagedFetch,
  postLimit: 5,
});
assert(paged.length === 1 && /cougar/i.test(paged[0].message), "follows paging.next once");

if (failed) {
  console.error(`${failed} Facebook tests failed`);
  process.exit(1);
}
console.log("All Facebook Graph / mock tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
