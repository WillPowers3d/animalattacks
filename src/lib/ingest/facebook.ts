import type { SeedIncident } from "../types";
import { geocodeIncident, offsetCoord } from "../geo";
import { inferLandmarkPlace } from "../publications/landmarks";
import { matchAnimalAttack } from "../publications/match";

export type FacebookPost = {
  id: string;
  message: string;
  permalink: string;
  createdTime: string;
  pageName: string;
};

export type FacebookFetcherMode = "live" | "mock";

export type FacebookFetcher = {
  mode: FacebookFetcherMode;
  fetchPosts(): Promise<FacebookPost[]>;
};

export type FacebookFetcherOptions = {
  token?: string | null;
  pageIds?: string[] | string | null;
  graphVersion?: string;
  postLimit?: number;
  fetchImpl?: typeof fetch;
  mockPosts?: FacebookPost[];
};

/** Public wildlife / park pages that post conflict reports. Numeric IDs go in FACEBOOK_PAGE_IDS. */
export const SUGGESTED_WILDLIFE_FACEBOOK_PAGES = [
  { name: "Alaska Department of Fish and Game", slug: "alaskadfg" },
  { name: "Colorado Parks and Wildlife", slug: "ColoradoParksandWildlife" },
  { name: "Montana Fish, Wildlife & Parks", slug: "MTFWP" },
  { name: "Wyoming Game and Fish Department", slug: "WyomingGameandFish" },
  { name: "Idaho Fish and Game", slug: "idahofishandgame" },
  { name: "Yellowstone National Park", slug: "YellowstoneNPS" },
  { name: "Glacier National Park", slug: "GlacierNPS" },
  { name: "Rocky Mountain National Park", slug: "RockyNPS" },
  { name: "Parks Canada", slug: "ParksCanada" },
  { name: "BC Parks", slug: "BCParks" },
] as const;

export const MOCK_POSTS: FacebookPost[] = [
  {
    id: "mock_1",
    pageName: "Mock Wildlife Watch",
    createdTime: "2025-09-02T16:12:00Z",
    permalink: "https://www.facebook.com/example/posts/mock_1",
    message:
      "Hiker reports a cow moose charged on the Powerline Trail in Anchorage this morning. Close call, no injuries. Give moose space — especially with calves.",
  },
  {
    id: "mock_2",
    pageName: "Mock Mountain West Alerts",
    createdTime: "2025-08-18T22:04:00Z",
    permalink: "https://www.facebook.com/example/posts/mock_2",
    message:
      "Video from Estes Park: a bull elk charged a group that walked up for photos during the rut. One person knocked down, minor injuries. 25 yards minimum.",
  },
  {
    id: "mock_skip_sports",
    pageName: "Mock Sports Desk",
    createdTime: "2025-09-01T18:00:00Z",
    permalink: "https://www.facebook.com/example/posts/mock_skip_sports",
    message: "Chicago Bears attack the Packers' secondary in a Thursday night blowout. No wildlife involved.",
  },
];

export function parseFacebookPageIds(raw?: string | string[] | null): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : raw.split(/[,\s]+/);
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}

export function resolveFacebookConfig(env: Record<string, string | undefined> = process.env): {
  token: string | null;
  pageIds: string[];
  graphVersion: string;
  postLimit: number;
} {
  const limitRaw = Number(env.FACEBOOK_POST_LIMIT ?? 50);
  return {
    token: env.FACEBOOK_ACCESS_TOKEN?.trim() || null,
    pageIds: parseFacebookPageIds(env.FACEBOOK_PAGE_IDS),
    graphVersion: env.FACEBOOK_GRAPH_VERSION?.trim() || "v19.0",
    postLimit: Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, limitRaw)) : 50,
  };
}

type GraphPost = {
  id: string;
  message?: string;
  permalink_url?: string;
  created_time?: string;
  from?: { name?: string };
};

type GraphPage = {
  data?: GraphPost[];
  paging?: { next?: string };
  error?: { message?: string; type?: string; code?: number };
};

async function fetchGraphPage(
  url: string,
  fetchImpl: typeof fetch,
): Promise<GraphPage> {
  const res = await fetchImpl(url);
  const json = (await res.json().catch(() => ({}))) as GraphPage;
  if (!res.ok) {
    const detail = json.error?.message ?? "";
    throw new Error(`Facebook Graph ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  if (json.error?.message) {
    throw new Error(`Facebook Graph: ${json.error.message}`);
  }
  return json;
}

export async function fetchGraphPosts(opts: {
  token: string;
  pageIds: string[];
  graphVersion?: string;
  postLimit?: number;
  fetchImpl?: typeof fetch;
}): Promise<FacebookPost[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const version = opts.graphVersion ?? "v19.0";
  const cap = opts.postLimit ?? 50;
  const posts: FacebookPost[] = [];

  for (const pageId of opts.pageIds) {
    let url =
      `https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}/posts` +
      `?fields=id,message,permalink_url,created_time,from&limit=${Math.min(25, cap)}` +
      `&access_token=${encodeURIComponent(opts.token)}`;
    let remaining = cap;
    try {
      while (url && remaining > 0) {
        const json = await fetchGraphPage(url, fetchImpl);
        for (const p of json.data ?? []) {
          if (!p.message?.trim()) continue;
          posts.push({
            id: p.id,
            message: p.message,
            permalink: p.permalink_url ?? `https://www.facebook.com/${p.id}`,
            createdTime: p.created_time ?? new Date().toISOString(),
            pageName: p.from?.name ?? pageId,
          });
          remaining -= 1;
          if (remaining <= 0) break;
        }
        url = remaining > 0 ? json.paging?.next ?? "" : "";
      }
    } catch (err) {
      console.warn(`Facebook Graph ${pageId} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return posts;
}

/**
 * Pluggable fetcher. Live Graph when FACEBOOK_ACCESS_TOKEN + FACEBOOK_PAGE_IDS
 * are set (or passed in); otherwise labeled mock posts so the pipeline stays testable.
 */
export function createFacebookFetcher(opts: FacebookFetcherOptions = {}): FacebookFetcher {
  const env = resolveFacebookConfig();
  const token = opts.token !== undefined ? opts.token : env.token;
  const pageIds =
    opts.pageIds !== undefined ? parseFacebookPageIds(opts.pageIds) : env.pageIds;
  const graphVersion = opts.graphVersion ?? env.graphVersion;
  const postLimit = opts.postLimit ?? env.postLimit;
  const mockPosts = opts.mockPosts ?? MOCK_POSTS;

  if (!token || pageIds.length === 0) {
    return {
      mode: "mock",
      fetchPosts: async () => mockPosts,
    };
  }

  return {
    mode: "live",
    fetchPosts: () =>
      fetchGraphPosts({
        token,
        pageIds,
        graphVersion,
        postLimit,
        fetchImpl: opts.fetchImpl ?? fetch,
      }),
  };
}

export async function fetchFacebookPosts(opts: FacebookFetcherOptions = {}): Promise<FacebookPost[]> {
  const fetcher = createFacebookFetcher(opts);
  if (fetcher.mode === "mock") {
    console.log("Facebook: no token/page IDs — using mock posts.");
  }
  return fetcher.fetchPosts();
}

function inferFacebookLocation(text: string): {
  city: string | null;
  stateProvince: string | null;
  country: "US" | "CA" | "MX";
} {
  const landmark = inferLandmarkPlace(text);
  if (landmark) return landmark;
  if (/\bBoulder\b/i.test(text)) return { city: "Boulder", stateProvince: "CO", country: "US" };
  if (/\bJackson\b/i.test(text)) return { city: "Jackson", stateProvince: "WY", country: "US" };
  if (/\bChihuahua\b/i.test(text)) return { city: "Chihuahua", stateProvince: "CHH", country: "MX" };
  if (/\bMonterrey\b/i.test(text)) return { city: "Monterrey", stateProvince: "NLE", country: "MX" };
  if (/\bAlaska\b/i.test(text)) return { city: null, stateProvince: "AK", country: "US" };
  if (/\bMontana\b/i.test(text)) return { city: null, stateProvince: "MT", country: "US" };
  if (/\bColorado\b/i.test(text)) return { city: null, stateProvince: "CO", country: "US" };
  if (/\bWyoming\b/i.test(text)) return { city: null, stateProvince: "WY", country: "US" };
  if (/\bIdaho\b/i.test(text)) return { city: null, stateProvince: "ID", country: "US" };
  if (/\bAlberta\b/i.test(text)) return { city: null, stateProvince: "AB", country: "CA" };
  if (/\bBritish Columbia\b/i.test(text)) return { city: null, stateProvince: "BC", country: "CA" };
  if (/\bMéxico|Mexico\b/i.test(text)) return { city: null, stateProvince: null, country: "MX" };
  return { city: null, stateProvince: null, country: "US" };
}

/** Same animal+attack matcher as the newspaper crawler (sports / ads rejected). */
export function facebookPostLooksLikeAttack(text: string): boolean {
  return matchAnimalAttack(text, "").matched;
}

export function facebookToIncident(post: FacebookPost): SeedIncident | null {
  const text = post.message;
  const hit = matchAnimalAttack(text, "");
  if (!hit.matched) return null;
  const species = hit.species === "other" ? "bear" : hit.species;
  const loc = inferFacebookLocation(text);
  const geo = offsetCoord(geocodeIncident(loc), post.id);
  return {
    title: text.slice(0, 120),
    species,
    occurredAt: post.createdTime.slice(0, 10),
    datePrecision: "exact",
    dateDisplay: post.createdTime.slice(0, 10),
    city: loc.city,
    stateProvince: loc.stateProvince,
    country: loc.country,
    lat: geo.lat,
    lng: geo.lng,
    severity: /fatal|killed|died|muerte|muere|muerto/i.test(text)
      ? "fatal"
      : /injur|hospital|gored|trampled|bitten|mauled|herid/i.test(text)
        ? "injury"
        : "near_miss",
    summary: text.slice(0, 900),
    sourceType: "facebook",
    verified: false,
    firearmType: null,
    attribution: `Facebook page post (${post.pageName}). Unverified social report.`,
    sources: [
      {
        url: post.permalink,
        title: post.pageName,
        publisher: "Facebook",
      },
    ],
  };
}
