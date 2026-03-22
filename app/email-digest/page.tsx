"use client";

import { useEffect, useState, useCallback } from "react";
import { Trash2, ClipboardList } from "lucide-react";

type DigestEntry = { sender: string; count: number };

type Sender = {
  id: number;
  value: string;
  label: string | null;
  priority: string;
  description: string | null;
};

type Digest = {
  id: number;
  startedAt: string;
  clearedAt: string | null;
  totalCount: number;
  unapprovedCount: number;
  entries: DigestEntry[];
};

type EmailSummary = {
  id: number;
  sender: string;
  subject: string;
  summary: string;
  createdAt: string;
};

function formatDateRange(startedAt: string, clearedAt: string | null) {
  const start = new Date(startedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  if (!clearedAt) return `Since ${start}`;
  const end = new Date(clearedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return start === end ? start : `${start} – ${end}`;
}

export default function EmailDigestPage() {
  const [active, setActive] = useState<Digest | null>(null);
  const [history, setHistory] = useState<Digest[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [summaries, setSummaries] = useState<EmailSummary[]>([]);
  const [clearing, setClearing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toastId, setToastId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [digestRes, sendersRes, summariesRes] = await Promise.all([
      fetch("/api/email-digest"),
      fetch("/api/email-digest/senders"),
      fetch("/api/email-digest/summaries"),
    ]);
    if (digestRes.ok) {
      const data = await digestRes.json();
      setActive(data.active ?? null);
      setHistory(data.history ?? []);
    }
    if (sendersRes.ok) setSenders(await sendersRes.json());
    if (summariesRes.ok) setSummaries(await summariesRes.json());
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleClear() {
    if (!confirm("Archive the current digest and start fresh?")) return;
    setClearing(true);
    const res = await fetch("/api/email-digest/clear", { method: "POST" });
    if (res.ok) await load();
    setClearing(false);
  }

  async function handleDeleteSummary(id: number) {
    const res = await fetch(`/api/email-digest/summaries/${id}`, { method: "DELETE" });
    if (res.ok) setSummaries((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleAddToTodo(id: number) {
    const res = await fetch(`/api/email-digest/summaries/${id}/todo`, { method: "POST" });
    if (res.ok) {
      setToastId(id);
      setTimeout(() => setToastId(null), 2500);
    }
  }

  // Build lookup: displayName → sender row (for priority/description)
  const senderByDisplay = new Map<string, Sender>();
  for (const s of senders) {
    senderByDisplay.set(s.label || s.value, s);
  }

  const entries: DigestEntry[] = active
    ? [...(active.entries as DigestEntry[])].sort((a, b) => b.count - a.count)
    : [];

  const highPriority = entries.filter((e) => {
    const s = senderByDisplay.get(e.sender);
    return s?.priority === "HIGH";
  });
  const normal = entries.filter((e) => {
    const s = senderByDisplay.get(e.sender);
    return !s || s.priority === "NORMAL";
  });
  const low = entries.filter((e) => {
    const s = senderByDisplay.get(e.sender);
    return s?.priority === "LOW";
  });

  const approvedCount = entries.reduce((s, e) => s + e.count, 0);
  const totalCount = active?.totalCount ?? 0;

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Toast */}
      {toastId !== null && (
        <div
          className="fixed bottom-6 right-6 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50"
          style={{ backgroundColor: "#15803d", color: "#fff" }}
        >
          Added to Todos
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Email Digest
          </h1>
          {active && (
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {formatDateRange(active.startedAt, null)}
            </p>
          )}
        </div>
        {active && (
          <button
            className="btn-secondary btn-sm flex items-center gap-1.5 mt-1"
            onClick={handleClear}
            disabled={clearing}
          >
            <Trash2 size={13} />
            Clear &amp; Archive
          </button>
        )}
      </div>

      {!loaded ? (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading…</p>
      ) : (
        <>
          {/* Email Summaries */}
          {summaries.length > 0 && (
            <section>
              <h2
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--accent-orange)" }}
              >
                Email Summaries
              </h2>
              <div className="flex flex-col gap-3">
                {summaries.map((s) => (
                  <div key={s.id} className="card-surface rounded-lg p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: "var(--accent-orange)" }}
                        >
                          {s.sender}
                        </span>
                        <span
                          className="text-sm font-medium leading-snug"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {s.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          className="btn-secondary btn-sm flex items-center gap-1"
                          onClick={() => handleAddToTodo(s.id)}
                          title="Add to Todos"
                        >
                          <ClipboardList size={12} />
                          Todo
                        </button>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDeleteSummary(s.id)}
                          title="Delete summary"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {s.summary}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* No data */}
          {(!active || totalCount === 0) && summaries.length === 0 && (
            <div className="card">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No emails tallied yet. Configure your n8n workflow to POST to{" "}
                <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: "var(--bg-300)" }}>
                  /api/email-digest/tally
                </code>
                .
              </p>
            </div>
          )}

          {active && totalCount > 0 && (
            <>
              {/* Summary bar */}
              <div
                className="card flex items-center gap-6 flex-wrap"
                style={{ backgroundColor: "var(--bg-100)" }}
              >
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: "var(--accent-orange)" }}>
                    {totalCount}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    total emails
                  </div>
                </div>
                {approvedCount > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                      {approvedCount}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      from approved
                    </div>
                  </div>
                )}
                {(active.unapprovedCount ?? 0) > 0 && (
                  <div className="text-center">
                    <div
                      className="text-3xl font-bold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {active.unapprovedCount}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      unapproved
                    </div>
                  </div>
                )}
              </div>

              {/* High priority */}
              {highPriority.length > 0 && (
                <section>
                  <h2
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "var(--accent-orange)" }}
                  >
                    High Priority
                  </h2>
                  <div className="flex flex-col gap-2">
                    {highPriority.map((entry) => {
                      const s = senderByDisplay.get(entry.sender);
                      return (
                        <div key={entry.sender} className="card-surface rounded-lg p-4">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                              {entry.sender}
                            </span>
                            <span
                              className="text-lg font-bold tabular-nums"
                              style={{ color: "var(--accent-orange)" }}
                            >
                              {entry.count}
                            </span>
                          </div>
                          {s?.description && (
                            <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>
                              {s.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Approved / Normal */}
              {normal.length > 0 && (
                <section>
                  <h2
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Approved Senders
                  </h2>
                  <div className="card p-0 overflow-hidden">
                    <table className="wiz-table w-full">
                      <tbody>
                        {normal.map((entry) => (
                          <tr key={entry.sender}>
                            <td style={{ color: "var(--text-primary)" }}>{entry.sender}</td>
                            <td
                              className="text-right font-semibold tabular-nums"
                              style={{ color: "var(--accent-orange)" }}
                            >
                              {entry.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Low priority */}
              {low.length > 0 && (
                <section>
                  <h2
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "var(--text-secondary)", opacity: 0.6 }}
                  >
                    Low Priority
                  </h2>
                  <div className="card p-0 overflow-hidden" style={{ opacity: 0.65 }}>
                    <table className="wiz-table w-full">
                      <tbody>
                        {low.map((entry) => (
                          <tr key={entry.sender}>
                            <td style={{ color: "var(--text-secondary)" }}>{entry.sender}</td>
                            <td
                              className="text-right tabular-nums"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {entry.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            History
          </h2>
          <div className="card flex flex-col gap-2">
            {history.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between text-sm card-surface rounded px-3 py-2"
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  {formatDateRange(d.startedAt, d.clearedAt)}
                </span>
                <span className="font-semibold" style={{ color: "var(--accent-orange)" }}>
                  {d.totalCount} emails
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
