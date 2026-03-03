import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/grocery/history/items?name=Milk
// Permanently removes all trip history entries matching that name (case-insensitive).
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const name = request.nextUrl.searchParams.get("name");
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  await prisma.groceryTripItem.deleteMany({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
  });

  return NextResponse.json({ ok: true });
}
