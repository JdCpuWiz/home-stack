"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

type Sender = {
  id: number;
  value: string;
  label: string | null;
  createdAt: string;
};

type Props = {
  initialSenders: Sender[];
};

export default function EmailDigestSettingsClient({ initialSenders }: Props) {
  const [senders, setSenders] = useState<Sender[]>(initialSenders);
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!newValue.trim()) return;
    setAddError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/email-digest/senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: newValue.trim(), label: newLabel.trim() || undefined }),
      });

      if (res.status === 409) {
        setAddError("Sender already exists");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setAddError(data.error ?? "Failed to add sender");
        return;
      }

      const sender = await res.json();
      setSenders((prev) => [...prev, sender]);
      setNewValue("");
      setNewLabel("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this approved sender?")) return;
    const res = await fetch(`/api/email-digest/senders/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSenders((prev) => prev.filter((s) => s.id !== id));
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Approved Senders
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Enter exact email addresses (e.g. <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: "var(--bg-300)" }}>orders@amazon.com</code>) or domain wildcards (e.g. <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: "var(--bg-300)" }}>@amazon.com</code>).
        </p>
      </div>

      {/* Table */}
      <div className="card">
        {senders.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No approved senders yet.
          </p>
        ) : (
          <table className="wiz-table w-full">
            <thead>
              <tr>
                <th className="text-left">Value</th>
                <th className="text-left">Label</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {senders.map((sender) => (
                <tr key={sender.id}>
                  <td style={{ color: "var(--text-primary)" }}>{sender.value}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{sender.label ?? "—"}</td>
                  <td className="text-right">
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => handleDelete(sender.id)}
                      aria-label={`Delete ${sender.value}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add form */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          <input
            className="input flex-1 min-w-48"
            placeholder="orders@amazon.com or @amazon.com"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          />
          <input
            className="input flex-1 min-w-32"
            placeholder="Label (optional)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          />
          <button
            className="btn-primary btn-sm"
            onClick={handleAdd}
            disabled={saving || !newValue.trim()}
          >
            Add Sender
          </button>
        </div>
        {addError && (
          <p className="text-sm text-red-400">{addError}</p>
        )}
      </div>
    </div>
  );
}
