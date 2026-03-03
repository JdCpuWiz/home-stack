import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/todos — delete all todos (protected)
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.todoItem.deleteMany();
  return NextResponse.json({ ok: true });
}

// GET /api/todos — list all todos (protected)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todos = await prisma.todoItem.findMany({
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(todos);
}

// POST /api/todos — create todo (protected)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, notes, dueDate, priority, category } = body as {
    title: string;
    notes?: string;
    dueDate?: string;
    priority?: string;
    category?: string;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const todo = await prisma.todoItem.create({
    data: {
      title: title.trim(),
      notes: notes?.trim() || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: (priority as "HIGH" | "MEDIUM" | "LOW") ?? "MEDIUM",
      category: category?.trim() || null,
    },
  });

  return NextResponse.json(todo, { status: 201 });
}
