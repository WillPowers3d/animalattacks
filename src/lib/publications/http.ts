import http from "node:http";
import https from "node:https";

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

const HTTP11_HOST_RE = /(^|\.)(cbc\.ca|radio-canada\.ca)$/i;

const hostNextAllowed = new Map<string, number>();

function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return url;
  }
}

function shouldForceHttp11(url: string, force?: boolean): boolean {
  if (force) return true;
  try {
    return HTTP11_HOST_RE.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Node fetch/undici defaults to HTTP/2; CBC regional RSS stalls on H2 from some runners. */
export function fetchHttp11(
  url: string,
  opts: { timeoutMs?: number; accept?: string; signal?: AbortSignal; redirects?: number } = {},
): Promise<FetchResult> {
  const timeoutMs = opts.timeoutMs ?? 20000;
  const redirects = opts.redirects ?? 0;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: FetchResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      finish({ ok: false, status: 0, url, text: "", contentType: "", error: "bad-url" });
      return;
    }
    const lib = parsed.protocol === "http:" ? http : https;
    const req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        timeout: timeoutMs,
        headers: {
          Host: parsed.host,
          "User-Agent": CRAWLER_UA,
          Accept:
            opts.accept ??
            "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en,fr;q=0.8",
          Connection: "close",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location && redirects < 5) {
          const next = new URL(location, url).toString();
          res.resume();
          void fetchHttp11(next, { ...opts, redirects: redirects + 1 }).then(finish);
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          if (size > 400_000) return;
          chunks.push(chunk);
          size += chunk.length;
        });
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8").slice(0, 400_000);
          finish({
            ok: status >= 200 && status < 300,
            status,
            url,
            text,
            contentType: String(res.headers["content-type"] ?? ""),
          });
        });
        res.on("error", (err) => {
          finish({
            ok: false,
            status,
            url,
            text: "",
            contentType: "",
            error: err.message,
          });
        });
      },
    );
    const onAbort = () => {
      req.destroy();
      finish({ ok: false, status: 0, url, text: "", contentType: "", error: "aborted" });
    };
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    req.on("timeout", () => {
      req.destroy();
      finish({ ok: false, status: 0, url, text: "", contentType: "", error: "http1.1-timeout" });
    });
    req.on("error", (err) => {
      finish({
        ok: false,
        status: 0,
        url,
        text: "",
        contentType: "",
        error: err.message,
      });
    });
    req.end();
  });
}

export async function politeFetch(
  url: string,
  opts: {
    timeoutMs?: number;
    minDelayMs?: number;
    accept?: string;
    signal?: AbortSignal;
    forceHttp11?: boolean;
  } = {},
): Promise<FetchResult> {
  const timeoutMs = opts.timeoutMs ?? 12000;
  const minDelayMs = opts.minDelayMs ?? 1200;
  const host = hostOf(url);
  if (opts.signal?.aborted) {
    return { ok: false, status: 0, url, text: "", contentType: "", error: "aborted" };
  }
  const waitUntil = hostNextAllowed.get(host) ?? 0;
  const now = Date.now();
  if (waitUntil > now) await sleep(waitUntil - now);
  if (opts.signal?.aborted) {
    return { ok: false, status: 0, url, text: "", contentType: "", error: "aborted" };
  }
  hostNextAllowed.set(host, Date.now() + minDelayMs);

  const preferHttp11 = shouldForceHttp11(url, opts.forceHttp11);
  if (preferHttp11) {
    const http11 = await fetchHttp11(url, {
      timeoutMs: Math.max(timeoutMs, 18000),
      accept: opts.accept,
      signal: opts.signal,
    });
    if (http11.ok || (http11.status > 0 && http11.status !== 0)) return http11;
  }

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
    const onParentAbort = () => ctrl.abort();
    opts.signal?.addEventListener("abort", onParentAbort);
    if (opts.signal?.aborted) ctrl.abort();
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
          "Accept-Language": "en-US,en,fr;q=0.8",
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
      const stall = /network|ECONNRESET|ETIMEDOUT|fetch failed|abort|timeout|HTTP2|h2/i.test(
        last.error ?? "",
      );
      if (stall && !opts.signal?.aborted) {
        const fallback = await fetchHttp11(url, {
          timeoutMs: Math.max(timeoutMs, 18000),
          accept: opts.accept,
          signal: opts.signal,
        });
        if (fallback.ok || fallback.status > 0) return fallback;
        last = fallback.error ? fallback : last;
      }
      if (attempt < 2 && !opts.signal?.aborted && stall) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      return last;
    } finally {
      clearTimeout(t);
      opts.signal?.removeEventListener("abort", onParentAbort);
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
