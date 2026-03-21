import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

// POST /api/pantry/scan
// Body: { barcode, delta, productData? }
// delta: positive = scan in, negative = scan out
// productData: required only when creating a new product
export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { barcode, delta, productData } = body;

  if (!barcode || typeof delta !== "number") {
    return NextResponse.json({ error: "barcode and delta are required" }, { status: 400 });
  }

  let product = await prisma.pantryProduct.findUnique({ where: { barcode } });

  if (!product) {
    if (!productData?.name) {
      return NextResponse.json({ error: "Product not found; provide productData to create it" }, { status: 404 });
    }
    product = await prisma.pantryProduct.create({
      data: {
        barcode,
        name: productData.name,
        brand: productData.brand || null,
        size: productData.size || null,
        photoUrl: productData.photoUrl || null,
        category: productData.category || null,
        quantity: Math.max(0, delta),
        minQty: productData.minQty ?? 1,
      },
    });
    return NextResponse.json(product);
  }

  const newQty = Math.max(0, product.quantity + delta);
  const updated = await prisma.pantryProduct.update({
    where: { id: product.id },
    data: { quantity: newQty },
  });
  return NextResponse.json(updated);
}
