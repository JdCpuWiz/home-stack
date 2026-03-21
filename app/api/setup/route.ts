import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/setup — check if setup is needed
export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ needsSetup: count === 0 });
}

// POST /api/setup — create the first admin account
export async function POST(request: NextRequest) {
  // Hard block: refuse if any user already exists
  const count = await prisma.user.count();
  if (count > 0) {
    return NextResponse.json({ error: "Setup already complete" }, { status: 403 });
  }

  const { username, email, password } = await request.json() as {
    username: string;
    email: string;
    password: string;
  };

  if (!username?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "Password must be 8–72 characters" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      username: username.trim(),
      email: email.trim(),
      passwordHash,
      role: "ADMIN",
    },
    select: { id: true, username: true, email: true, role: true },
  });

  return NextResponse.json({ ok: true, user }, { status: 201 });
}
