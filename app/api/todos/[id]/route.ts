import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// PUT /api/todos/[id] — update (protected)
export async function PUT(request: NextRequest, { params }: Params) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseInt(id);
  if (isNaN(todoId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
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

  const todo = await prisma.todoItem.update({
    where: { id: todoId },
    data: {
      title: title.trim(),
      notes: notes?.trim() || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: (priority as "HIGH" | "MEDIUM" | "LOW") ?? "MEDIUM",
      category: category?.trim() || null,
    },
  });

  return NextResponse.json(todo);
}

// DELETE /api/todos/[id] — protected (used for checkbox complete + manual delete)
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseInt(id);
  if (isNaN(todoId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await prisma.todoItem.delete({ where: { id: todoId } });
  return NextResponse.json({ ok: true });
}
