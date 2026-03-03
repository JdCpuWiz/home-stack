"use client";

import Link from "next/link";
import { Pencil, Trash2, UtensilsCrossed } from "lucide-react";

export type RecipeSummary = {
  id: number;
  title: string;
  servings: string | null;
  tags: string[];
  createdAt: string;
  _count: { ingredients: number; steps: number };
};

type Props = {
  recipe: RecipeSummary;
  onDelete: (id: number) => void;
};

export default function RecipeCard({ recipe, onDelete }: Props) {
  return (
    <div
      className="card flex flex-col gap-3 p-4"
      style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.4), 0 -2px 3px rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/recipes/${recipe.id}`}
          className="flex items-center gap-2 font-semibold text-base leading-snug hover:underline"
          style={{ color: "var(--text-primary)" }}
        >
          <UtensilsCrossed size={16} style={{ color: "var(--accent-orange)", flexShrink: 0 }} />
          {recipe.title}
        </Link>
        <div className="flex gap-1 shrink-0">
          <Link
            href={`/recipes/${recipe.id}/edit`}
            className="btn-secondary btn-sm p-1.5"
            title="Edit"
          >
            <Pencil size={13} />
          </Link>
          <button
            className="btn-danger btn-sm p-1.5"
            title="Delete"
            onClick={() => onDelete(recipe.id)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: "var(--bg-300)", color: "var(--accent-orange)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
        {recipe.servings && <span>Serves {recipe.servings}</span>}
        <span>{recipe._count.ingredients} ingredient{recipe._count.ingredients !== 1 ? "s" : ""}</span>
        <span>{recipe._count.steps} step{recipe._count.steps !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
