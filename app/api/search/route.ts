import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/search?q= — public
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json([]);
  }

  const totes = await prisma.tote.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { items: { some: { description: { contains: q, mode: "insensitive" } } } },
      ],
    },
    include: { items: { orderBy: { position: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(totes);
}
