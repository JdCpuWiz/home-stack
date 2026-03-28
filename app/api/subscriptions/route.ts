import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subs = await prisma.subscription.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(subs);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, cost, frequency, renewalDate, paymentMethod, website, notes } = body;

  if (!name?.trim() || cost == null || !frequency || !renewalDate)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const sub = await prisma.subscription.create({
    data: {
      name: name.trim(),
      cost: parseFloat(cost),
      frequency,
      renewalDate: new Date(renewalDate),
      paymentMethod: paymentMethod || null,
      website: website || null,
      notes: notes || null,
    },
  });
  return NextResponse.json(sub, { status: 201 });
}
