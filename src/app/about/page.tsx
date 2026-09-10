export const metadata = { title: "About & methodology" };

export default function AboutPage() {
  return (
    <article className="prose-invert max-w-3xl space-y-6 text-sm leading-relaxed text-moss-100">
      <header>
        <p className="stamp text-[10px] text-rust-400">Field notes</p>
        <h1 className="font-display text-3xl text-kraft-200">About & methodology</h1>
      </header>

      <section className="border border-rust-500/40 bg-moss-900/50 p-4">
        <h2 className="font-display text-xl text-rust-400">Disclaimer</h2>
        <p className="mt-2">
          This website is an independent public compilation. It is{" "}
          <strong>not official data</strong> from FWS, USGS, Parks Canada, state fish-and-game
          agencies, or any government. Records can be incomplete, duplicated, or wrongly parsed.
          Do not use this site as legal, medical, or wildlife-management advice.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl text-kraft-200">What we track</h2>
        <p className="mt-2">
          Emphasis is North American encounters with <em>bears</em>, <em>mountain lions (cougars)</em>,{" "}
          <em>elk</em>, and <em>moose</em>. Severity is coded fatal / injury / near-miss / property.
          Location is city or region, state or province, and country (US / CA / MX, plus a few
          Weingarten polar-bear cases from Svalbard and elsewhere that appear in the same papers).
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl text-kraft-200">
          Historical core: Dean Weingarten / Ammoland
        </h2>
        <p className="mt-2">
          The starter database is parsed from Dean Weingarten’s long-running public series on
          documented cases where a <strong>handgun was actually fired</strong> in defense against a
          bear. That research is published on Ammoland and earlier on Gun Watch. Weingarten includes
          successes, failures, and combination defenses so readers can judge the raw accounts.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-kraft-300">
          <li>
            <a href="http://gunwatch.blogspot.com/2021/06/using-handguns-or-pistols-in-defense.html">
              June 2021 full list (~104 cases)
            </a>
          </li>
          <li>
            <a href="https://www.ammoland.com/2022/04/update-of-pistol-defenses-against-bears-123-cases-98-effective/">
              April 2022 update (123 handgun-only)
            </a>
          </li>
          <li>
            <a href="https://www.ammoland.com/2023/11/handgun-defenses-against-bears-170-documented-incidents-98-effective/">
              November 2023 update (170 incidents)
            </a>
          </li>
          <li>
            <a href="https://www.ammoland.com/2024/05/bear-defense-with-handguns-update-20-more-cases-98-effective/">
              May 2024 update (~190)
            </a>
          </li>
          <li>
            <a href="https://www.ammoland.com/2025/10/handguns-proven-98-effective-in-205-documented-bear-attacks/">
              October 2025 update (205 documented)
            </a>
          </li>
        </ul>
        <p className="mt-3">
          Those records keep <code>firearmType</code>, <code>caliber</code>, <code>shotsFired</code>,{" "}
          <code>defenseOutcome</code> (success / failure / indeterminate), and{" "}
          <code>combinationDefense</code>, plus source URLs and attribution. Parsing is heuristic:
          we extract what the public articles state; we do not re-investigate scenes.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl text-kraft-200">Daily ingest</h2>
        <p className="mt-2">
          <code>npm run ingest</code> pulls Google News RSS queries for NA attacks, optionally
          enriches with OpenAI if <code>OPENAI_API_KEY</code> is set, and upserts after dedupe by
          URL or title+date+location. Facebook is a pluggable Graph API client: without{" "}
          <code>FACEBOOK_ACCESS_TOKEN</code> and <code>FACEBOOK_PAGE_IDS</code> it loads documented
          mock posts so the path is testable.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl text-kraft-200">How to read firearm stats</h2>
        <p className="mt-2">
          Weingarten’s 98% figure is his, from his inclusion rules — not ours. This site’s caliber
          charts only summarize rows we successfully parsed. Combination cases (handgun plus rifle,
          shotgun, bow, etc.) are flagged and excluded from handgun-only rates, matching his
          published method.
        </p>
      </section>
    </article>
  );
}
