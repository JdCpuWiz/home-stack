import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/totes — list all totes (protected)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const totes = await prisma.tote.findMany({
    include: { items: { orderBy: { position: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(totes);
}

// POST /api/totes — create tote (protected)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, items } = body as { title: string; items: string[] };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const tote = await prisma.tote.create({
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
  });

  return NextResponse.json(tote, { status: 201 });
}
