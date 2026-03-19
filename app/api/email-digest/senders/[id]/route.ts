import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSenderDescription } from "@/lib/ollamaDigest";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/email-digest/senders/[id] — update label, priority, or regenerate description
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const senderId = parseInt(id, 10);
  if (isNaN(senderId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const { label, priority, regenerateDescription } = body as {
    label?: string;
    priority?: string;
    regenerateDescription?: boolean;
  };

  const existing = await prisma.approvedSender.findUnique({ where: { id: senderId } });
  if (!existing) {
    return NextResponse.json({ error: "Sender not found" }, { status: 404 });
  }

  const newPriority = ["HIGH", "NORMAL", "LOW"].includes(priority ?? "")
    ? (priority as string)
    : existing.priority;

  const newLabel = label !== undefined ? (label.trim() || null) : existing.label;

  let description = existing.description;
  const wasNotHigh = existing.priority !== "HIGH";
  const isNowHigh = newPriority === "HIGH";

  if (isNowHigh && (wasNotHigh || regenerateDescription)) {
    description = await generateSenderDescription(newLabel || existing.value);
  } else if (newPriority !== "HIGH") {
    description = null;
  }

  const updated = await prisma.approvedSender.update({
    where: { id: senderId },
    data: { label: newLabel, priority: newPriority, description },
  });

  return NextResponse.json(updated);
}

// DELETE /api/email-digest/senders/[id] — remove sender (admin only)
export async function DELETE(_request: NextRequest, { params }: Params) {
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
