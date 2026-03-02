import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/grocery/lists/[id]/items — add item
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listId = parseInt(id);
  const { name, quantity, areaId } = await request.json() as {
    name: string;
    quantity?: string;
    areaId?: number | null;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const count = await prisma.groceryListItem.count({ where: { listId } });
  const item = await prisma.groceryListItem.create({
    data: {
      listId,
      name: name.trim(),
      quantity: quantity?.trim() || null,
      areaId: areaId ?? null,
      position: count,
    },
    include: { area: true },
  });
  return NextResponse.json(item, { status: 201 });
}
