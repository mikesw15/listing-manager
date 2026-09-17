import { NextResponse } from "next/server";
import { getListing, updateListing } from "@/lib/store";
import { verifyWebhookSecret } from "@/lib/webhooks";
import type { DraftResultPayload } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as DraftResultPayload;
    if (!body.listingId) {
      return NextResponse.json({ error: "listingId required" }, { status: 400 });
    }

    const listing = getListing(body.listingId);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (body.error && !body.facebook && !body.vinted) {
      const failed = updateListing(body.listingId, {
        status: "failed",
        error: body.error,
      });
      return NextResponse.json({ listing: failed });
    }

    const updated = updateListing(body.listingId, {
      status: "ready_for_review",
      facebook: body.facebook ?? listing.facebook,
      vinted: body.vinted ?? listing.vinted,
      error: body.error ?? null,
    });

    return NextResponse.json({ listing: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
