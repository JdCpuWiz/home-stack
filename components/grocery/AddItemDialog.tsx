"use client";

import { useState, useRef, useEffect } from "react";
import { GroceryListItem } from "./groceryUtils";

type PantryItem = { name: string; category: string | null };

type Props = {
  listId: number;
  categories: string[];
  suggestions: string[];
  pantryItems?: PantryItem[];
  item?: GroceryListItem;
  onSave: (item: GroceryListItem) => void;
  onClose: () => void;
};

type DropdownEntry = { label: string; category: string | null; source: "pantry" | "history" };

export default function AddItemDialog({ listId, categories, suggestions, pantryItems = [], item, onSave, onClose }: Props) {
  const [name, setName] = useState(item?.name ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? "");
  const [category, setCategory] = useState<string>(item?.category ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const nameRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build filtered dropdown entries whenever name changes
  const filtered: DropdownEntry[] = [];
  if (name.trim().length >= 1) {
    const q = name.toLowerCase();
    const seen = new Set<string>();
    for (const p of pantryItems) {
      if (p.name.toLowerCase().includes(q)) {
        seen.add(p.name.toLowerCase());
        filtered.push({ label: p.name, category: p.category, source: "pantry" });
      }
    }
    for (const s of suggestions) {
      if (s.toLowerCase().includes(q) && !seen.has(s.toLowerCase())) {
        filtered.push({ label: s, category: null, source: "history" });
      }
    }
  }

  function selectEntry(entry: DropdownEntry) {
    setName(entry.label);
    if (entry.category) setCategory(entry.category);
    setShowDropdown(false);
    setHighlightIdx(-1);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        nameRef.current && !nameRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      selectEntry(filtered[highlightIdx]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const body = {
      name: name.trim(),
      quantity: quantity.trim() || null,
      category: category || null,
    };

    const res = item
      ? await fetch(`/api/grocery/lists/${listId}/items/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch(`/api/grocery/lists/${listId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

    if (res.ok) {
      const saved = await res.json();
      onSave(saved);
      onClose();
    } else if (res.status === 409) {
      setError("Already on list");
    }
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card w-full max-w-md"
        style={{ backgroundColor: "var(--bg-100)", border: "1px solid var(--bg-300)" }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          {item ? "Edit Item" : "Add Item"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div style={{ position: "relative" }}>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Name *
            </label>
            <input
              ref={nameRef}
              className="input w-full"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
                setShowDropdown(true);
                setHighlightIdx(-1);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleNameKeyDown}
              placeholder="e.g. Milk"
              autoFocus
              required
              autoComplete="off"
            />

            {/* Custom autocomplete dropdown */}
            {showDropdown && filtered.length > 0 && (
              <div
                ref={dropdownRef}
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 60,
                  background: "var(--bg-200)",
                  border: "1px solid var(--bg-300)",
                  borderRadius: "0.5rem",
                  marginTop: "2px",
                  maxHeight: "220px",
                  overflowY: "auto",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }}
              >
                {filtered.map((entry, i) => (
                  <div
                    key={`${entry.source}-${entry.label}`}
                    onMouseDown={(e) => { e.preventDefault(); selectEntry(entry); }}
                    onMouseEnter={() => setHighlightIdx(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 0.75rem",
                      cursor: "pointer",
                      background: i === highlightIdx ? "var(--bg-300)" : "transparent",
                    }}
                  >
                    <span style={{ flex: 1, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                      {entry.label}
                    </span>
                    {entry.category && (
                      <span style={{
                        fontSize: "0.7rem", fontWeight: 600,
                        background: "#1d4ed8", color: "#fff",
                        borderRadius: "9999px", padding: "0.1rem 0.5rem",
                        whiteSpace: "nowrap",
                      }}>
                        {entry.category}
                      </span>
                    )}
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 600,
                      background: entry.source === "pantry" ? "#15803d" : "#6b7280",
                      color: "#fff",
                      borderRadius: "9999px", padding: "0.1rem 0.5rem",
                      whiteSpace: "nowrap",
                    }}>
                      {entry.source === "pantry" ? "Pantry" : "History"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Quantity
            </label>
            <input
              className="input w-full"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 2 gallons"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Category
            </label>
            <select
              className="input w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">— No category —</option>
              {[...categories].sort((a, b) => a.localeCompare(b)).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>
          )}
          <div className="flex gap-2 justify-end mt-2">
            <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-sm" disabled={saving}>
              {saving ? "Saving…" : item ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
