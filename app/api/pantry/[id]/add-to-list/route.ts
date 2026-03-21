import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

// POST /api/pantry/[id]/add-to-list
// Body: { storeId }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { storeId } = body;

  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  const product = await prisma.pantryProduct.findUnique({ where: { id: parseInt(id) } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Find or create active grocery list for this store
  let list = await prisma.groceryList.findFirst({
    where: { storeId: parseInt(storeId), status: "ACTIVE" },
  });
  if (!list) {
    list = await prisma.groceryList.create({
      data: { storeId: parseInt(storeId), status: "ACTIVE" },
    });
  }

  // Check for duplicate (case-insensitive)
  const existing = await prisma.groceryListItem.findFirst({
    where: {
      listId: list.id,
      purchased: false,
      name: { equals: product.name, mode: "insensitive" },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Item already on this list" }, { status: 409 });
  }

  // Resolve pantry category → grocery area (find or create)
  let areaId: number | null = null;
  if (product.category) {
    let area = await prisma.groceryArea.findFirst({
      where: { name: { equals: product.category, mode: "insensitive" } },
    });
    if (!area) {
      area = await prisma.groceryArea.create({ data: { name: product.category } });
    }
    areaId = area.id;
  }

  const maxPos = await prisma.groceryListItem.aggregate({
    where: { listId: list.id },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? -1) + 1;

  const item = await prisma.groceryListItem.create({
    data: {
      listId: list.id,
      name: product.name,
      quantity: product.size || null,
      purchased: false,
      position,
      areaId,
    },
  });
  return NextResponse.json({ item, listId: list.id }, { status: 201 });
}
