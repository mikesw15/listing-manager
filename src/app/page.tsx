import Link from "next/link";
import { Header } from "@/components/Header";
import { ListingCard } from "@/components/ListingCard";
import { listListings } from "@/lib/store";
import { isDemoMode } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const listings = listListings();
  const demo = isDemoMode();

  return (
    <div className="min-h-dvh">
      <Header demo={demo} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Your listings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Upload photos → get drafts for Facebook & Vinted → approve & publish.
            </p>
          </div>
        </div>

        {demo && (
          <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
            <strong>Demo mode:</strong> webhook URLs are not set, so submit returns
            mock drafts. Add <code className="text-xs">N8N_DRAFT_WEBHOOK_URL</code>{" "}
            and <code className="text-xs">N8N_PUBLISH_WEBHOOK_URL</code> in{" "}
            <code className="text-xs">.env.local</code> to wire n8n.
          </div>
        )}

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <div className="text-4xl">🛍️</div>
            <h2 className="mt-3 text-base font-semibold text-slate-900">
              No listings yet
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create your first listing with a few photos of the item.
            </p>
            <Link
              href="/create"
              className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Create listing
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {listings.map((listing) => (
              <li key={listing.id}>
                <ListingCard listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
