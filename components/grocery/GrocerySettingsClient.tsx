"use client";

import { useState } from "react";
import { GroceryStore, GroceryArea } from "./groceryUtils";

type Props = {
  initialStores: GroceryStore[];
  initialAreas: GroceryArea[];
};

export default function GrocerySettingsClient({ initialStores, initialAreas }: Props) {
  const [stores, setStores] = useState(initialStores);
  const [areas, setAreas] = useState(initialAreas);
  const [newStoreName, setNewStoreName] = useState("");
  const [newAreaName, setNewAreaName] = useState("");
  const [editStoreId, setEditStoreId] = useState<number | null>(null);
  const [editStoreName, setEditStoreName] = useState("");
  const [editAreaId, setEditAreaId] = useState<number | null>(null);
  const [editAreaName, setEditAreaName] = useState("");

  // --- Stores ---
  async function addStore() {
    if (!newStoreName.trim()) return;
    const res = await fetch("/api/grocery/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newStoreName.trim() }),
    });
    if (res.ok) {
      const store = await res.json();
      setStores((prev) => [...prev, store]);
      setNewStoreName("");
    }
  }

  async function saveStore(id: number) {
    if (!editStoreName.trim()) return;
    const res = await fetch(`/api/grocery/stores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editStoreName.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setStores((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setEditStoreId(null);
    }
  }

  async function deleteStore(id: number, name: string) {
    if (!confirm(`Delete store "${name}"? This will delete all associated lists.`)) return;
    const res = await fetch(`/api/grocery/stores/${id}`, { method: "DELETE" });
    if (res.ok) setStores((prev) => prev.filter((s) => s.id !== id));
  }

  // --- Areas ---
  async function addArea() {
    if (!newAreaName.trim()) return;
    const res = await fetch("/api/grocery/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newAreaName.trim() }),
    });
    if (res.ok) {
      const area = await res.json();
      setAreas((prev) => [...prev, area]);
      setNewAreaName("");
    }
  }

  async function saveArea(id: number) {
    if (!editAreaName.trim()) return;
    const res = await fetch(`/api/grocery/areas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editAreaName.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAreas((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditAreaId(null);
    }
  }

  async function deleteArea(id: number, name: string) {
    if (!confirm(`Delete area "${name}"?`)) return;
    const res = await fetch(`/api/grocery/areas/${id}`, { method: "DELETE" });
    if (res.ok) setAreas((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        Grocery Settings
      </h1>

      {/* Stores */}
      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Stores
        </h2>
        <div className="card flex flex-col gap-2 mb-4">
          {stores.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No stores yet.</p>
          )}
          {stores.map((store) => (
            <div key={store.id} className="card-surface flex items-center gap-2">
              {editStoreId === store.id ? (
                <>
                  <input
                    className="input flex-1"
                    value={editStoreName}
                    onChange={(e) => setEditStoreName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveStore(store.id); }}
                    autoFocus
                  />
                  <button className="btn-primary btn-sm" onClick={() => saveStore(store.id)}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditStoreId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{store.name}</span>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => { setEditStoreId(store.id); setEditStoreName(store.name); }}
                  >
                    Edit
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => deleteStore(store.id, store.name)}>Del</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="New store name"
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addStore(); }}
          />
          <button className="btn-primary btn-sm" onClick={addStore}>Add Store</button>
        </div>
      </section>

      {/* Areas */}
      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Store Areas
        </h2>
        <div className="card flex flex-col gap-2 mb-4">
          {areas.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No areas yet.</p>
          )}
          {areas.map((area) => (
            <div key={area.id} className="card-surface flex items-center gap-2">
              {editAreaId === area.id ? (
                <>
                  <input
                    className="input flex-1"
                    value={editAreaName}
                    onChange={(e) => setEditAreaName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveArea(area.id); }}
                    autoFocus
                  />
                  <button className="btn-primary btn-sm" onClick={() => saveArea(area.id)}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditAreaId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{area.name}</span>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => { setEditAreaId(area.id); setEditAreaName(area.name); }}
                  >
                    Edit
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => deleteArea(area.id, area.name)}>Del</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="New area name"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addArea(); }}
          />
          <button className="btn-primary btn-sm" onClick={addArea}>Add Area</button>
        </div>
      </section>
    </div>
  );
}
