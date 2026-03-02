import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const { name, quantity, areaId, purchased } = await request.json() as {
    name?: string;
    quantity?: string | null;
    areaId?: number | null;
    purchased?: boolean;
  };

  const item = await prisma.groceryListItem.update({
    where: { id: parseInt(itemId) },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(quantity !== undefined && { quantity: quantity?.trim() || null }),
      ...(areaId !== undefined && { areaId }),
      ...(purchased !== undefined && { purchased }),
    },
    include: { area: true },
  });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  await prisma.groceryListItem.delete({ where: { id: parseInt(itemId) } });
  return NextResponse.json({ ok: true });
}
