import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const categories = await prisma.pantryCategory.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, icon } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const existing = await prisma.pantryCategory.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }
  const max = await prisma.pantryCategory.aggregate({ _max: { position: true } });
  const category = await prisma.pantryCategory.create({
    data: { name: name.trim(), icon: icon || "Package", position: (max._max.position ?? -1) + 1 },
  });
  return NextResponse.json(category, { status: 201 });
}
