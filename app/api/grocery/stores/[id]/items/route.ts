import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/grocery/stores/[id]/items
// Adds an item to the active list for this store (with duplicate check).
// Body: { name, quantity?, category? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const storeId = parseInt(id);

  const store = await prisma.groceryStore.findUnique({ where: { id: storeId } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const { name, quantity, category } = await request.json() as {
    name: string;
    quantity?: string | null;
    category?: string | null;
  };
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  // Find or create active list
  let list = await prisma.groceryList.findFirst({
    where: { storeId, status: "ACTIVE" },
  });
  if (!list) {
    list = await prisma.groceryList.create({ data: { storeId } });
  }

  // Duplicate check
  const existing = await prisma.groceryListItem.findFirst({
    where: {
      listId: list.id,
      purchased: false,
      name: { equals: name.trim(), mode: "insensitive" },
    },
  });
  if (existing) return NextResponse.json({ error: "Item already on list" }, { status: 409 });

  const count = await prisma.groceryListItem.count({ where: { listId: list.id } });
  await prisma.groceryListItem.create({
    data: {
      listId: list.id,
      name: name.trim(),
      quantity: quantity?.trim() || null,
      category: category ?? null,
      position: count,
    },
  });

  return NextResponse.json({ storeId }, { status: 201 });
}
