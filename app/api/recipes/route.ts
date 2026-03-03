import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/recipes — list all recipes with counts
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recipes = await prisma.recipe.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { ingredients: true, steps: true } },
    },
  });

  return NextResponse.json(recipes);
}

// POST /api/recipes — create recipe with ingredients + steps
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const recipe = await prisma.recipe.create({
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

  return NextResponse.json(recipe, { status: 201 });
}
