import Link from "next/link";

export function Header({ demo }: { demo?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm">
            LM
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">Listing Manager</div>
            <div className="text-[11px] text-slate-500">FB Marketplace + Vinted</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {demo && (
            <span className="hidden rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200 sm:inline">
              Demo mode
            </span>
          )}
          <Link
            href="/create"
            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 active:bg-indigo-700"
          >
            New listing
          </Link>
        </div>
      </div>
    </header>
  );
}
