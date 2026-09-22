import { lookup } from "node:dns/promises";
import { originOf } from "./domain";

/** DNS / TLS / connect failures that are not worth a 5-minute archive retry. */
export const DEAD_HOST_RE =
  /dead-host|ENOTFOUND|ENODATA|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|CERT_HAS_EXPIRED|UNABLE_TO_VERIFY_LEAF|ERR_TLS_CERT|certificate has expired|getaddrinfo ENOTFOUND|NXDOMAIN|Name or service not known|nodename nor servname/i;

export function isDeadHostError(message?: string | null): boolean {
  if (!message) return false;
  return DEAD_HOST_RE.test(message);
}

export function hostFromHomepage(homepageUrl: string): string | null {
  const origin = originOf(homepageUrl);
  if (!origin) return null;
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

/**
 * Cheap DNS probe so dead weeklies fail in milliseconds instead of hanging
 * the per-publication timeout. Transient DNS (`EAI_AGAIN`) is treated as alive
 * so a later fetch can retry.
 */
export async function probeHost(
  homepageUrl: string,
  timeoutMs = 4000,
): Promise<{ ok: true; host: string } | { ok: false; reason: string; host: string | null }> {
  const host = hostFromHomepage(homepageUrl);
  if (!host) return { ok: false, reason: "dead-host: bad-url", host: null };
  try {
    await Promise.race([
      lookup(host),
      new Promise<never>((_, reject) => {
        const err = Object.assign(new Error("dns-timeout"), { code: "ETIMEOUT" });
        setTimeout(() => reject(err), timeoutMs);
      }),
    ]);
    return { ok: true, host };
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
    const msg = err instanceof Error ? err.message : String(err);
    if (code === "ENOTFOUND" || code === "ENODATA" || isDeadHostError(`${code} ${msg}`)) {
      return { ok: false, reason: `dead-host: ${code || msg}`, host };
    }
    return { ok: true, host };
  }
}
