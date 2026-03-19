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
  const { name, category, defaultAmount, payDay, isActive, position } = body;

  const item = await prisma.financeBudgetItem.update({
    where: { id: parseInt(id) },
    data: {
      ...(name != null && { name: name.trim() }),
      ...(category != null && { category }),
      ...(defaultAmount !== undefined && {
        defaultAmount:
          defaultAmount != null && defaultAmount !== ""
            ? parseFloat(defaultAmount)
            : null,
      }),
      ...(payDay !== undefined && {
        payDay: payDay != null && payDay !== "" ? parseInt(payDay) : null,
      }),
      ...(isActive != null && { isActive }),
      ...(position != null && { position: parseInt(position) }),
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.financeBudgetItem.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
