import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/users — list users (admin only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, createdAt: true },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(users);
}

// POST /api/users — create user (admin only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { username, email, password, role } = body as {
    username: string;
    email: string;
    password: string;
    role: "ADMIN" | "USER";
  };

  if (!username?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      username: username.trim(),
      email: email.trim(),
      passwordHash,
      role: role === "ADMIN" ? "ADMIN" : "USER",
    },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
