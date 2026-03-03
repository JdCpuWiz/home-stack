import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, normalize, resolve } from "path";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

const UPLOADS_ROOT = resolve(join(process.cwd(), "public", "uploads"));

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { path } = await params;

  // Prevent path traversal: resolve the full path and ensure it stays within uploads root
  const filePath = resolve(join(UPLOADS_ROOT, ...path.map((p) => normalize(p))));
  if (!filePath.startsWith(UPLOADS_ROOT + "/") && filePath !== UPLOADS_ROOT) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only serve known image extensions
  const ext = path[path.length - 1].split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
