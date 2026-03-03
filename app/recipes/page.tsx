import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RecipeList from "@/components/recipes/RecipeList";
import type { RecipeSummary } from "@/components/recipes/RecipeCard";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const recipes = await prisma.recipe.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { ingredients: true, steps: true } } },
  });

  return <RecipeList initialRecipes={recipes as unknown as RecipeSummary[]} />;
}
