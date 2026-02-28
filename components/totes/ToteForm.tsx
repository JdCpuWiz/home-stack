"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  toteId?: number;
  initialTitle?: string;
  initialItems?: string[];
};

export default function ToteForm({ toteId, initialTitle = "", initialItems = [""] }: Props) {
  const router = useRouter();
  const isEdit = toteId !== undefined;

  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState<string[]>(initialItems.length ? initialItems : [""]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function updateItem(index: number, value: string) {
    setItems((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function addItem() {
    setItems((prev) => [...prev, ""]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const cleanItems = items.filter((d) => d.trim());

    const url = isEdit ? `/api/totes/${toteId}` : "/api/totes";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, items: cleanItems }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }

    const tote = await res.json();
    router.push(`/totes/${tote.id}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this tote? This cannot be undone.")) return;
    setDeleting(true);

    await fetch(`/api/totes/${toteId}`, { method: "DELETE" });

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
          Title
        </label>
        <input
          className="input w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Camping gear"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
          Items
        </label>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input flex-1"
                value={item}
                onChange={(e) => updateItem(i, e.target.value)}
                placeholder={`Item ${i + 1}`}
                maxLength={100}
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="btn-secondary btn-sm px-2"
                aria-label="Remove item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addItem} className="btn-secondary btn-sm mt-2">
          + Add item
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create tote"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="btn-danger btn-sm ml-auto"
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete tote"}
          </button>
        )}
      </div>
    </form>
  );
}
