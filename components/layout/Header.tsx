"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu } from "lucide-react";

type Props = {
  onMenuClick: () => void;
};

export default function Header({ onMenuClick }: Props) {
  const { data: session } = useSession();

  return (
    <header
      style={{
        backgroundColor: "var(--bg-100)",
        borderBottom: "1px solid var(--bg-200)",
        boxShadow: "var(--shadow-subtle)",
      }}
    >
      <div className="px-4 h-14 flex items-center justify-between">
        {/* Left: hamburger (mobile) + logo */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden btn-secondary btn-sm p-2"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <Link
            href="/"
            className="text-lg font-bold md:hidden"
            style={{ color: "var(--accent-orange)" }}
          >
            HomeStack
          </Link>
        </div>

        {/* Right: version, search, sign-out / sign-in */}
        <div className="flex items-center gap-3">
          <span
            className="hidden md:block text-xs font-medium"
            style={{ color: "var(--accent-orange)" }}
          >
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
          <Link
            href="/search"
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Search
          </Link>
          {session ? (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn-primary btn-sm"
            >
              Sign out
            </button>
          ) : (
            <Link href="/login" className="btn-primary btn-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
