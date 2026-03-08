import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PackageList, { PackageItem } from "@/components/packages/PackageList";
import { trackingUrl } from "@/app/api/packages/route";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const packages = await prisma.package.findMany({
    orderBy: [{ delivered: "asc" }, { estimatedDelivery: "asc" }, { createdAt: "desc" }],
  });

  const withUrls = packages.map((pkg) => ({
    ...pkg,
    estimatedDelivery: pkg.estimatedDelivery?.toISOString() ?? null,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
    trackingUrl: trackingUrl(pkg.carrier, pkg.trackingNumber),
  })) as unknown as PackageItem[];

  return <PackageList initialPackages={withUrls} />;
}
