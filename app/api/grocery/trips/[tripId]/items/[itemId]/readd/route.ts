import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/grocery/trips/[tripId]/items/[itemId]/readd
// Re-adds a history item to the current active list for that store
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tripId, itemId } = await params;

  const tripItem = await prisma.groceryTripItem.findUnique({
    where: { id: parseInt(itemId) },
    include: { trip: { include: { list: true } } },
  });
  if (!tripItem) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tripItem.trip.id !== parseInt(tripId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const storeId = tripItem.trip.list.storeId;

  // Find or create an active list for this store
  let activeList = await prisma.groceryList.findFirst({
    where: { storeId, status: "ACTIVE" },
  });
  if (!activeList) {
    activeList = await prisma.groceryList.create({ data: { storeId } });
  }

  // Resolve area by name if present
  let areaId: number | null = null;
  if (tripItem.areaName) {
    const area = await prisma.groceryArea.findFirst({
      where: { name: tripItem.areaName },
    });
    if (area) areaId = area.id;
  }

  const count = await prisma.groceryListItem.count({ where: { listId: activeList.id } });
  const newItem = await prisma.groceryListItem.create({
    data: {
      listId: activeList.id,
      name: tripItem.name,
      quantity: tripItem.quantity ?? null,
      areaId,
      position: count,
    },
    include: { area: true },
  });

  return NextResponse.json({ item: newItem, storeId }, { status: 201 });
}
