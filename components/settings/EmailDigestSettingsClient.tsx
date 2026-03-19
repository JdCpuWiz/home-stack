"use client";

import { useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";

type Sender = {
  id: number;
  value: string;
  label: string | null;
  priority: string;
  description: string | null;
  createdAt: string;
};

type Props = {
  initialSenders: Sender[];
};

const PRIORITY_OPTIONS = [
  { value: "HIGH", label: "High" },
  { value: "NORMAL", label: "Normal" },
  { value: "LOW", label: "Low" },
];

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "var(--accent-orange)",
  NORMAL: "var(--text-primary)",
  LOW: "var(--text-secondary)",
};

export default function EmailDigestSettingsClient({ initialSenders }: Props) {
  const [senders, setSenders] = useState<Sender[]>(initialSenders);
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newPriority, setNewPriority] = useState("NORMAL");
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);

  async function handleAdd() {
    if (!newValue.trim()) return;
    setAddError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/email-digest/senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: newValue.trim(),
          label: newLabel.trim() || undefined,
          priority: newPriority,
        }),
      });

      if (res.status === 409) { setAddError("Sender already exists"); return; }
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.error ?? "Failed to add sender");
        return;
      }

      const sender = await res.json();
      setSenders((prev) => [...prev, sender]);
      setNewValue("");
      setNewLabel("");
      setNewPriority("NORMAL");
    } finally {
      setSaving(false);
    }
  }

  async function handlePriorityChange(id: number, priority: string) {
    const res = await fetch(`/api/email-digest/senders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSenders((prev) => prev.map((s) => (s.id === id ? updated : s)));
    }
  }

  async function handleRegenerate(id: number) {
    setRegenerating(id);
    try {
      const res = await fetch(`/api/email-digest/senders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateDescription: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSenders((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
    } finally {
      setRegenerating(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this approved sender?")) return;
    const res = await fetch(`/api/email-digest/senders/${id}`, { method: "DELETE" });
    if (res.ok) setSenders((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Approved Senders
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Enter exact email addresses (e.g.{" "}
          <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: "var(--bg-300)" }}>
            orders@amazon.com
          </code>
          ) or domain wildcards (e.g.{" "}
          <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: "var(--bg-300)" }}>
            @amazon.com
          </code>
          ). High priority senders get an AI-generated description on the digest page.
        </p>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {senders.length === 0 ? (
          <p className="text-sm p-4" style={{ color: "var(--text-secondary)" }}>
            No approved senders yet.
          </p>
        ) : (
          <table className="wiz-table w-full">
            <thead>
              <tr>
                <th className="text-left">Value</th>
                <th className="text-left">Label</th>
                <th className="text-left">Priority</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {senders.map((sender) => (
                <>
                  <tr key={sender.id}>
                    <td style={{ color: "var(--text-primary)" }}>{sender.value}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{sender.label ?? "—"}</td>
                    <td>
                      <select
                        className="input py-0.5 text-xs"
                        value={sender.priority}
                        style={{ color: PRIORITY_COLORS[sender.priority] ?? "inherit" }}
                        onChange={(e) => handlePriorityChange(sender.id, e.target.value)}
                      >
                        {PRIORITY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-right">
                      {sender.priority === "HIGH" && (
                        <button
                          className="btn-secondary btn-sm mr-1"
                          title="Regenerate description"
                          onClick={() => handleRegenerate(sender.id)}
                          disabled={regenerating === sender.id}
                        >
                          <RefreshCw size={12} className={regenerating === sender.id ? "animate-spin" : ""} />
                        </button>
                      )}
                      <button
                        className="btn-danger btn-sm"
                        onClick={() => handleDelete(sender.id)}
                        aria-label={`Delete ${sender.value}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                  {sender.priority === "HIGH" && (
                    <tr key={`${sender.id}-desc`}>
                      <td
                        colSpan={4}
                        className="text-xs pb-3 px-4 italic"
                        style={{ color: "var(--text-secondary)", borderTop: "none" }}
                      >
                        {sender.description
                          ? sender.description
                          : regenerating === sender.id
                          ? "Generating…"
                          : <span style={{ opacity: 0.5 }}>No description yet — click ↺ to generate</span>}
                      </td>
                    </tr>
                  )}
                </>
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
          <select
            className="input"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label} Priority</option>
            ))}
          </select>
          <button
            className="btn-primary btn-sm"
            onClick={handleAdd}
            disabled={saving || !newValue.trim()}
          >
            Add Sender
          </button>
        </div>
        {addError && <p className="text-sm text-red-400">{addError}</p>}
      </div>
    </div>
  );
}
