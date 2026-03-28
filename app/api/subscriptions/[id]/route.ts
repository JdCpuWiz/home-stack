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
  const { name, cost, frequency, renewalDate, paymentMethod, website, notes, isActive } = body;

  const sub = await prisma.subscription.update({
    where: { id: parseInt(id) },
    data: {
      ...(name != null && { name: name.trim() }),
      ...(cost != null && { cost: parseFloat(cost) }),
      ...(frequency != null && { frequency }),
      ...(renewalDate != null && { renewalDate: new Date(renewalDate) }),
      ...(paymentMethod !== undefined && { paymentMethod: paymentMethod || null }),
      ...(website !== undefined && { website: website || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  return NextResponse.json(sub);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.subscription.delete({ where: { id: parseInt(id) } });
  return new NextResponse(null, { status: 204 });
}
