import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

// GET /api/email-digest/senders — list all approved senders
export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const senders = await prisma.approvedSender.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(senders);
}

// POST /api/email-digest/senders — create approved sender (admin only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { value, label } = body as { value: string; label?: string };

  if (!value?.trim()) {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }

  const normalizedValue = value.trim().toLowerCase();

  try {
    const sender = await prisma.approvedSender.create({
      data: {
        value: normalizedValue,
        label: label?.trim() || null,
      },
    });
    return NextResponse.json(sender, { status: 201 });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Sender already exists" }, { status: 409 });
    }
    throw err;
  }
}
