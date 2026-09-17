import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getPhotoPath } from "@/lib/store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ filename: string }> };

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
};

export async function GET(_req: Request, ctx: Ctx) {
  const { filename } = await ctx.params;
  const full = getPhotoPath(filename);
  if (!full) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buf = fs.readFileSync(full);
  const ext = path.extname(full).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";

  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
