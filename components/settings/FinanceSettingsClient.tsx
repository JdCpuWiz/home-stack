"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight } from "lucide-react";

type Item = {
  id: number;
  name: string;
  category: string;
  defaultAmount: string | null;
  payDay: number | null;
  isActive: boolean;
  position: number;
};

const CATEGORY_ORDER = [
  "BILLS", "SUBSCRIPTIONS", "SHARED_CREDIT",
  "MY_CARDS", "SHARED_CARDS", "LOANS",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  BILLS: "Bills",
  SUBSCRIPTIONS: "Subscriptions",
  SHARED_CREDIT: "Shared Credit",
  MY_CARDS: "My Cards",
  SHARED_CARDS: "Shared Cards",
  LOANS: "Loans",
};

export default function FinanceSettingsClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);

  // Add form state per category
  const [addingCat, setAddingCat] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newPayDay, setNewPayDay] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPayDay, setEditPayDay] = useState("");

  function startAdd(cat: string) {
    setAddingCat(cat);
    setNewName(""); setNewAmount(""); setNewPayDay("");
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditAmount(item.defaultAmount != null ? parseFloat(item.defaultAmount).toFixed(2) : "");
    setEditPayDay(item.payDay != null ? String(item.payDay) : "");
  }

  async function addItem(category: string) {
    if (!newName.trim()) return;
    const res = await fetch("/api/finance/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        category,
        defaultAmount: newAmount || null,
        payDay: newPayDay || null,
      }),
    });
    if (res.ok) {
      const item = await res.json();
      setItems((prev) => [...prev, item]);
      setAddingCat(null);
    }
  }

  async function saveEdit(id: number) {
    const res = await fetch(`/api/finance/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        defaultAmount: editAmount || null,
        payDay: editPayDay || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      setEditingId(null);
    }
  }

  async function toggleActive(item: Item) {
    const res = await fetch(`/api/finance/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    }
  }

  async function deleteItem(item: Item) {
    if (!confirm(`Delete "${item.name}"? This will not affect past month entries.`)) return;
    const res = await fetch(`/api/finance/items/${item.id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Finance Settings
      </h1>

      {CATEGORY_ORDER.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);

        return (
          <div key={cat} className="mb-6">
            {/* Section header */}
            <div
              className="flex items-center justify-between px-3 py-2 rounded-t-lg"
              style={{ backgroundColor: "var(--bg-300)" }}
            >
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--text-primary)" }}
              >
                {CATEGORY_LABELS[cat]}
              </span>
              <button
                onClick={() => startAdd(cat)}
                className="btn-secondary btn-sm flex items-center gap-1"
              >
                <Plus size={12} /> Add
              </button>
            </div>

            <div
              className="rounded-b-lg overflow-hidden"
              style={{ border: "1px solid var(--bg-300)", borderTop: "none" }}
            >
              {catItems.length === 0 && addingCat !== cat && (
                <div
                  className="px-3 py-3 text-sm"
                  style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-100)" }}
                >
                  No items yet.
                </div>
              )}

              {catItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={{
                    backgroundColor: idx % 2 === 0 ? "var(--bg-100)" : "var(--bg-200)",
                    opacity: item.isActive ? 1 : 0.5,
                  }}
                >
                  {editingId === item.id ? (
                    /* Edit mode */
                    <>
                      <input
                        autoFocus
                        className="input flex-1 text-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(item.id); if (e.key === "Escape") setEditingId(null); }}
                        placeholder="Name"
                      />
                      <input
                        className="input w-24 text-right text-sm"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        placeholder="Amount"
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(item.id); if (e.key === "Escape") setEditingId(null); }}
                      />
                      <input
                        className="input w-16 text-center text-sm"
                        value={editPayDay}
                        onChange={(e) => setEditPayDay(e.target.value)}
                        placeholder="Day"
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(item.id); if (e.key === "Escape") setEditingId(null); }}
                      />
                      <button onClick={() => saveEdit(item.id)} className="btn-primary btn-sm p-1.5">
                        <Check size={13} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary btn-sm p-1.5">
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    /* View mode */
                    <>
                      <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>
                        {item.name}
                      </span>
                      <span className="text-xs tabular-nums w-20 text-right" style={{ color: "var(--text-secondary)" }}>
                        {item.defaultAmount != null
                          ? `$${parseFloat(item.defaultAmount).toFixed(2)}`
                          : "—"}
                      </span>
                      <span className="text-xs w-12 text-center" style={{ color: "var(--text-secondary)" }}>
                        {item.payDay != null ? `${item.payDay}th` : "—"}
                      </span>
                      <button
                        onClick={() => toggleActive(item)}
                        title={item.isActive ? "Deactivate" : "Activate"}
                        style={{ color: item.isActive ? "#4ade80" : "var(--bg-400)" }}
                      >
                        {item.isActive
                          ? <ToggleRight size={18} />
                          : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="opacity-50 hover:opacity-90 transition-opacity"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteItem(item)}
                        className="opacity-40 hover:opacity-80 transition-opacity"
                        style={{ color: "#f87171" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              ))}

              {/* Add new item row */}
              {addingCat === cat && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5"
                  style={{
                    backgroundColor:
                      catItems.length % 2 === 0 ? "var(--bg-100)" : "var(--bg-200)",
                    borderTop: "1px solid var(--bg-300)",
                  }}
                >
                  <input
                    autoFocus
                    className="input flex-1 text-sm"
                    placeholder="Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addItem(cat); if (e.key === "Escape") setAddingCat(null); }}
                  />
                  <input
                    className="input w-24 text-right text-sm"
                    placeholder="Default $"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addItem(cat); if (e.key === "Escape") setAddingCat(null); }}
                  />
                  <input
                    className="input w-16 text-center text-sm"
                    placeholder="Day"
                    value={newPayDay}
                    onChange={(e) => setNewPayDay(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addItem(cat); if (e.key === "Escape") setAddingCat(null); }}
                  />
                  <button onClick={() => addItem(cat)} className="btn-primary btn-sm">Add</button>
                  <button onClick={() => setAddingCat(null)} className="btn-secondary btn-sm">
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
        Inactive items are hidden from new months but preserved in past months.
        The default amount and pay day pre-fill each new month; amounts carry over
        from the previous month if available.
      </p>
    </div>
  );
}
