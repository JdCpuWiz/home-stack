import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const product = await prisma.pantryProduct.findUnique({ where: { id: parseInt(id) } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { name, brand, size, photoUrl, category, quantity, minQty } = body;

  const updated = await prisma.pantryProduct.update({
    where: { id: parseInt(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(brand !== undefined && { brand: brand || null }),
      ...(size !== undefined && { size: size || null }),
      ...(photoUrl !== undefined && { photoUrl: photoUrl || null }),
      ...(category !== undefined && { category: category || null }),
      ...(quantity !== undefined && { quantity: Math.max(0, quantity) }),
      ...(minQty !== undefined && { minQty: Math.max(0, minQty) }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.pantryProduct.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
