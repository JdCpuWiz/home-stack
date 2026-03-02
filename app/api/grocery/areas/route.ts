import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const areas = await prisma.groceryArea.findMany({ orderBy: { position: "asc" } });
  return NextResponse.json(areas);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const count = await prisma.groceryArea.count();
  const area = await prisma.groceryArea.create({ data: { name: name.trim(), position: count } });
  return NextResponse.json(area, { status: 201 });
}
