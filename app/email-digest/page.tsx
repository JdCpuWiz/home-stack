import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DigestEntry = { sender: string; count: number };

export default async function EmailDigestPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const todayMidnightUTC = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  const [todayDigest, history] = await Promise.all([
    prisma.emailDigest.findFirst({
      where: { reportDate: todayMidnightUTC },
    }),
    prisma.emailDigest.findMany({
      orderBy: { reportDate: "desc" },
      take: 7,
    }),
  ]);

  const todayEntries: DigestEntry[] = todayDigest
    ? ((todayDigest.entries as DigestEntry[]).slice().sort((a, b) => b.count - a.count))
    : [];

  const pastHistory = history.filter(
    (d) => d.reportDate.toISOString() !== todayMidnightUTC.toISOString()
  );

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        Email Digest
      </h1>

      {/* Today's digest */}
      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Today
        </h2>
        {!todayDigest ? (
          <div className="card">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No digest received yet for today. Configure your n8n workflow to POST to{" "}
              <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: "var(--bg-300)" }}>
                /api/email-digest
              </code>
              .
            </p>
          </div>
        ) : (
          <div className="card">
            <table className="wiz-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Sender</th>
                  <th className="text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {todayEntries.map((entry, i) => (
                  <tr key={i}>
                    <td style={{ color: "var(--text-primary)" }}>{entry.sender}</td>
                    <td className="text-right" style={{ color: "var(--accent-orange)" }}>
                      {entry.count}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    Total
                  </td>
                  <td
                    className="text-right font-bold"
                    style={{ color: "var(--accent-orange)" }}
                  >
                    {todayDigest.totalCount}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Recent history */}
      {pastHistory.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Recent History
          </h2>
          <div className="card flex flex-col gap-2">
            {pastHistory.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between text-sm card-surface"
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  {d.reportDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
                <span
                  className="font-semibold"
                  style={{ color: "var(--accent-orange)" }}
                >
                  {d.totalCount} emails
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
