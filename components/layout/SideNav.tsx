"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Package, Plus, CheckSquare, Search, Users, X, ShoppingCart, History, Settings } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type NavItemProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  onClick?: () => void;
};

/** Sub-item link (indented, smaller) */
function NavLink({ href, label, icon, exact, onClick }: NavItemProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className="nav-link flex items-center gap-2.5 py-1.5 text-sm rounded-md mx-2 pl-4 pr-3 transition-colors"
      style={{
        color: isActive ? "var(--accent-orange)" : "var(--text-secondary)",
        backgroundColor: isActive ? "var(--bg-200)" : "transparent",
        borderLeft: isActive
          ? "2px solid var(--accent-orange)"
          : "2px solid transparent",
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

/** Top-level section heading that is also a clickable link */
function SectionNavLink({ href, label, icon, exact, onClick }: NavItemProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className="section-nav-link flex items-center gap-2.5 px-4 py-2 text-sm font-semibold rounded-md mx-2 transition-colors mt-3"
      style={{
        color: isActive ? "var(--accent-orange)" : "var(--text-primary)",
        backgroundColor: isActive ? "var(--bg-200)" : "transparent",
        borderLeft: isActive
          ? "2px solid var(--accent-orange)"
          : "2px solid transparent",
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

/** Non-clickable section divider label */
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mx-3 mt-5 mb-1 flex items-center gap-2">
      <span
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--bg-300)" }} />
    </div>
  );
}

export default function SideNav({ open, onClose }: Props) {
  const { data: session } = useSession();
  const isAdmin =
    session && (session.user as { role?: string }).role === "ADMIN";

  return (
    <>
      <style>{`
        .nav-link:hover {
          background-color: var(--bg-200);
          color: var(--text-primary);
        }
        .section-nav-link:hover {
          background-color: var(--bg-200);
          color: var(--accent-orange);
        }
      `}</style>

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
        {/* Brand + mobile close */}
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {session && (
            <>
              <SectionLabel label="Totes" />
              <NavLink
                href="/"
                label="All Totes"
                icon={<Package size={15} />}
                exact
                onClick={onClose}
              />
              <NavLink
                href="/totes/new"
                label="New Tote"
                icon={<Plus size={15} />}
                exact
                onClick={onClose}
              />
            </>
          )}

          {session && (
            <SectionNavLink
              href="/todos"
              label="Todos"
              icon={<CheckSquare size={15} />}
              onClick={onClose}
            />
          )}

          {session && (
            <>
              <SectionLabel label="Grocery" />
              <NavLink
                href="/grocery"
                label="All Stores"
                icon={<ShoppingCart size={15} />}
                exact
                onClick={onClose}
              />
              <NavLink
                href="/grocery/history"
                label="History"
                icon={<History size={15} />}
                exact
                onClick={onClose}
              />
            </>
          )}

          <SectionNavLink
            href="/search"
            label="Search"
            icon={<Search size={15} />}
            exact
            onClick={onClose}
          />

          {isAdmin && (
            <>
              <SectionLabel label="Settings" />
              <NavLink
                href="/settings/users"
                label="Users"
                icon={<Users size={15} />}
                onClick={onClose}
              />
              <NavLink
                href="/settings/grocery"
                label="Grocery Settings"
                icon={<Settings size={15} />}
                onClick={onClose}
              />
            </>
          )}
        </nav>

        {/* Version */}
        <div
          className="px-4 py-3 text-xs font-medium shrink-0"
          style={{ color: "var(--accent-orange)" }}
        >
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </div>
      </aside>
    </>
  );
}
