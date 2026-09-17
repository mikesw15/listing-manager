import fs from "fs";
import path from "path";
import type { Listing, PlatformDraft } from "./types";
import { getUploadsDir } from "./store";
import { mockDrafts } from "./mock";

function draftUrl() {
  return process.env.N8N_DRAFT_WEBHOOK_URL?.trim() || "";
}

/** Prefer direct Playwright worker; fall back to legacy n8n publish webhook. */
function publishUrl() {
  return (
    process.env.PUBLISH_WORKER_URL?.trim() ||
    process.env.N8N_PUBLISH_WEBHOOK_URL?.trim() ||
    ""
  );
}

function photoBaseUrl() {
  return (
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.PHOTO_BASE_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
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

function resolvePhotoUrls(listing: Listing): string[] {
  const base = photoBaseUrl();
  return listing.photos.map((p) => {
    if (/^https?:\/\//i.test(p)) return p;
    if (base) return `${base}/api/photos/${encodeURIComponent(path.basename(p))}`;
    return p;
  });
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

  const uploads = getUploadsDir();
  const photoBlobs: { name: string; blob: Blob }[] = [];
  for (const photo of listing.photos) {
    const filePath = path.join(uploads, path.basename(photo));
    if (!fs.existsSync(filePath)) continue;
    photoBlobs.push({ name: path.basename(photo), blob: new Blob([fs.readFileSync(filePath)]) });
  }

  function buildDraftForm() {
    const form = new FormData();
    form.append("listingId", listing.id);
    form.append("notes", listing.notes || "");
    for (const p of photoBlobs) form.append("photos", p.blob, p.name);
    return form;
  }

  // Vision + Ollama can take a while; bound wait so UI never hangs forever.
  const DRAFT_TIMEOUT_MS = Number(process.env.DRAFT_WEBHOOK_TIMEOUT_MS || 180_000);
  let res: Response | null = null;
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), DRAFT_TIMEOUT_MS);
    try {
      res = await fetch(url, {
        method: "POST",
        headers: authHeaders(),
        body: buildDraftForm(),
        signal: ac.signal,
      });
      if (res.status !== 429) break;
      const waitMs = attempt * 5000;
      console.warn(`Draft engine busy (429), retry ${attempt}/4 in ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));
      res = null;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const aborted = lastErr.name === "AbortError";
      throw new Error(
        aborted
          ? `Draft webhook timed out after ${DRAFT_TIMEOUT_MS}ms`
          : lastErr.message
      );
    } finally {
      clearTimeout(timer);
    }
  }
  if (!res) {
    throw lastErr || new Error("Draft webhook failed after retries");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Draft webhook failed (${res.status}): ${text.slice(0, 300) || res.statusText}`
    );
  }

  // n8n / vision may return drafts synchronously, or respond 200 and callback later
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

export type PublishResult = {
  ok: boolean;
  error: string | null;
  demo: boolean;
  code?: string | null;
  urls?: { facebook?: string | null; vinted?: string | null };
  details?: unknown;
};

export async function requestPublishFromN8n(listing: Listing): Promise<PublishResult> {
  const url = publishUrl();
  if (!url) {
    return { ok: true, error: null, demo: true };
  }

  const usingWorker = Boolean(process.env.PUBLISH_WORKER_URL?.trim());
  const photoUrls = resolvePhotoUrls(listing);

  const payload = usingWorker
    ? {
        listingId: listing.id,
        id: listing.id,
        platforms: ["facebook", "vinted"],
        photos: photoUrls,
        facebook: listing.facebook,
        vinted: listing.vinted,
        notes: listing.notes,
        postcode: process.env.SELLER_POSTCODE?.trim() || "DA3 7PS",
      }
    : {
        listingId: listing.id,
        facebook: listing.facebook,
        vinted: listing.vinted,
        photos: listing.photos,
        notes: listing.notes,
      };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");
  type PublishResponse = {
    ok?: boolean;
    code?: string;
    error?: string;
    results?: { facebook?: { url?: string }; vinted?: { url?: string } };
    errors?: Record<string, { code?: string; error?: string }>;
  };
  let data: PublishResponse | null = null;
  try {
    data = text ? (JSON.parse(text) as PublishResponse) : null;
  } catch {
    data = null;
  }

  if (!res.ok && res.status !== 207) {
    const code = data?.code || data?.errors?.facebook?.code || data?.errors?.vinted?.code;
    const errMsg =
      data?.error ||
      data?.errors?.facebook?.error ||
      data?.errors?.vinted?.error ||
      text.slice(0, 300) ||
      res.statusText;
    return {
      ok: false,
      error: `Publish failed (${res.status}${code ? `/${code}` : ""}): ${errMsg}`,
      demo: false,
      code: code || null,
      details: data,
    };
  }

  const urls = {
    facebook: data?.results?.facebook?.url ?? null,
    vinted: data?.results?.vinted?.url ?? null,
  };

  // 207 multi-status / code partial from worker
  if (res.status === 207 || data?.code === "partial" || data?.ok === false) {
    const errParts = [
      data?.errors?.facebook?.error,
      data?.errors?.vinted?.error,
      data?.error,
    ].filter(Boolean);
    return {
      ok: false,
      error: errParts.join("; ") || "Partial publish failure",
      demo: false,
      code: data?.code || "partial",
      urls,
      details: data,
    };
  }

  return {
    ok: true,
    error: null,
    demo: false,
    code: data?.code || "ok",
    urls,
    details: data,
  };
}

export function verifyWebhookSecret(req: Request): boolean {
  const expected = secret();
  if (!expected) return true;
  const got = req.headers.get("x-webhook-secret") || "";
  return got === expected;
}
