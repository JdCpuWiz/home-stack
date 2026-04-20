"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TodoItem } from "./todoUtils";

type Props = {
  children: React.ReactNode;
  todo?: TodoItem;
  categories: string[];
  onSave: (todo: TodoItem) => void;
};

export default function TodoFormDialog({ children, todo, categories, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(todo?.title ?? "");
  const [notes, setNotes] = useState(todo?.notes ?? "");
  const [dueDate, setDueDate] = useState(
    todo?.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : ""
  );
  const [priority, setPriority] = useState<"HIGH" | "MEDIUM" | "LOW">(
    todo?.priority ?? "MEDIUM"
  );
  const [category, setCategory] = useState(todo?.category ?? "");

  function syncFromTodo() {
    setTitle(todo?.title ?? "");
    setNotes(todo?.notes ?? "");
    setDueDate(
      todo?.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : ""
    );
    setPriority(todo?.priority ?? "MEDIUM");
    setCategory(todo?.category ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const url = todo ? `/api/todos/${todo.id}` : "/api/todos";
      const method = todo ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          notes: notes || null,
          dueDate: dueDate || null,
          priority,
          category: category || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const saved = await res.json();
      onSave(saved);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) syncFromTodo();
        else if (!todo) {
          setTitle("");
          setNotes("");
          setDueDate("");
          setPriority("MEDIUM");
          setCategory("");
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        style={{
          backgroundColor: "var(--bg-100)",
          borderColor: "var(--bg-300)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>
            {todo ? "Edit Todo" : "New Todo"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Title *
            </label>
            <input
              className="input mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>
          <div>
            <label
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Notes
            </label>
            <textarea
              className="input mt-1 h-auto min-h-[80px] resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Due Date
              </label>
              <input
                type="date"
                className="input mt-1"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label
                className="text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Priority
              </label>
              <select
                className="input mt-1"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as "HIGH" | "MEDIUM" | "LOW")
                }
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Category
            </label>
            <select
              className="input mt-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">— No category —</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary btn-sm"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
