export function normalizeHost(input: string): string | null {
  try {
    const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const url = new URL(withProto);
    let host = url.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    if (!host || !host.includes(".")) return null;
    return host;
  } catch {
    return null;
  }
}

export function normalizeHomepage(input: string): string | null {
  try {
    const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const url = new URL(withProto);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    const path = url.pathname;
    if (path === "/" || path === "") {
      return `${url.protocol}//${url.host}/`.replace("://www.", "://");
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function originOf(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export function sameHost(a: string, b: string): boolean {
  const ha = normalizeHost(a);
  const hb = normalizeHost(b);
  return Boolean(ha && hb && ha === hb);
}

export function canonicalArticleUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|cmpid|ncid)/i.test(key)) u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return url.split("#")[0];
  }
}
