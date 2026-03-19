import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = new Set([
  "BILLS", "SUBSCRIPTIONS", "SHARED_CREDIT",
  "MY_CARDS", "SHARED_CARDS", "LOANS",
]);

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.financeBudgetItem.findMany({
    orderBy: [{ category: "asc" }, { position: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, category, defaultAmount, payDay } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!VALID_CATEGORIES.has(category))
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });

  const count = await prisma.financeBudgetItem.count({ where: { category } });

  const item = await prisma.financeBudgetItem.create({
    data: {
      name: name.trim(),
      category,
      defaultAmount:
        defaultAmount != null && defaultAmount !== ""
          ? parseFloat(defaultAmount)
          : null,
      payDay: payDay ? parseInt(payDay) : null,
      position: count,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
