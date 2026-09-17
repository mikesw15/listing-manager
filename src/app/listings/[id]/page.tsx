"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { DraftEditor } from "@/components/DraftEditor";
import type { Listing, PlatformDraft } from "@/lib/types";

function emptyDraft(): PlatformDraft {
  return {
    title: "",
    description: "",
    category: "",
    price: 0,
    condition: "Good",
    currency: "GBP",
  };
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [listing, setListing] = useState<Listing | null>(null);
  const [facebook, setFacebook] = useState<PlatformDraft>(emptyDraft());
  const [vinted, setVinted] = useState<PlatformDraft>(emptyDraft());
  const [tab, setTab] = useState<"facebook" | "vinted">("facebook");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "submit" | "approve" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/listings/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Listing not found");
      setLoading(false);
      return;
    }
    const l = data.listing as Listing;
    setListing(l);
    if (l.facebook) setFacebook(l.facebook);
    if (l.vinted) setVinted(l.vinted);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while draft is pending (async n8n callback)
  useEffect(() => {
    if (!listing || listing.status !== "draft_pending") return;
    const t = setInterval(() => {
      load();
    }, 2500);
    return () => clearInterval(t);
  }, [listing, load]);

  async function saveDrafts() {
    setBusy("save");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facebook, vinted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setListing(data.listing);
      setMessage("Drafts saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function resubmit() {
    setBusy("submit");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/listings/${id}/submit`, { method: "POST" });
      const data = await res.json();
      if (data.listing) {
        setListing(data.listing);
        if (data.listing.facebook) setFacebook(data.listing.facebook);
        if (data.listing.vinted) setVinted(data.listing.vinted);
      }
      if (!res.ok && !data.listing) {
        throw new Error(data.error || "Submit failed");
      }
      setMessage(
        data.demo
          ? "Demo drafts generated."
          : data.async
            ? "Waiting for n8n callback…"
            : "Drafts updated."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setBusy("approve");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/listings/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facebook, vinted }),
      });
      const data = await res.json();
      if (data.listing) setListing(data.listing);
      if (!res.ok) {
        throw new Error(data.error || "Publish failed");
      }
      setMessage(
        data.demo
          ? "Marked published (demo — no publish webhook)."
          : "Published via n8n."
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-500">
          Loading listing…
        </main>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-dvh">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-10">
          <p className="text-sm text-rose-600">{error || "Not found"}</p>
          <Link href="/" className="mt-3 inline-block text-sm text-indigo-600">
            ← Home
          </Link>
        </main>
      </div>
    );
  }

  const canEdit =
    listing.status === "ready_for_review" ||
    listing.status === "failed" ||
    listing.status === "published";
  const canApprove = listing.status === "ready_for_review" && facebook && vinted;

  return (
    <div className="min-h-dvh pb-28">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          ← All listings
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2">
              <StatusBadge status={listing.status} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {facebook.title || vinted.title || "Listing review"}
            </h1>
            <p className="mt-1 text-xs text-slate-500">ID: {listing.id}</p>
          </div>
        </div>

        {listing.status === "draft_pending" && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400/40 border-t-amber-700" />
            Generating drafts… This page refreshes automatically when n8n responds.
          </div>
        )}

        {listing.error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {listing.error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <section className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Photos</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {listing.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p}
                src={`/api/photos/${encodeURIComponent(p)}`}
                alt=""
                className="h-24 w-24 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
              />
            ))}
          </div>
          {listing.notes && (
            <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium">Notes:</span> {listing.notes}
            </p>
          )}
        </section>

        {(listing.status !== "draft_pending" || listing.facebook || listing.vinted) && (
          <>
            {/* Mobile tabs */}
            <div className="mt-6 flex gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setTab("facebook")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                  tab === "facebook"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Facebook
              </button>
              <button
                type="button"
                onClick={() => setTab("vinted")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                  tab === "vinted"
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Vinted
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className={tab === "facebook" ? "block" : "hidden lg:block"}>
                <DraftEditor
                  label="Facebook Marketplace"
                  accent="bg-blue-500"
                  value={facebook}
                  onChange={setFacebook}
                />
              </div>
              <div className={tab === "vinted" ? "block" : "hidden lg:block"}>
                <DraftEditor
                  label="Vinted"
                  accent="bg-teal-500"
                  value={vinted}
                  onChange={setVinted}
                />
              </div>
            </div>
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 py-3">
          {(listing.status === "failed" || listing.status === "draft_pending") && (
            <button
              type="button"
              disabled={!!busy}
              onClick={resubmit}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              {busy === "submit" ? "Submitting…" : "Retry drafts"}
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              disabled={!!busy}
              onClick={saveDrafts}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              {busy === "save" ? "Saving…" : "Save edits"}
            </button>
          )}
          {canApprove && (
            <button
              type="button"
              disabled={!!busy}
              onClick={approve}
              className="ml-auto rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              {busy === "approve" ? "Publishing…" : "Approve & publish"}
            </button>
          )}
          {listing.status === "published" && (
            <span className="ml-auto self-center text-sm font-medium text-emerald-700">
              Published
              {listing.publishedAt
                ? ` · ${new Date(listing.publishedAt).toLocaleString("en-GB")}`
                : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
