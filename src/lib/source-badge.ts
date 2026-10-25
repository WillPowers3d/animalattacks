export type SourceBadgeKind = "weingarten" | "local" | "agency" | "google" | "facebook" | "other";

export type SourceBadge = {
  kind: SourceBadgeKind;
  label: string;
  className: string;
};

const BADGE_CLASS: Record<SourceBadgeKind, string> = {
  weingarten: "border-ochre/70 bg-ochre/10 text-ochre",
  local: "border-kraft-400/70 bg-kraft-500/10 text-kraft-200",
  agency: "border-moss-300/70 bg-moss-700/40 text-moss-100",
  google: "border-sky-400/60 bg-sky-900/30 text-sky-200",
  facebook: "border-blue-400/50 bg-blue-900/30 text-blue-200",
  other: "border-moss-500/50 text-moss-300",
};

const LABELS: Record<SourceBadgeKind, string> = {
  weingarten: "Weingarten",
  local: "Local paper",
  agency: "Agency",
  google: "Google News",
  facebook: "Facebook",
  other: "Other",
};

export function sourceBadgeKind(input: {
  sourceType?: string | null;
  publicationId?: string | null;
  publisher?: string | null;
}): SourceBadgeKind {
  const type = (input.sourceType ?? "").toLowerCase();
  if (type === "ammoland") return "weingarten";
  if (type === "agency") return "agency";
  if (type === "facebook") return "facebook";
  if (type === "news" && input.publicationId) return "local";
  if (type === "news") return "google";
  if (input.publicationId) return "local";
  return "other";
}

export function sourceBadge(input: {
  sourceType?: string | null;
  publicationId?: string | null;
  publisher?: string | null;
}): SourceBadge {
  const kind = sourceBadgeKind(input);
  return { kind, label: LABELS[kind], className: BADGE_CLASS[kind] };
}
