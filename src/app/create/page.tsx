"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PhotoUploader } from "@/components/PhotoUploader";

export default function CreatePage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "drafting">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (files.length === 0) {
      setError("Add at least one photo.");
      return;
    }

    setLoading(true);
    setPhase("uploading");

    try {
      const form = new FormData();
      form.append("notes", notes);
      for (const f of files) form.append("photos", f);

      const createRes = await fetch("/api/listings", {
        method: "POST",
        body: form,
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || "Failed to create listing");
      }

      const listingId = createData.listing.id as string;
      setPhase("drafting");

      const submitRes = await fetch(`/api/listings/${listingId}/submit`, {
        method: "POST",
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok && !submitData.listing) {
        throw new Error(submitData.error || "Failed to generate drafts");
      }

      router.push(`/listings/${listingId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setPhase("idle");
    }
  }

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          ← Back
        </Link>
        <h1 className="mt-3 text-xl font-bold text-slate-900">New listing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload photos and optional notes. We&apos;ll ask n8n for Facebook + Vinted
          drafts.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <PhotoUploader files={files} onChange={setFiles} />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Notes (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Pokémon Charizard holo, near mint, bought 2019…"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {phase === "uploading" ? "Uploading photos…" : "Generating drafts…"}
              </>
            ) : (
              "Submit for drafts"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
