import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EmailDigestSettingsClient from "@/components/settings/EmailDigestSettingsClient";

export const dynamic = "force-dynamic";

export default async function EmailDigestSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as { role: string }).role !== "ADMIN") redirect("/");

  const senders = await prisma.approvedSender.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Email Digest Settings</h1>
      <EmailDigestSettingsClient initialSenders={senders} />
    </div>
  );
}
