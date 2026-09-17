import { NextResponse } from "next/server";
import { getListing, updateListing } from "@/lib/store";
import { requestDraftFromN8n } from "@/lib/webhooks";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Kick off draft generation and return immediately.
 * Vision/Ollama can take minutes; the listing detail page polls
 * while status is `draft_pending` and shows drafts when ready.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const listing = getListing(id);
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pending = updateListing(id, { status: "draft_pending", error: null });

  // Run in the background so the create page can redirect right away.
  // Safe here because listing-manager runs as a long-lived Node server in Docker.
  void (async () => {
    try {
      const result = await requestDraftFromN8n(listing);

      if (result.error && !result.facebook && !result.vinted) {
        updateListing(id, {
          status: "failed",
          error: result.error,
        });
        return;
      }

      if (result.facebook || result.vinted) {
        updateListing(id, {
          status: "ready_for_review",
          facebook: result.facebook,
          vinted: result.vinted,
          error: result.error,
        });
        return;
      }

      // Async webhook callback path — leave as draft_pending
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submit failed";
      updateListing(id, { status: "failed", error: message });
    }
  })();

  return NextResponse.json({
    listing: pending,
    async: true,
  });
}
