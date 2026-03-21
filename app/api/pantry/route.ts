import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.pantryProduct.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { barcode, name, brand, size, photoUrl, category, quantity, minQty } = body;
  if (!barcode || !name) {
    return NextResponse.json({ error: "barcode and name are required" }, { status: 400 });
  }

  const existing = await prisma.pantryProduct.findUnique({ where: { barcode } });
  if (existing) {
    return NextResponse.json({ error: "Product with this barcode already exists" }, { status: 409 });
  }

  const product = await prisma.pantryProduct.create({
    data: {
      barcode,
      name,
      brand: brand || null,
      size: size || null,
      photoUrl: photoUrl || null,
      category: category || null,
      quantity: quantity ?? 0,
      minQty: minQty ?? 1,
    },
  });
  return NextResponse.json(product, { status: 201 });
}
