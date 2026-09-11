export type RobotsRules = {
  fetchable: boolean;
  status: "allow" | "disallow" | "unknown" | "error";
  crawlDelaySec: number | null;
  sitemaps: string[];
  disallow: string[];
  allow: string[];
};

const UA_TOKENS = ["animalattacks-tracker", "animalattacks", "*"];

export function parseRobotsTxt(body: string, origin: string): RobotsRules {
  const lines = body.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
  const sitemaps: string[] = [];
  type AgentBlock = { agents: string[]; crawlDelay: number | null; allow: string[]; disallow: string[] };
  const blocks: AgentBlock[] = [];
  let current: AgentBlock | null = null;

  const startBlock = () => {
    current = { agents: [], crawlDelay: null, allow: [], disallow: [] };
    blocks.push(current);
  };

  for (const line of lines) {
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "sitemap") {
      try {
        sitemaps.push(new URL(value, origin).toString());
      } catch {
        /* ignore */
      }
      continue;
    }
    if (key === "user-agent") {
      if (!current || current.allow.length || current.disallow.length || current.crawlDelay != null) {
        startBlock();
      }
      current!.agents.push(value.toLowerCase());
      continue;
    }
    if (!current) startBlock();
    if (key === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current!.crawlDelay = n;
    } else if (key === "disallow") {
      current!.disallow.push(value);
    } else if (key === "allow") {
      current!.allow.push(value);
    }
  }

  const applicable =
    blocks.find((b) => b.agents.some((a) => a !== "*" && UA_TOKENS.includes(a))) ??
    blocks.find((b) => b.agents.includes("*")) ??
    null;

  const allow = applicable?.allow ?? [];
  const disallow = applicable?.disallow ?? [];
  const crawlDelaySec = applicable?.crawlDelay ?? null;

  const starDisallowAll = disallow.includes("/") && !allow.some((p) => p === "/" || p === "");
  return {
    fetchable: !starDisallowAll,
    status: starDisallowAll ? "disallow" : "allow",
    crawlDelaySec,
    sitemaps,
    disallow,
    allow,
  };
}

export function robotsAllows(rules: RobotsRules, pathAndQuery: string): boolean {
  if (!rules.fetchable) return false;
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;

  const matches = (pattern: string) => {
    if (!pattern) return false;
    if (pattern === "/") return true;
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    try {
      return new RegExp(`^${escaped}`).test(path);
    } catch {
      return path.startsWith(pattern);
    }
  };

  const allowHit = rules.allow.filter(matches).sort((a, b) => b.length - a.length)[0];
  const disallowHit = rules.disallow.filter(matches).sort((a, b) => b.length - a.length)[0];
  if (allowHit && (!disallowHit || allowHit.length >= disallowHit.length)) return true;
  if (disallowHit) return false;
  return true;
}

export function emptyRobots(status: RobotsRules["status"] = "unknown"): RobotsRules {
  return { fetchable: true, status, crawlDelaySec: null, sitemaps: [], disallow: [], allow: [] };
}
