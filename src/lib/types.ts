export type ListingStatus =
  | "draft_pending"
  | "ready_for_review"
  | "published"
  | "failed";

export type PlatformDraft = {
  title: string;
  description: string;
  category: string;
  price: number;
  condition: string;
  currency?: string;
};

export type Listing = {
  id: string;
  status: ListingStatus;
  notes: string;
  photos: string[];
  facebook: PlatformDraft | null;
  vinted: PlatformDraft | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type DraftResultPayload = {
  listingId: string;
  facebook?: PlatformDraft | null;
  vinted?: PlatformDraft | null;
  error?: string | null;
};
