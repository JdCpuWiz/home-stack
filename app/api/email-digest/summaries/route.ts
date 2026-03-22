import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { generateEmailSummary } from "@/lib/ollamaDigest";

// GET /api/email-digest/summaries — list all summaries, newest first
export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summaries = await prisma.emailSummary.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(summaries);
}

// POST /api/email-digest/summaries — n8n submits email; summarize if approved sender
export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sender, subject, body: emailBody } = body as {
    sender?: string;
    subject?: string;
    body?: string;
  };

  if (!sender?.trim() || !subject?.trim()) {
    return NextResponse.json({ error: "sender and subject are required" }, { status: 400 });
  }

  const senderLower = sender.trim().toLowerCase();

  // Check if sender is approved
  const approvedSenders = await prisma.approvedSender.findMany();
  let approved = false;

  if (approvedSenders.length === 0) {
    // No approved senders configured — treat all as approved
    approved = true;
  } else {
    approved = approvedSenders.some((s) => {
      const val = s.value.toLowerCase();
      return (
        senderLower === val ||
        senderLower.endsWith("@" + val) ||
        (val.startsWith("@") && senderLower.endsWith(val))
      );
    });
  }

  if (!approved) {
    return NextResponse.json({ approved: false });
  }

  const summary = await generateEmailSummary(
    sender.trim(),
    subject.trim(),
    emailBody?.trim() ?? ""
  );

  if (!summary) {
    return NextResponse.json({ approved: true, summary: null, id: null });
  }

  const record = await prisma.emailSummary.create({
    data: {
      sender: sender.trim(),
      subject: subject.trim(),
      summary,
    },
  });

  return NextResponse.json({ approved: true, id: record.id, summary: record.summary });
}
