import fs from "fs";
import path from "path";
import type { Listing, PlatformDraft } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const STORE_PATH = path.join(DATA_DIR, "listings.json");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ listings: [] }, null, 2));
  }
}

type StoreShape = { listings: Listing[] };

function readStore(): StoreShape {
  ensureDirs();
  const raw = fs.readFileSync(STORE_PATH, "utf-8");
  try {
    const parsed = JSON.parse(raw) as StoreShape;
    if (!Array.isArray(parsed.listings)) return { listings: [] };
    return parsed;
  } catch {
    return { listings: [] };
  }
}

function writeStore(store: StoreShape) {
  ensureDirs();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function listListings(): Listing[] {
  return readStore().listings.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getListing(id: string): Listing | null {
  return readStore().listings.find((l) => l.id === id) ?? null;
}

export function createListing(input: {
  notes: string;
  photoFilenames: string[];
}): Listing {
  const now = new Date().toISOString();
  const listing: Listing = {
    id: crypto.randomUUID(),
    status: "draft_pending",
    notes: input.notes,
    photos: input.photoFilenames,
    facebook: null,
    vinted: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
  const store = readStore();
  store.listings.push(listing);
  writeStore(store);
  return listing;
}

export function updateListing(
  id: string,
  patch: Partial<
    Pick<
      Listing,
      | "status"
      | "notes"
      | "facebook"
      | "vinted"
      | "error"
      | "publishedAt"
      | "publishUrls"
    >
  >
): Listing | null {
  const store = readStore();
  const idx = store.listings.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  const updated: Listing = {
    ...store.listings[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  store.listings[idx] = updated;
  writeStore(store);
  return updated;
}

export function savePhoto(filename: string, buffer: Buffer): string {
  ensureDirs();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, unique), buffer);
  return unique;
}

export function getPhotoPath(filename: string): string | null {
  const safe = path.basename(filename);
  const full = path.join(UPLOADS_DIR, safe);
  if (!fs.existsSync(full)) return null;
  return full;
}

export function getUploadsDir() {
  ensureDirs();
  return UPLOADS_DIR;
}

export function emptyDraft(): PlatformDraft {
  return {
    title: "",
    description: "",
    category: "",
    price: 0,
    condition: "Good",
    currency: "GBP",
  };
}
