import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TodoList from "@/components/todos/TodoList";
import { TodoItem } from "@/components/todos/todoUtils";

export default async function TodosPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [todos, categories] = await Promise.all([
    prisma.todoItem.findMany({ orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] }),
    prisma.todoCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <TodoList
      initialTodos={todos as unknown as TodoItem[]}
      initialCategories={categories}
    />
  );
}
