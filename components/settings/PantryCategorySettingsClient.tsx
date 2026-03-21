"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";

type Category = { id: number; name: string; position: number };

export default function PantryCategorySettingsClient({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    const res = await fetch("/api/pantry/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.status === 409) { setError("Already exists"); setAdding(false); return; }
    if (!res.ok) { setError("Failed to add"); setAdding(false); return; }
    const created = await res.json();
    setCategories((prev) => [...prev, created]);
    setNewName("");
    setAdding(false);
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"? Products using it will become Uncategorized.`)) return;
    const res = await fetch(`/api/pantry/categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) setCategories((prev) => prev.filter((c) => c.id !== cat.id));
  }

  async function handleRename(cat: Category, newName: string) {
    if (!newName.trim() || newName.trim() === cat.name) return;
    const res = await fetch(`/api/pantry/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-bold">Pantry Categories</h1>

      {/* Add new */}
      <div
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{ backgroundColor: "var(--bg-100)", border: "1px solid var(--bg-300)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Add Category
        </h2>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="e.g. Cleaning, Paper Products, Health & Beauty…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || adding}
            className="btn-primary btn-sm px-4 flex items-center gap-1.5"
            style={{ opacity: !newName.trim() || adding ? 0.5 : 1 }}
          >
            <Plus size={15} /> Add
          </button>
        </div>
        {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}
      </div>

      {/* Category list */}
      <div className="flex flex-col gap-2">
        {categories.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center text-sm"
            style={{ backgroundColor: "var(--bg-100)", color: "var(--text-secondary)" }}
          >
            No categories yet — add one above
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="card-surface rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <input
                className="input flex-1 text-sm"
                defaultValue={cat.name}
                onBlur={(e) => handleRename(cat, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
              <button
                onClick={() => handleDelete(cat)}
                className="btn-secondary p-1.5 shrink-0"
                style={{ color: "#ef4444", borderRadius: "6px" }}
                title="Delete category"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Deleting a category does not delete products — they move to Uncategorized.
        Renaming a category here does not auto-update existing products.
      </p>
    </div>
  );
}
