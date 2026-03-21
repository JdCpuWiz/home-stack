"use client";

import { useState } from "react";
import { Trash2, Plus, ChevronDown } from "lucide-react";
import { PANTRY_ICON_MAP, PANTRY_ICON_LABELS, getPantryIcon } from "@/components/pantry/pantryIcons";

type Category = { id: number; name: string; icon: string; position: number };

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const CurrentIcon = getPantryIcon(value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary btn-sm flex items-center gap-2 px-3"
        title="Pick icon"
      >
        <CurrentIcon size={16} style={{ color: "var(--accent-orange)" }} />
        <ChevronDown size={12} style={{ color: "var(--text-secondary)" }} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-1 z-50 rounded-xl p-3 grid gap-1.5"
            style={{
              backgroundColor: "var(--bg-100)",
              border: "1px solid var(--bg-300)",
              gridTemplateColumns: "repeat(5, 2.25rem)",
              boxShadow: "0 10px 20px rgba(0,0,0,0.5)",
              width: "max-content",
            }}
          >
            {Object.entries(PANTRY_ICON_MAP).map(([name, Icon]) => (
              <button
                key={name}
                type="button"
                title={PANTRY_ICON_LABELS[name] ?? name}
                onClick={() => { onChange(name); setOpen(false); }}
                className="flex items-center justify-center rounded-lg transition-colors"
                style={{
                  width: "2.25rem",
                  height: "2.25rem",
                  backgroundColor: value === name ? "var(--bg-300)" : "transparent",
                  border: value === name ? "1px solid var(--accent-orange)" : "1px solid transparent",
                  color: value === name ? "var(--accent-orange)" : "var(--text-secondary)",
                }}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PantryCategorySettingsClient({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("Package");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    const res = await fetch("/api/pantry/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), icon: newIcon }),
    });
    if (res.status === 409) { setError("Already exists"); setAdding(false); return; }
    if (!res.ok) { setError("Failed to add"); setAdding(false); return; }
    const created = await res.json();
    setCategories((prev) => [...prev, created]);
    setNewName("");
    setNewIcon("Package");
    setAdding(false);
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete "${cat.name}"? Products using it will become Uncategorized.`)) return;
    const res = await fetch(`/api/pantry/categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) setCategories((prev) => prev.filter((c) => c.id !== cat.id));
  }

  async function handleUpdate(cat: Category, patch: { name?: string; icon?: string }) {
    const res = await fetch(`/api/pantry/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
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
          <IconPicker value={newIcon} onChange={setNewIcon} />
          <input
            className="input flex-1"
            placeholder="Category name…"
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
          categories.map((cat) => {
            const Icon = getPantryIcon(cat.icon);
            return (
              <div
                key={cat.id}
                className="card-surface rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <IconPicker
                  value={cat.icon}
                  onChange={(icon) => handleUpdate(cat, { icon })}
                />
                <Icon size={16} style={{ color: "var(--accent-orange)", flexShrink: 0 }} />
                <input
                  className="input flex-1 text-sm"
                  defaultValue={cat.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value.trim() !== cat.name) {
                      handleUpdate(cat, { name: e.target.value.trim() });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
                <button
                  onClick={() => handleDelete(cat)}
                  className="btn-secondary p-1.5 shrink-0"
                  style={{ color: "#ef4444", borderRadius: "6px" }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Deleting a category moves its products to Uncategorized. Renaming does not auto-update existing products.
      </p>
    </div>
  );
}
