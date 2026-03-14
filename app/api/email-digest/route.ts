import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

function todayMidnightUTC(): Date {
  return new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
}

// GET /api/email-digest — return today's digest or null
export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reportDate = todayMidnightUTC();
  const digest = await prisma.emailDigest.findFirst({
    where: { reportDate },
  });

  return NextResponse.json(digest ?? null);
}

// POST /api/email-digest — upsert today's digest
export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { entries: rawEntries } = body as { entries?: { sender: string; count: number }[] };

  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    return NextResponse.json({ error: "entries must be a non-empty array" }, { status: 400 });
  }

  // Filter to approved senders only (if any are configured); apply label as display name
  const approvedSenders = await prisma.approvedSender.findMany();
  let entries: { sender: string; count: number }[];
  if (approvedSenders.length > 0) {
    entries = rawEntries
      .filter((e) => (e.count ?? 0) > 0)
      .flatMap((e) => {
        const senderLower = e.sender.toLowerCase();
        const match = approvedSenders.find((s) => {
          const val = s.value.toLowerCase();
          return senderLower === val || senderLower.endsWith("@" + val);
        });
        return match ? [{ sender: match.label || e.sender, count: e.count }] : [];
      });
  } else {
    // No approved senders configured — store everything (unfiltered)
    entries = rawEntries.filter((e) => (e.count ?? 0) > 0);
  }

  const totalCount = entries.reduce((sum, e) => sum + (e.count ?? 0), 0);
  const reportDate = todayMidnightUTC();

  const digest = await prisma.emailDigest.upsert({
    where: { reportDate },
    update: { entries, totalCount, updatedAt: new Date() },
    create: { reportDate, entries, totalCount },
  });

  // Prune digests older than 7 days
  const sevenDaysAgo = new Date(
    new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").getTime() -
      7 * 24 * 60 * 60 * 1000
  );
  await prisma.emailDigest.deleteMany({
    where: { reportDate: { lt: sevenDaysAgo } },
  });

  return NextResponse.json(digest, { status: 200 });
}
