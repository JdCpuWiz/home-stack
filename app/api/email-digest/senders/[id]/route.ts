import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/email-digest/senders/[id] — remove sender (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const senderId = parseInt(id, 10);
  if (isNaN(senderId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await prisma.approvedSender.delete({ where: { id: senderId } });
  } catch {
    return NextResponse.json({ error: "Sender not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
