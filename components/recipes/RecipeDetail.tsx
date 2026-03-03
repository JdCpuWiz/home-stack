"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, ExternalLink, CheckSquare, Square } from "lucide-react";

export type FullRecipe = {
  id: number;
  title: string;
  servings: string | null;
  sourceUrl: string | null;
  notes: string | null;
  tags: string[];
  ingredients: { id: number; quantity: string | null; unit: string | null; name: string; position: number }[];
  steps: { id: number; stepNumber: number; instruction: string }[];
  createdAt: string;
  updatedAt: string;
};

type Props = { recipe: FullRecipe };

export default function RecipeDetail({ recipe }: Props) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  function toggleStep(stepNumber: number) {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) next.delete(stepNumber);
      else next.add(stepNumber);
      return next;
    });
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
          {recipe.title}
        </h1>
        <Link href={`/recipes/${recipe.id}/edit`} className="btn-secondary btn-sm flex items-center gap-1.5 shrink-0">
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 mb-4">
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

      <div className="flex flex-wrap gap-4 text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
        {recipe.servings && <span>Serves <strong style={{ color: "var(--text-primary)" }}>{recipe.servings}</strong></span>}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline"
            style={{ color: "var(--accent-orange)" }}
          >
            <ExternalLink size={13} />
            Source
          </a>
        )}
      </div>

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <div className="card p-4 mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-primary)" }}>
            Ingredients
          </h2>
          <table className="w-full text-sm">
            <tbody>
              {recipe.ingredients.map((ing) => (
                <tr key={ing.id} className="border-b last:border-0" style={{ borderColor: "var(--bg-200)" }}>
                  <td className="py-1.5 pr-3 w-16 text-right font-medium" style={{ color: "var(--accent-orange)" }}>
                    {ing.quantity ?? ""}
                  </td>
                  <td className="py-1.5 pr-3 w-20" style={{ color: "var(--text-secondary)" }}>
                    {ing.unit ?? ""}
                  </td>
                  <td className="py-1.5" style={{ color: "var(--text-primary)" }}>
                    {ing.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <div className="card p-4 mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-primary)" }}>
            Instructions
          </h2>
          <ol className="space-y-3">
            {recipe.steps.map((step) => {
              const done = checkedSteps.has(step.stepNumber);
              return (
                <li
                  key={step.id}
                  className="flex gap-3 cursor-pointer"
                  onClick={() => toggleStep(step.stepNumber)}
                >
                  <button className="mt-0.5 shrink-0" style={{ color: done ? "var(--accent-orange)" : "var(--bg-400)" }}>
                    {done ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <div>
                    <span className="text-xs font-bold mr-2" style={{ color: "var(--accent-orange)" }}>
                      {step.stepNumber}.
                    </span>
                    <span
                      className="text-sm leading-relaxed"
                      style={{
                        color: done ? "var(--text-secondary)" : "var(--text-primary)",
                        textDecoration: done ? "line-through" : "none",
                      }}
                    >
                      {step.instruction}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Notes */}
      {recipe.notes && (
        <div className="card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-primary)" }}>
            Notes
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
            {recipe.notes}
          </p>
        </div>
      )}

      <div className="mt-6">
        <Link href="/recipes" className="btn-secondary btn-sm">
          ← Back to Recipes
        </Link>
      </div>
    </div>
  );
}
