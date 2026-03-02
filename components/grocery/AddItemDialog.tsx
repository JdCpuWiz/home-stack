"use client";

import { useState, useRef } from "react";
import { GroceryArea, GroceryListItem } from "./groceryUtils";

type Props = {
  listId: number;
  areas: GroceryArea[];
  suggestions: string[];
  item?: GroceryListItem;
  onSave: (item: GroceryListItem) => void;
  onClose: () => void;
};

export default function AddItemDialog({ listId, areas, suggestions, item, onSave, onClose }: Props) {
  const [name, setName] = useState(item?.name ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? "");
  const [areaId, setAreaId] = useState<string>(item?.areaId?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const body = {
      name: name.trim(),
      quantity: quantity.trim() || null,
      areaId: areaId ? parseInt(areaId) : null,
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
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Name *
            </label>
            <input
              ref={nameRef}
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              list="item-suggestions"
              placeholder="e.g. Milk"
              autoFocus
              required
            />
            <datalist id="item-suggestions">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
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
              Area
            </label>
            <select
              className="input w-full"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
            >
              <option value="">— No area —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

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
