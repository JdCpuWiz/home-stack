import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TripHistoryList from "@/components/grocery/TripHistoryList";
import { GroceryTrip } from "@/components/grocery/groceryUtils";

export default async function GroceryHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const trips = await prisma.groceryTrip.findMany({
    orderBy: { completedAt: "desc" },
    include: { items: true },
  });

  return <TripHistoryList initialTrips={trips as unknown as GroceryTrip[]} />;
}
