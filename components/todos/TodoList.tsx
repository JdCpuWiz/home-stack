"use client";

import { useState } from "react";
import {
  TodoItem,
  sortTodos,
  getDueDateStatus,
  formatDueDate,
} from "./todoUtils";
import TodoFormDialog from "./TodoFormDialog";

type Category = { id: number; name: string };

type Props = {
  initialTodos: TodoItem[];
  initialCategories: Category[];
};

const PRIORITY_BADGE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  HIGH:   { bg: "#b91c1c", color: "#ffffff", label: "High" },
  MEDIUM: { bg: "#eab308", color: "#000000", label: "Medium" },
  LOW:    { bg: "#6b7280", color: "#ffffff", label: "Low" },
};

export default function TodoList({ initialTodos, initialCategories }: Props) {
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  function handleSave(saved: TodoItem) {
    setTodos((prev) => {
      const exists = prev.find((t) => t.id === saved.id);
      if (exists) return prev.map((t) => (t.id === saved.id ? saved : t));
      return [...prev, saved];
    });
  }

  async function handleCheck(todo: TodoItem) {
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
  }

  async function handleDelete(todo: TodoItem) {
    if (!confirm(`Delete "${todo.title}"?`)) return;
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatSaving(true);
    try {
      const res = await fetch("/api/todo-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      if (!res.ok) return;
      const cat: Category = await res.json();
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCatName("");
    } finally {
      setCatSaving(false);
    }
  }

  async function handleDeleteCategory(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    await fetch(`/api/todo-categories/${cat.id}`, { method: "DELETE" });
  }

  const sorted = sortTodos(todos);

  const groups = new Map<string, TodoItem[]>();
  for (const todo of sorted) {
    const key = todo.category?.trim() || "__uncategorised__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(todo);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === "__uncategorised__") return 1;
    if (b === "__uncategorised__") return -1;
    return a.localeCompare(b);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Todos
        </h1>
        <div className="flex gap-2">
          <button
            className="btn-secondary btn-sm"
            onClick={() => setShowCatManager((v) => !v)}
          >
            {showCatManager ? "Hide Categories" : "Manage Categories"}
          </button>
          <TodoFormDialog onSave={handleSave} categories={categories.map((c) => c.name)}>
            <button className="btn-primary btn-sm">+ New Todo</button>
          </TodoFormDialog>
        </div>
      </div>

      {showCatManager && (
        <div
          className="card mb-6 flex flex-col gap-3"
          style={{ borderColor: "var(--bg-300)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            Categories
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 && (
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No categories yet.
              </span>
            )}
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium"
                style={{ backgroundColor: "#1d4ed8", color: "#ffffff" }}
              >
                {cat.name}
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="ml-1 leading-none opacity-70 hover:opacity-100"
                  title={`Delete ${cat.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              className="input flex-1"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="New category name…"
            />
            <button type="submit" className="btn-primary btn-sm" disabled={catSaving}>
              {catSaving ? "Adding…" : "Add"}
            </button>
          </form>
        </div>
      )}

      {todos.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: "var(--text-secondary)" }}>No todos yet.</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Create one to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sortedKeys.map((key) => (
            <div key={key}>
              <div
                className="text-xs font-semibold uppercase tracking-widest pb-1 mb-3"
                style={{
                  color: "var(--text-secondary)",
                  borderBottom: "1px solid var(--bg-200)",
                }}
              >
                {key === "__uncategorised__" ? "Uncategorised" : key}
              </div>
              <div className="flex flex-col gap-2">
                {groups.get(key)!.map((todo) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    onCheck={handleCheck}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    categories={categories.map((c) => c.name)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TodoCard({
  todo,
  onCheck,
  onSave,
  onDelete,
  categories,
}: {
  todo: TodoItem;
  onCheck: (todo: TodoItem) => void;
  onSave: (todo: TodoItem) => void;
  onDelete: (todo: TodoItem) => void;
  categories: string[];
}) {
  const badge = PRIORITY_BADGE[todo.priority];
  const dueDateStatus = getDueDateStatus(todo.dueDate);
  const dueDateFormatted = formatDueDate(todo.dueDate);

  const dueDateColor =
    dueDateStatus === "overdue"
      ? "#f87171"
      : dueDateStatus === "today"
      ? "var(--accent-orange)"
      : "var(--text-secondary)";

  const dueDatePrefix =
    dueDateStatus === "overdue"
      ? "Overdue · "
      : dueDateStatus === "today"
      ? "Today · "
      : "";

  return (
    <div className="card-surface flex gap-3 items-start">
      <input
        type="checkbox"
        className="mt-1 shrink-0 cursor-pointer"
        onChange={() => onCheck(todo)}
        style={{ accentColor: "var(--accent-orange)" }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-medium text-sm"
            style={{ color: "var(--text-primary)" }}
          >
            {todo.title}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
          {dueDateFormatted && (
            <span className="text-xs" style={{ color: dueDateColor }}>
              {dueDatePrefix}
              {dueDateFormatted}
            </span>
          )}
        </div>
        {todo.notes && (
          <p
            className="text-xs mt-1 whitespace-pre-wrap"
            style={{ color: "var(--text-secondary)" }}
          >
            {todo.notes}
          </p>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <TodoFormDialog todo={todo} onSave={onSave} categories={categories}>
          <button className="btn-secondary btn-sm">Edit</button>
        </TodoFormDialog>
        <button className="btn-danger btn-sm" onClick={() => onDelete(todo)}>
          Del
        </button>
      </div>
    </div>
  );
}
