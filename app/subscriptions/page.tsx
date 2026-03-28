import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SubscriptionList from "@/components/subscriptions/SubscriptionList";

export default async function SubscriptionsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <SubscriptionList />;
}
