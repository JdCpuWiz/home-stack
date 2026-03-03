import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/recipes/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recipeId = parseInt(id);
  if (isNaN(recipeId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: { orderBy: { position: "asc" } },
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });

  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

// PUT /api/recipes/[id] — replace ingredients + steps wholesale
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recipeId = parseInt(id);
  if (isNaN(recipeId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json();
  const { title, servings, sourceUrl, notes, tags, ingredients, steps } = body as {
    title: string;
    servings?: string;
    sourceUrl?: string;
    notes?: string;
    tags?: string[];
    ingredients?: { quantity?: string; unit?: string; name: string; position: number }[];
    steps?: { stepNumber: number; instruction: string }[];
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const recipe = await prisma.$transaction(async (tx) => {
    await tx.recipeIngredient.deleteMany({ where: { recipeId } });
    await tx.recipeStep.deleteMany({ where: { recipeId } });

    return tx.recipe.update({
      where: { id: recipeId },
      data: {
        title: title.trim(),
        servings: servings?.trim() || null,
        sourceUrl: sourceUrl?.trim() || null,
        notes: notes?.trim() || null,
        tags: tags ?? [],
        ingredients: {
          create: (ingredients ?? []).map((ing) => ({
            quantity: ing.quantity?.trim() || null,
            unit: ing.unit?.trim() || null,
            name: ing.name.trim(),
            position: ing.position,
          })),
        },
        steps: {
          create: (steps ?? []).map((step) => ({
            stepNumber: step.stepNumber,
            instruction: step.instruction.trim(),
          })),
        },
      },
      include: {
        ingredients: { orderBy: { position: "asc" } },
        steps: { orderBy: { stepNumber: "asc" } },
      },
    });
  });

  return NextResponse.json(recipe);
}

// DELETE /api/recipes/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recipeId = parseInt(id);
  if (isNaN(recipeId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.recipe.delete({ where: { id: recipeId } });
  return NextResponse.json({ ok: true });
}
