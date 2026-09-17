import fs from "fs";
import path from "path";
import type { Listing, PlatformDraft } from "./types";
import { getUploadsDir } from "./store";
import { mockDrafts } from "./mock";

function draftUrl() {
  return process.env.N8N_DRAFT_WEBHOOK_URL?.trim() || "";
}

function publishUrl() {
  return process.env.N8N_PUBLISH_WEBHOOK_URL?.trim() || "";
}

function secret() {
  return process.env.N8N_WEBHOOK_SECRET?.trim() || "";
}

export function isDemoMode() {
  return !draftUrl() || !publishUrl();
}

function authHeaders(): HeadersInit {
  const s = secret();
  return s ? { "X-Webhook-Secret": s } : {};
}

export async function requestDraftFromN8n(listing: Listing): Promise<{
  facebook: PlatformDraft | null;
  vinted: PlatformDraft | null;
  error: string | null;
  demo: boolean;
}> {
  const url = draftUrl();
  if (!url) {
    const drafts = mockDrafts(listing.notes);
    return { ...drafts, error: null, demo: true };
  }

  const form = new FormData();
  form.append("listingId", listing.id);
  form.append("notes", listing.notes || "");

  const uploads = getUploadsDir();
  for (const photo of listing.photos) {
    const filePath = path.join(uploads, path.basename(photo));
    if (!fs.existsSync(filePath)) continue;
    const buf = fs.readFileSync(filePath);
    const blob = new Blob([buf]);
    form.append("photos", blob, path.basename(photo));
  }

  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Draft webhook failed (${res.status}): ${text.slice(0, 300) || res.statusText}`
    );
  }

  // n8n may return drafts synchronously, or respond 200 and callback later
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = (await res.json()) as {
      facebook?: PlatformDraft;
      vinted?: PlatformDraft;
      error?: string | null;
      async?: boolean;
    };
    if (data.async) {
      return { facebook: null, vinted: null, error: null, demo: false };
    }
    if (data.facebook || data.vinted) {
      return {
        facebook: data.facebook ?? null,
        vinted: data.vinted ?? null,
        error: data.error ?? null,
        demo: false,
      };
    }
  }

  // Assume async callback will arrive
  return { facebook: null, vinted: null, error: null, demo: false };
}

export async function requestPublishFromN8n(listing: Listing): Promise<{
  ok: boolean;
  error: string | null;
  demo: boolean;
}> {
  const url = publishUrl();
  if (!url) {
    return { ok: true, error: null, demo: true };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      listingId: listing.id,
      facebook: listing.facebook,
      vinted: listing.vinted,
      photos: listing.photos,
      notes: listing.notes,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      error: `Publish webhook failed (${res.status}): ${text.slice(0, 300) || res.statusText}`,
      demo: false,
    };
  }

  return { ok: true, error: null, demo: false };
}

export function verifyWebhookSecret(req: Request): boolean {
  const expected = secret();
  if (!expected) return true;
  const got = req.headers.get("x-webhook-secret") || "";
  return got === expected;
}
