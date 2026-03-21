import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/grocery/lists?storeId=X — returns ACTIVE list with items, or null
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = request.nextUrl.searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const list = await prisma.groceryList.findFirst({
    where: { storeId: parseInt(storeId), status: "ACTIVE" },
    include: {
      items: { orderBy: { position: "asc" } },
    },
  });

  return NextResponse.json(list);
}

// POST /api/grocery/lists — create new ACTIVE list (409 if one already exists)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { storeId } = await request.json() as { storeId: number };
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const existing = await prisma.groceryList.findFirst({
    where: { storeId, status: "ACTIVE" },
  });
  if (existing) return NextResponse.json({ error: "Active list already exists" }, { status: 409 });

  const list = await prisma.groceryList.create({
    data: { storeId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json(list, { status: 201 });
}
