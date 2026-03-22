import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

// POST /api/email-digest/summaries/[id]/todo — create a TodoItem from this summary
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const summary = await prisma.emailSummary.findUnique({ where: { id: numId } });
  if (!summary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const title = summary.subject.length > 100
    ? summary.subject.slice(0, 97) + "…"
    : summary.subject;

  const todo = await prisma.todoItem.create({
    data: {
      title,
      notes: `From: ${summary.sender}\n\n${summary.summary}`,
      priority: "MEDIUM",
    },
  });

  return NextResponse.json(todo, { status: 201 });
}
