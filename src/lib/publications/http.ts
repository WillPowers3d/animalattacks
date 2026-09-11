export const CRAWLER_UA =
  "animalattacks-tracker/1.0 (+https://github.com/WillPowers3d/animalattacks; research index; RSS/sitemap/snippets only; respects robots.txt)";

export type FetchResult = {
  ok: boolean;
  status: number;
  url: string;
  text: string;
  contentType: string;
  error?: string;
};

const hostNextAllowed = new Map<string, number>();

function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return url;
  }
}

export async function politeFetch(
  url: string,
  opts: { timeoutMs?: number; minDelayMs?: number; accept?: string } = {},
): Promise<FetchResult> {
  const timeoutMs = opts.timeoutMs ?? 12000;
  const minDelayMs = opts.minDelayMs ?? 1200;
  const host = hostOf(url);
  const waitUntil = hostNextAllowed.get(host) ?? 0;
  const now = Date.now();
  if (waitUntil > now) await sleep(waitUntil - now);
  hostNextAllowed.set(host, Date.now() + minDelayMs);

  let last: FetchResult = {
    ok: false,
    status: 0,
    url,
    text: "",
    contentType: "",
    error: "not-attempted",
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          "User-Agent": CRAWLER_UA,
          Accept:
            opts.accept ??
            "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.8",
        },
      });
      const contentType = res.headers.get("content-type") ?? "";
      const text = await res.text();
      last = {
        ok: res.ok,
        status: res.status,
        url: res.url || url,
        text: text.slice(0, 400_000),
        contentType,
      };
      if (res.status === 429 || res.status === 503) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter)
          ? Math.min(30_000, Math.max(2_000, retryAfter * 1000))
          : 4000 * (attempt + 1);
        hostNextAllowed.set(host, Date.now() + waitMs);
        await sleep(waitMs);
        continue;
      }
      return last;
    } catch (err) {
      last = {
        ok: false,
        status: 0,
        url,
        text: "",
        contentType: "",
        error: err instanceof Error ? err.message : String(err),
      };
      if (attempt < 2 && /aborted|network|ECONNRESET|ETIMEDOUT|fetch failed/i.test(last.error ?? "")) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      return last;
    } finally {
      clearTimeout(t);
    }
  }
  return last;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function withBusyRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!/busy|locked|database is locked/i.test(msg)) throw err;
      await sleep(80 * (i + 1));
    }
  }
  throw last;
}

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const idx = i;
      i += 1;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}
