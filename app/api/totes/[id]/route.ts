import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/totes/[id] — public
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const toteId = parseInt(id);
  if (isNaN(toteId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const tote = await prisma.tote.findUnique({
    where: { id: toteId },
    include: { items: { orderBy: { position: "asc" } } },
  });

  if (!tote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(tote);
}

// PUT /api/totes/[id] — update (protected)
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const toteId = parseInt(id);
  if (isNaN(toteId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const { title, items } = body as { title: string; items: string[] };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Replace items atomically: delete all, recreate
  const [, tote] = await prisma.$transaction([
    prisma.toteItem.deleteMany({ where: { toteId } }),
    prisma.tote.update({
      where: { id: toteId },
      data: {
        title: title.trim(),
        items: {
          create: (items ?? [])
            .filter((d: string) => d.trim())
            .map((description: string, position: number) => ({
              description: description.trim().slice(0, 100),
              position,
            })),
        },
      },
      include: { items: { orderBy: { position: "asc" } } },
    }),
  ]);

  return NextResponse.json(tote);
}

// DELETE /api/totes/[id] — protected
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const toteId = parseInt(id);
  if (isNaN(toteId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await prisma.tote.delete({ where: { id: toteId } });
  return NextResponse.json({ ok: true });
}
