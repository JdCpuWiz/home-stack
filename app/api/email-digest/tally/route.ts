import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

type DigestEntry = { sender: string; count: number };

// POST /api/email-digest/tally — increment count for a single sender
// Handles approved sender matching and label mapping server-side.
// Unapproved senders increment unapprovedCount only (not tracked by name).
export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sender } = body as { sender?: string };

  if (!sender?.trim()) {
    return NextResponse.json({ error: "sender is required" }, { status: 400 });
  }

  const senderLower = sender.trim().toLowerCase();

  const approvedSenders = await prisma.approvedSender.findMany();
  let displayName: string | null = null;

  if (approvedSenders.length > 0) {
    const match = approvedSenders.find((s) => {
      const val = s.value.toLowerCase();
      return senderLower === val || senderLower.endsWith("@" + val) ||
        (val.startsWith("@") && senderLower.endsWith(val));
    });
    if (match) {
      displayName = match.label || sender.trim();
    }
    // else: unapproved — displayName stays null
  } else {
    // No approved senders configured — store everything
    displayName = sender.trim();
  }

  // Find the active (uncleared) digest
  const current = await prisma.emailDigest.findFirst({
    where: { clearedAt: null },
    orderBy: { startedAt: "desc" },
  });

  const entries: DigestEntry[] = Array.isArray(current?.entries)
    ? (current.entries as DigestEntry[]).map((e) => ({ ...e }))
    : [];

  if (displayName !== null) {
    // Approved sender — increment named entry
    const existing = entries.find((e) => e.sender === displayName);
    if (existing) {
      existing.count += 1;
    } else {
      entries.push({ sender: displayName, count: 1 });
    }
    const totalCount = entries.reduce((sum, e) => sum + e.count, 0);
    const unapprovedCount = current?.unapprovedCount ?? 0;

    const digest = await prisma.emailDigest.upsert({
      where: { id: current?.id ?? -1 },
      update: { entries, totalCount, updatedAt: new Date() },
      create: { entries, totalCount, unapprovedCount: 0 },
    });

    return NextResponse.json(digest);
  } else {
    // Unapproved sender — only increment unapprovedCount
    const unapprovedCount = (current?.unapprovedCount ?? 0) + 1;
    const totalCount = (current?.totalCount ?? 0) + 1;

    const digest = await prisma.emailDigest.upsert({
      where: { id: current?.id ?? -1 },
      update: { unapprovedCount, totalCount, updatedAt: new Date() },
      create: { entries: [], totalCount: 1, unapprovedCount: 1 },
    });

    return NextResponse.json({ ok: true, unapproved: true, digest });
  }
}
