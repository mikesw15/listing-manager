import Link from "next/link";
import type { Listing } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/London",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ListingCard({ listing }: { listing: Listing }) {
  const thumb = listing.photos[0];
  const title =
    listing.facebook?.title ||
    listing.vinted?.title ||
    listing.notes?.slice(0, 60) ||
    "Untitled listing";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photos/${encodeURIComponent(thumb)}`}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-slate-300">
            📦
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <StatusBadge status={listing.status} />
          <span className="text-[11px] text-slate-400">
            {formatWhen(listing.updatedAt)}
          </span>
        </div>
        <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {listing.photos.length} photo{listing.photos.length === 1 ? "" : "s"}
          {listing.facebook?.price != null && listing.status !== "draft_pending"
            ? ` · £${listing.facebook.price}`
            : ""}
        </p>
        {listing.error && (
          <p className="mt-1 line-clamp-1 text-xs text-rose-600">{listing.error}</p>
        )}
      </div>
    </Link>
  );
}
