import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";

type Params = { params: Promise<{ id: string; photoId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, photoId } = await params;
  const toteId = parseInt(id);
  const photoIdNum = parseInt(photoId);

  const photo = await prisma.totePhoto.findFirst({ where: { id: photoIdNum, toteId } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await unlink(join(process.cwd(), "public", "uploads", "totes", String(toteId), photo.filename));
  } catch {
    // file may already be gone
  }

  await prisma.totePhoto.delete({ where: { id: photoIdNum } });
  return NextResponse.json({ ok: true });
}
