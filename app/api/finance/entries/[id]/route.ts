import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { amount, isPaid, notes } = body;

  const data: Record<string, unknown> = {};
  if (amount !== undefined) data.amount = parseFloat(amount);
  if (isPaid !== undefined) {
    data.isPaid = isPaid;
    data.paidAt = isPaid ? new Date() : null;
  }
  if (notes !== undefined) data.notes = notes?.trim() || null;

  const entry = await prisma.financeBudgetEntry.update({
    where: { id: parseInt(id) },
    data,
  });
  return NextResponse.json(entry);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.financeBudgetEntry.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
