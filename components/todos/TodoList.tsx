"use client";

import { useState } from "react";
import {
  TodoItem,
  sortTodos,
  getDueDateStatus,
  formatDueDate,
} from "./todoUtils";
import TodoFormDialog from "./TodoFormDialog";

type Props = {
  initialTodos: TodoItem[];
};

const PRIORITY_BADGE: Record<
  string,
  { bg: string; color: string; border: string; label: string }
> = {
  HIGH: {
    bg: "#7f1d1d",
    color: "#fca5a5",
    border: "#991b1b",
    label: "High",
  },
  MEDIUM: {
    bg: "#78350f",
    color: "#fcd34d",
    border: "#92400e",
    label: "Medium",
  },
  LOW: {
    bg: "var(--bg-300)",
    color: "var(--text-secondary)",
    border: "var(--bg-400)",
    label: "Low",
  },
};

export default function TodoList({ initialTodos }: Props) {
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);

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

  const sorted = sortTodos(todos);

  // Group by category — named categories A-Z first, uncategorised last
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Todos
        </h1>
        <TodoFormDialog onSave={handleSave}>
          <button className="btn-primary btn-sm">+ New Todo</button>
        </TodoFormDialog>
      </div>

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
}: {
  todo: TodoItem;
  onCheck: (todo: TodoItem) => void;
  onSave: (todo: TodoItem) => void;
  onDelete: (todo: TodoItem) => void;
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
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
            }}
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
        <TodoFormDialog todo={todo} onSave={onSave}>
          <button className="btn-secondary btn-sm">Edit</button>
        </TodoFormDialog>
        <button className="btn-danger btn-sm" onClick={() => onDelete(todo)}>
          Del
        </button>
      </div>
    </div>
  );
}
