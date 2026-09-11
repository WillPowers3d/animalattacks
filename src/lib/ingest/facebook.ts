import type { SeedIncident } from "../types";
import { geocodeIncident, offsetCoord } from "../geo";

export type FacebookPost = {
  id: string;
  message: string;
  permalink: string;
  createdTime: string;
  pageName: string;
};

const MOCK_POSTS: FacebookPost[] = [
  {
    id: "mock_1",
    pageName: "Mock Wildlife Watch",
    createdTime: "2025-09-02T16:12:00Z",
    permalink: "https://www.facebook.com/example/posts/mock_1",
    message:
      "Hiker reports a close call with a cow moose on the Powerline Trail in Anchorage this morning. No injuries. Give moose space — especially with calves.",
  },
  {
    id: "mock_2",
    pageName: "Mock Mountain West Alerts",
    createdTime: "2025-08-18T22:04:00Z",
    permalink: "https://www.facebook.com/example/posts/mock_2",
    message:
      "Video from Estes Park: a bull elk charged a group that walked up for photos during the rut. One person knocked down, minor injuries. 25 yards minimum.",
  },
];

/**
 * Graph API path. Requires FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_IDS
 * (comma-separated page IDs you are allowed to read). Falls back to mock posts.
 */
export async function fetchFacebookPosts(): Promise<FacebookPost[]> {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  const pages = (process.env.FACEBOOK_PAGE_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!token || pages.length === 0) {
    console.log("Facebook: no token/page IDs — using mock posts.");
    return MOCK_POSTS;
  }

  const posts: FacebookPost[] = [];
  for (const pageId of pages) {
    const url = `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,permalink_url,created_time,from&limit=25&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Facebook Graph ${pageId} failed: ${res.status} ${await res.text()}`);
      continue;
    }
    const json = (await res.json()) as {
      data?: {
        id: string;
        message?: string;
        permalink_url?: string;
        created_time?: string;
        from?: { name?: string };
      }[];
    };
    for (const p of json.data ?? []) {
      if (!p.message) continue;
      posts.push({
        id: p.id,
        message: p.message,
        permalink: p.permalink_url ?? `https://www.facebook.com/${p.id}`,
        createdTime: p.created_time ?? new Date().toISOString(),
        pageName: p.from?.name ?? pageId,
      });
    }
  }
  return posts;
}

function inferFacebookLocation(text: string): {
  city: string | null;
  stateProvince: string | null;
  country: "US" | "CA" | "MX";
} {
  const places: [RegExp, string, string, "US" | "CA" | "MX"][] = [
    [/Anchorage/i, "Anchorage", "AK", "US"],
    [/Estes Park/i, "Estes Park", "CO", "US"],
    [/Banff/i, "Banff", "AB", "CA"],
    [/Jasper/i, "Jasper", "AB", "CA"],
    [/Canmore/i, "Canmore", "AB", "CA"],
    [/Yellowstone/i, "Yellowstone", "WY", "US"],
    [/Bozeman/i, "Bozeman", "MT", "US"],
    [/Jackson/i, "Jackson", "WY", "US"],
    [/Fairbanks/i, "Fairbanks", "AK", "US"],
    [/Homer/i, "Homer", "AK", "US"],
    [/Boulder/i, "Boulder", "CO", "US"],
    [/Whistler/i, "Whistler", "BC", "CA"],
  ];
  for (const [re, city, state, country] of places) {
    if (re.test(text)) return { city, stateProvince: state, country };
  }
  if (/\bAlaska\b/i.test(text)) return { city: null, stateProvince: "AK", country: "US" };
  if (/\bMontana\b/i.test(text)) return { city: null, stateProvince: "MT", country: "US" };
  if (/\bColorado\b/i.test(text)) return { city: null, stateProvince: "CO", country: "US" };
  if (/\bWyoming\b/i.test(text)) return { city: null, stateProvince: "WY", country: "US" };
  if (/\bAlberta\b/i.test(text)) return { city: null, stateProvince: "AB", country: "CA" };
  if (/\bBritish Columbia\b/i.test(text)) return { city: null, stateProvince: "BC", country: "CA" };
  return { city: null, stateProvince: null, country: "US" };
}

export function facebookToIncident(post: FacebookPost): SeedIncident | null {
  const text = post.message;
  if (!/(bear|cougar|mountain lion|elk|moose)/i.test(text)) return null;
  const species = /moose/i.test(text)
    ? "moose"
    : /elk/i.test(text)
      ? "elk"
      : /cougar|mountain lion/i.test(text)
        ? "mountain_lion"
        : "bear";
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
    severity: /injur|hospital|gored|trampled/i.test(text) ? "injury" : "near_miss",
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
