import { NextResponse } from "next/server";
import { deleteListing, getListing, updateListing } from "@/lib/store";
import type { PlatformDraft } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const listing = getListing(id);
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ listing });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const listing = getListing(id);
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as {
      facebook?: PlatformDraft;
      vinted?: PlatformDraft;
      notes?: string;
    };

    const updated = updateListing(id, {
      facebook: body.facebook ?? listing.facebook,
      vinted: body.vinted ?? listing.vinted,
      notes: body.notes ?? listing.notes,
    });

    return NextResponse.json({ listing: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const removed = deleteListing(id);
    if (!removed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      deletedId: removed.id,
      message: "Listing deleted from Listing Manager (not from Facebook or Vinted).",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
