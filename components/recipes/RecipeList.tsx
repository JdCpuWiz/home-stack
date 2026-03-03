"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, UtensilsCrossed } from "lucide-react";
import RecipeCard, { RecipeSummary } from "./RecipeCard";

type Props = { initialRecipes: RecipeSummary[] };

export default function RecipeList({ initialRecipes }: Props) {
  const [recipes, setRecipes] = useState<RecipeSummary[]>(initialRecipes);

  async function handleDelete(id: number) {
    if (!confirm("Delete this recipe?")) return;
    const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <UtensilsCrossed size={24} style={{ color: "var(--accent-orange)" }} />
          Recipes
        </h1>
        <Link href="/recipes/new" className="btn-primary btn-sm flex items-center gap-1.5">
          <Plus size={15} />
          New Recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div
          className="card p-8 text-center"
          style={{ color: "var(--text-secondary)" }}
        >
          <UtensilsCrossed size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No recipes yet.</p>
          <p className="text-sm mt-1">Add your first recipe to get started.</p>
          <Link href="/recipes/new" className="btn-primary btn-sm inline-flex items-center gap-1.5 mt-4">
            <Plus size={14} />
            New Recipe
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
