import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stores = await prisma.groceryStore.findMany({ orderBy: { position: "asc" } });
  return NextResponse.json(stores);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name } = await request.json() as { name: string };
  if (!name?.trim() || name.trim().length > 100) {
    return NextResponse.json({ error: "Name is required (max 100 chars)" }, { status: 400 });
  }

  const count = await prisma.groceryStore.count();
  const store = await prisma.groceryStore.create({ data: { name: name.trim(), position: count } });
  return NextResponse.json(store, { status: 201 });
}
