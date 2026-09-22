import { execFile } from "node:child_process";
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
export function fetchViaCurl(
  url: string,
  opts: { timeoutMs?: number; accept?: string; signal?: AbortSignal } = {},
): Promise<FetchResult> {
  const timeoutMs = opts.timeoutMs ?? 15000;
  const maxTime = Math.max(3, Math.ceil(timeoutMs / 1000));
  return new Promise((resolve) => {
    const args = [
      "-sS",
      "--http1.1",
      "-L",
      "--max-time",
      String(maxTime),
      "-A",
      CRAWLER_UA,
      "-H",
      `Accept: ${opts.accept ?? "application/rss+xml,application/xml,text/html,*/*"}`,
      "-H",
      "Accept-Language: en-US,en,fr;q=0.8",
      "-w",
      "\n__CURLMETA__ %{http_code} %{content_type}",
      url,
    ];
    const child = execFile("curl", args, { maxBuffer: 500_000, timeout: timeoutMs + 1000 }, (err, stdout) => {
      const text = String(stdout ?? "");
      const idx = text.lastIndexOf("\n__CURLMETA__ ");
      const body = idx >= 0 ? text.slice(0, idx) : text;
      const meta = idx >= 0 ? text.slice(idx + 14).trim() : "";
      const [codeRaw, ...typeParts] = meta.split(" ");
      const status = Number(codeRaw);
      if (!Number.isFinite(status) || status === 0) {
        resolve({
          ok: false,
          status: 0,
          url,
          text: "",
          contentType: "",
          error: err instanceof Error ? err.message : "curl-failed",
        });
        return;
      }
      resolve({
        ok: status >= 200 && status < 300,
        status,
        url,
        text: body.slice(0, 400_000),
        contentType: typeParts.join(" "),
        error: err instanceof Error && status >= 400 ? err.message : undefined,
      });
    });
    const onAbort = () => child.kill("SIGTERM");
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    child.on("error", (err) => {
      resolve({ ok: false, status: 0, url, text: "", contentType: "", error: err.message });
    });
  });
}

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
        family: 4,
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
          void fetchHttp11(next, { ...opts, redirects: redirects + 1 }).then(done);
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
          done({
            ok: status >= 200 && status < 300,
            status,
            url,
            text,
            contentType: String(res.headers["content-type"] ?? ""),
          });
        });
        res.on("error", (err) => {
          done({
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
    const hardTimeout = setTimeout(() => {
      req.destroy();
      finish({ ok: false, status: 0, url, text: "", contentType: "", error: "http1.1-timeout" });
    }, timeoutMs);
    const done = (result: FetchResult) => {
      clearTimeout(hardTimeout);
      finish(result);
    };
    const onAbort = () => {
      req.destroy();
      done({ ok: false, status: 0, url, text: "", contentType: "", error: "aborted" });
    };
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    req.on("timeout", () => {
      req.destroy();
      done({ ok: false, status: 0, url, text: "", contentType: "", error: "http1.1-timeout" });
    });
    req.on("error", (err) => {
      done({
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
    const viaCurl = await fetchViaCurl(url, {
      timeoutMs: Math.max(timeoutMs, 15000),
      accept: opts.accept,
      signal: opts.signal,
    });
    if (viaCurl.ok || viaCurl.status > 0) return viaCurl;
    return fetchHttp11(url, {
      timeoutMs: Math.min(timeoutMs, 8000),
      accept: opts.accept,
      signal: opts.signal,
    });
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
      let bodyTimer: ReturnType<typeof setTimeout> | undefined;
      const text = await Promise.race([
        res.text().finally(() => {
          if (bodyTimer) clearTimeout(bodyTimer);
        }),
        new Promise<string>((_, reject) => {
          bodyTimer = setTimeout(() => reject(new Error("body-timeout")), timeoutMs);
          const onAbort = () => {
            if (bodyTimer) clearTimeout(bodyTimer);
            reject(new Error("aborted"));
          };
          opts.signal?.addEventListener("abort", onAbort, { once: true });
        }),
      ]);
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
