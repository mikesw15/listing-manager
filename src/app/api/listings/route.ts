import { NextResponse } from "next/server";
import { createListing, listListings, savePhoto } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ listings: listListings() });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const notes = String(form.get("notes") || "");
    const files = form.getAll("photos").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one photo is required" },
        { status: 400 }
      );
    }

    const photoFilenames: string[] = [];
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      const name = file.name || "photo.jpg";
      photoFilenames.push(savePhoto(name, buf));
    }

    const listing = createListing({ notes, photoFilenames });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
