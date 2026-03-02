export type Priority = "HIGH" | "MEDIUM" | "LOW";

export const PRIORITY_ORDER: Record<Priority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export type DueDateStatus = "overdue" | "today" | "upcoming" | "none";

export function getDueDateStatus(dueDate: Date | string | null): DueDateStatus {
  if (!dueDate) return "none";
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  if (due < today) return "overdue";
  if (due.getTime() === today.getTime()) return "today";
  return "upcoming";
}

export function formatDueDate(dueDate: Date | string | null): string {
  if (!dueDate) return "";
  return new Date(dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type TodoItem = {
  id: number;
  title: string;
  notes: string | null;
  dueDate: string | Date | null;
  priority: Priority;
  category: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export function sortTodos(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
