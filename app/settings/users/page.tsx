import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as { role: string }).role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, createdAt: true },
    orderBy: { id: "asc" },
  });

  const selfId = parseInt((session.user as { id: string }).id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <UsersClient users={users} selfId={selfId} />
    </div>
  );
}
