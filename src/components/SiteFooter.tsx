import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-kraft-500/20 bg-moss-950">
      <div className="mx-auto max-w-7xl px-4 py-8 text-xs leading-relaxed text-moss-300">
        <p className="stamp mb-2 text-[10px] text-rust-400">Disclaimer</p>
        <p>
          This is a public compilation of news reports, social posts, and historical research —{" "}
          <strong className="text-kraft-300">not official wildlife-agency data</strong>. Historical
          handgun-defense cases are attributed to{" "}
          <Link
            href="https://www.ammoland.com/2025/10/handguns-proven-98-effective-in-205-documented-bear-attacks/"
            className="text-kraft-400 underline decoration-kraft-500/40 hover:text-kraft-200"
          >
            Dean Weingarten / Ammoland
          </Link>
          . Always verify with state, provincial, or federal sources before acting on any record.
        </p>
      </div>
    </footer>
  );
}
