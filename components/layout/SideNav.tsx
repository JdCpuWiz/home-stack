"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Package, Plus, CheckSquare, Search, Users, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
};

function NavLink({
  href,
  label,
  icon,
  exact,
  onClick,
}: NavItem & { onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm rounded-md mx-2 transition-colors"
      style={{
        backgroundColor: isActive ? "var(--bg-200)" : "transparent",
        color: isActive ? "var(--accent-orange)" : "var(--text-secondary)",
      }}
      onMouseEnter={(e) => {
        if (!isActive)
          (e.currentTarget as HTMLElement).style.backgroundColor =
            "var(--bg-200)";
      }}
      onMouseLeave={(e) => {
        if (!isActive)
          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-widest"
      style={{ color: "var(--text-secondary)" }}
    >
      {label}
    </div>
  );
}

export default function SideNav({ open, onClose }: Props) {
  const { data: session } = useSession();
  const isAdmin =
    session && (session.user as { role?: string }).role === "ADMIN";

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 flex flex-col w-60 shrink-0",
        "md:static md:z-auto md:translate-x-0",
        "transition-transform duration-200 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
      style={{
        backgroundColor: "var(--bg-100)",
        borderRight: "1px solid var(--bg-200)",
      }}
    >
      {/* Mobile close button + brand */}
      <div
        className="flex items-center justify-between px-4 h-14 shrink-0"
        style={{ borderBottom: "1px solid var(--bg-200)" }}
      >
        <Link
          href="/"
          className="text-lg font-bold"
          style={{ color: "var(--accent-orange)" }}
          onClick={onClose}
        >
          HomeStack
        </Link>
        <button
          className="md:hidden btn-secondary btn-sm p-1.5"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-2">
        {session && (
          <>
            <SectionLabel label="Totes" />
            <NavLink
              href="/"
              label="All Totes"
              icon={<Package size={16} />}
              exact
              onClick={onClose}
            />
            <NavLink
              href="/totes/new"
              label="New Tote"
              icon={<Plus size={16} />}
              exact
              onClick={onClose}
            />
          </>
        )}

        {session && (
          <NavLink
            href="/todos"
            label="Todos"
            icon={<CheckSquare size={16} />}
            onClick={onClose}
          />
        )}

        <NavLink
          href="/search"
          label="Search"
          icon={<Search size={16} />}
          exact
          onClick={onClose}
        />

        {isAdmin && (
          <>
            <SectionLabel label="Settings" />
            <NavLink
              href="/settings/users"
              label="Users"
              icon={<Users size={16} />}
              onClick={onClose}
            />
          </>
        )}
      </nav>

      {/* Version */}
      <div
        className="px-4 py-3 text-xs shrink-0"
        style={{ color: "var(--text-secondary)" }}
      >
        v0.1.0
      </div>
    </aside>
  );
}
