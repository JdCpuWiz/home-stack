import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/grocery/lists/[id]/complete
// Snapshot all items → GroceryTrip + GroceryTripItems, mark list COMPLETED
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listId = parseInt(id);

  const list = await prisma.groceryList.findUnique({
    where: { id: listId },
    include: { store: true, items: { include: { area: true } } },
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const trip = await prisma.groceryTrip.create({
    data: {
      listId,
      storeName: list.store.name,
      items: {
        create: list.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          areaName: item.area?.name ?? null,
          purchased: item.purchased,
        })),
      },
    },
    include: { items: true },
  });

  await prisma.groceryList.update({
    where: { id: listId },
    data: { status: "COMPLETED" },
  });

  return NextResponse.json(trip, { status: 201 });
}
