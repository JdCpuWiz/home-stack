import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

function todayMidnightUTC(): Date {
  return new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
}

type DigestEntry = { sender: string; count: number };

// POST /api/email-digest/tally — increment count for a single sender
// Handles approved sender matching and label mapping server-side.
// Silently ignores senders not on the approved list (when list is configured).
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

  // Match against approved senders list
  const approvedSenders = await prisma.approvedSender.findMany();
  let displayName: string;

  if (approvedSenders.length > 0) {
    const match = approvedSenders.find((s) => {
      const val = s.value.toLowerCase();
      return senderLower === val || senderLower.endsWith("@" + val);
    });
    if (!match) {
      // Not an approved sender — ignore silently
      return NextResponse.json({ ok: true, ignored: true });
    }
    displayName = match.label || sender.trim();
  } else {
    // No approved senders configured — store everything
    displayName = sender.trim();
  }

  const reportDate = todayMidnightUTC();

  // Read current digest, increment this sender, write back
  const current = await prisma.emailDigest.findFirst({ where: { reportDate } });
  const entries: DigestEntry[] = Array.isArray(current?.entries)
    ? (current.entries as DigestEntry[]).map((e) => ({ ...e }))
    : [];

  const existing = entries.find((e) => e.sender === displayName);
  if (existing) {
    existing.count += 1;
  } else {
    entries.push({ sender: displayName, count: 1 });
  }

  const totalCount = entries.reduce((sum, e) => sum + e.count, 0);

  const digest = await prisma.emailDigest.upsert({
    where: { reportDate },
    update: { entries, totalCount, updatedAt: new Date() },
    create: { reportDate, entries, totalCount },
  });

  return NextResponse.json(digest);
}
