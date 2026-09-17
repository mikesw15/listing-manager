import type { ListingStatus } from "@/lib/types";

const STYLES: Record<ListingStatus, string> = {
  draft_pending: "bg-amber-100 text-amber-800 ring-amber-200",
  ready_for_review: "bg-sky-100 text-sky-800 ring-sky-200",
  published: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  failed: "bg-rose-100 text-rose-800 ring-rose-200",
};

const LABELS: Record<ListingStatus, string> = {
  draft_pending: "Draft pending",
  ready_for_review: "Ready for review",
  published: "Published",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
