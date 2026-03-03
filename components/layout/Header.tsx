"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

type Props = {
  onMenuClick: () => void;
};

export default function Header({ onMenuClick }: Props) {
  return (
    <header
      className="md:hidden"
      style={{
        backgroundColor: "var(--bg-100)",
        borderBottom: "1px solid var(--bg-200)",
        boxShadow: "var(--shadow-subtle)",
      }}
    >
      <div className="px-4 h-14 flex items-center gap-3">
        <button
          className="btn-secondary btn-sm p-2"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <Link href="/" aria-label="HomeStack home">
          <img src="/logo.png" alt="HomeStack" style={{ height: "36px", width: "auto" }} />
        </Link>
      </div>
    </header>
  );
}
