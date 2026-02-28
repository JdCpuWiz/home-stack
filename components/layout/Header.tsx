"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header
      style={{
        backgroundColor: "var(--bg-100)",
        borderBottom: "1px solid var(--bg-200)",
        boxShadow: "var(--shadow-subtle)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-lg font-bold"
          style={{ color: "var(--accent-orange)" }}
        >
          HomeStack
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/search"
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Search
          </Link>

          {session ? (
            <>
              <Link
                href="/"
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                All Totes
              </Link>
              <Link
                href="/totes/new"
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                New Tote
              </Link>
              {(session.user as { role?: string }).role === "ADMIN" && (
                <Link
                  href="/settings/users"
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Users
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="btn-secondary btn-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary btn-sm">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
