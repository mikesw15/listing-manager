import { NextResponse } from "next/server";
import { getListing, updateListing } from "@/lib/store";
import { requestPublishFromN8n } from "@/lib/webhooks";
import type { PlatformDraft } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let listing = getListing(id);
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      facebook?: PlatformDraft;
      vinted?: PlatformDraft;
    };

    if (body.facebook || body.vinted) {
      listing =
        updateListing(id, {
          facebook: body.facebook ?? listing.facebook,
          vinted: body.vinted ?? listing.vinted,
        }) ?? listing;
    }

    if (!listing.facebook || !listing.vinted) {
      return NextResponse.json(
        { error: "Both Facebook and Vinted drafts are required before publish" },
        { status: 400 }
      );
    }

    const result = await requestPublishFromN8n(listing);

    if (!result.ok) {
      const failed = updateListing(id, {
        status: "failed",
        error: result.error,
        publishUrls: result.urls ?? listing.publishUrls ?? null,
      });
      return NextResponse.json(
        {
          listing: failed,
          demo: result.demo,
          error: result.error,
          code: result.code ?? null,
          urls: result.urls ?? null,
        },
        { status: 502 }
      );
    }

    const published = updateListing(id, {
      status: "published",
      error: null,
      publishedAt: new Date().toISOString(),
      publishUrls: result.urls ?? null,
    });

    return NextResponse.json({
      listing: published,
      demo: result.demo,
      urls: result.urls ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Approve failed";
    const failed = updateListing(id, { status: "failed", error: message });
    return NextResponse.json({ listing: failed, error: message }, { status: 500 });
  }
}
