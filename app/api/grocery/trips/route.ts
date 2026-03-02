import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/grocery/trips — all trips ordered by completedAt desc, with items
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trips = await prisma.groceryTrip.findMany({
    orderBy: { completedAt: "desc" },
    include: { items: true },
  });
  return NextResponse.json(trips);
}
