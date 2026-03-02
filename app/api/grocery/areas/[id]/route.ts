import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, position } = await request.json() as { name?: string; position?: number };
  const area = await prisma.groceryArea.update({
    where: { id: parseInt(id) },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(position !== undefined && { position }),
    },
  });
  return NextResponse.json(area);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.groceryArea.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
