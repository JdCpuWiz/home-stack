import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/users/[id] — update password or role (admin only)
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const { password, role } = body as { password?: string; role?: "ADMIN" | "USER" };

  if (password && (password.length < 8 || password.length > 72)) {
    return NextResponse.json({ error: "Password must be 8–72 characters" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (password) data.passwordHash = await bcrypt.hash(password, 12);
  if (role === "ADMIN" || role === "USER") data.role = role;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(user);
}

// DELETE /api/users/[id] — delete user (admin only, cannot delete self)
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const selfId = parseInt((session.user as { id: string }).id);
  if (userId === selfId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
