import Link from "next/link";

export default function NotFound() {
  return (
    <div className="border border-kraft-500/25 bg-moss-900/50 p-8 text-center">
      <p className="stamp text-[10px] text-rust-400">No such dossier</p>
      <h1 className="mt-2 font-display text-3xl text-kraft-200">Incident not found</h1>
      <Link href="/" className="mt-4 inline-block text-sm text-kraft-400 underline">
        Return to the field map
      </Link>
    </div>
  );
}
