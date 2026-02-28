import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ToteForm from "@/components/totes/ToteForm";

export default async function NewTotePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Tote</h1>
      <ToteForm />
    </div>
  );
}
