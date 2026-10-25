"use client";

import { useState } from "react";
import type { IncidentQuery } from "@/lib/filters";
import { toQueryString } from "@/lib/filters";

export function FilterActions({ query }: { query: IncidentQuery }) {
  const [copied, setCopied] = useState(false);
  const qs = toQueryString(query);
  const csvHref = `/api/incidents/export${qs ? `?${qs}` : ""}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={csvHref}
        className="border border-kraft-500/50 px-4 py-2 font-mono text-xs uppercase tracking-widest text-kraft-200 hover:bg-moss-700"
      >
        Export CSV
      </a>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="border border-moss-500 px-4 py-2 font-mono text-xs uppercase tracking-widest text-moss-200 hover:bg-moss-700"
      >
        {copied ? "Link copied" : "Copy view link"}
      </button>
    </div>
  );
}
