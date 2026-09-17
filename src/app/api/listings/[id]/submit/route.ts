import { NextResponse } from "next/server";
import { getListing, updateListing } from "@/lib/store";
import { requestDraftFromN8n } from "@/lib/webhooks";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const listing = getListing(id);
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    updateListing(id, { status: "draft_pending", error: null });

    const result = await requestDraftFromN8n(listing);

    if (result.error && !result.facebook && !result.vinted) {
      const failed = updateListing(id, {
        status: "failed",
        error: result.error,
      });
      return NextResponse.json({ listing: failed, demo: result.demo });
    }

    if (result.facebook || result.vinted) {
      const ready = updateListing(id, {
        status: "ready_for_review",
        facebook: result.facebook,
        vinted: result.vinted,
        error: result.error,
      });
      return NextResponse.json({ listing: ready, demo: result.demo });
    }

    // Async — stay draft_pending until webhook callback
    const pending = updateListing(id, { status: "draft_pending", error: null });
    return NextResponse.json({
      listing: pending,
      demo: result.demo,
      async: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submit failed";
    const failed = updateListing(id, { status: "failed", error: message });
    return NextResponse.json({ listing: failed, error: message }, { status: 502 });
  }
}
