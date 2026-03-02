import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/grocery/suggestions?storeId=X
// Distinct item names from past GroceryTripItems for that store, ordered by frequency
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = request.nextUrl.searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const trips = await prisma.groceryTrip.findMany({
    where: { list: { storeId: parseInt(storeId) } },
    include: { items: { select: { name: true } } },
  });

  const freq = new Map<string, number>();
  for (const trip of trips) {
    for (const item of trip.items) {
      const key = item.name.toLowerCase();
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }

  const suggestions = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  return NextResponse.json(suggestions);
}
