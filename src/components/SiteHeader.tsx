import Link from "next/link";

const links = [
  { href: "/", label: "Field map" },
  { href: "/stats", label: "Stats" },
  { href: "/search", label: "Search" },
  { href: "/about", label: "Methodology" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-kraft-500/30 bg-moss-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="group">
          <p className="stamp text-[10px] text-kraft-400">North America · Field report</p>
          <h1 className="font-display text-2xl tracking-tight text-kraft-200 group-hover:text-white sm:text-3xl">
            Animal Attack Tracker
          </h1>
          <p className="text-xs text-moss-300">
            Bears · mountain lions · elk · moose — news, social, historical defenses
          </p>
        </Link>
        <nav className="flex flex-wrap gap-2 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="border border-kraft-500/40 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-kraft-300 hover:border-kraft-400 hover:bg-moss-700 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
