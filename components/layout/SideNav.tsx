"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Package, Plus, CheckSquare, Search, Users, X, ShoppingCart, History, Settings, CheckCheck, LogOut, LogIn, List, Trash2, UtensilsCrossed, LayoutDashboard, Truck } from "lucide-react";
import { useGroceryActions } from "@/components/grocery/GroceryActionsContext";

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

type Store = { id: number; name: string; activeItemCount: number };

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

/** Action button styled like a nav link */
function NavActionButton({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="nav-link w-full text-left flex items-center gap-2.5 py-1.5 text-sm rounded-md mx-2 pl-4 pr-3 transition-colors"
      style={{
        color: danger ? "#ef4444" : "var(--text-secondary)",
        backgroundColor: "transparent",
        borderLeft: "2px solid transparent",
        width: "calc(100% - 1rem)",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function SideNav({ open, onClose }: Props) {
  const { data: session } = useSession();
  const isAdmin =
    session && (session.user as { role?: string }).role === "ADMIN";
  const [stores, setStores] = useState<Store[]>([]);
  const { actions } = useGroceryActions();
  const router = useRouter();

  useEffect(() => {
    if (!session) return;
    fetch("/api/grocery/stores")
      .then((r) => r.json())
      .then((data: Store[]) => setStores(data))
      .catch(() => {});
  }, [session]);

  return (
    <>
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
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--bg-200)" }}
        >
          <Link href="/" onClick={onClose} aria-label="HomeStack home">
            <img src="/logo.png" alt="HomeStack" style={{ width: "128px", height: "auto", borderRadius: "6px" }} />
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
            <SectionNavLink
              href="/"
              label="Dashboard"
              icon={<LayoutDashboard size={15} />}
              exact
              onClick={onClose}
            />
          )}

          {session && (
            <>
              <SectionLabel label="Totes" />
              <NavLink
                href="/totes"
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
            <>
              <SectionLabel label="Todos" />
              <NavLink
                href="/todos"
                label="View List"
                icon={<List size={15} />}
                onClick={onClose}
              />
              <NavActionButton
                label="Clear List"
                icon={<Trash2 size={15} />}
                danger
                onClick={async () => {
                  if (!confirm("Clear all todos?")) return;
                  await fetch("/api/todos", { method: "DELETE" });
                  onClose();
                  router.push("/todos");
                  router.refresh();
                }}
              />
            </>
          )}

          {session && (
            <>
              <SectionLabel label="Packages" />
              <NavLink
                href="/packages"
                label="Deliveries"
                icon={<Truck size={15} />}
                onClick={onClose}
              />
            </>
          )}

          {session && (
            <>
              <SectionLabel label="Recipes" />
              <NavLink
                href="/recipes"
                label="All Recipes"
                icon={<UtensilsCrossed size={15} />}
                exact
                onClick={onClose}
              />
              <NavLink
                href="/recipes/new"
                label="New Recipe"
                icon={<Plus size={15} />}
                exact
                onClick={onClose}
              />
            </>
          )}

          {session && (
            <>
              <SectionLabel label="Grocery" />
              <NavLink
                href="/grocery"
                label="All Lists"
                icon={<ShoppingCart size={15} />}
                exact
                onClick={onClose}
              />
              {stores.map((store) => (
                <NavLink
                  key={store.id}
                  href={`/grocery/${store.id}`}
                  label={store.activeItemCount > 0 ? `${store.name} (${store.activeItemCount})` : store.name}
                  icon={<ShoppingCart size={13} />}
                  onClick={onClose}
                />
              ))}
              <NavLink
                href="/grocery/history"
                label="History"
                icon={<History size={15} />}
                exact
                onClick={onClose}
              />
              {actions && (
                <NavActionButton
                  label={`Complete Trip`}
                  icon={<CheckCheck size={15} />}
                  onClick={() => {
                    onClose();
                    actions.completeTrip();
                  }}
                />
              )}
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

        {/* Bottom: sign out / sign in + version */}
        <div
          className="shrink-0 px-2 py-3 flex flex-col gap-1"
          style={{ borderTop: "1px solid var(--bg-200)" }}
        >
          {session ? (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="nav-link w-full text-left flex items-center gap-2.5 py-1.5 text-sm rounded-md pl-4 pr-3 transition-colors"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "transparent",
                borderLeft: "2px solid transparent",
              }}
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="nav-link flex items-center gap-2.5 py-1.5 text-sm rounded-md pl-4 pr-3 transition-colors"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "transparent",
                borderLeft: "2px solid transparent",
              }}
            >
              <LogIn size={15} />
              <span>Sign in</span>
            </Link>
          )}
          <div
            className="px-2 pt-1 text-xs font-medium"
            style={{ color: "var(--accent-orange)" }}
          >
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </div>
        </div>
      </aside>
    </>
  );
}
