"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Package, Plus, CheckSquare, Search, Users, X, ShoppingCart, History,
  Settings, CheckCheck, LogOut, LogIn, List, Trash2, UtensilsCrossed,
  LayoutDashboard, Truck, Mail, DollarSign, ChevronDown, ScanLine,
} from "lucide-react";
import { useGroceryActions } from "@/components/grocery/GroceryActionsContext";

type Props = { open: boolean; onClose: () => void };
type NavItemProps = { href: string; label: string; icon: React.ReactNode; exact?: boolean; onClick?: () => void };
type Store = { id: number; name: string; activeItemCount: number };

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
        borderLeft: isActive ? "2px solid var(--accent-orange)" : "2px solid transparent",
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

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
        borderLeft: isActive ? "2px solid var(--accent-orange)" : "2px solid transparent",
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function SectionHeader({
  label,
  sectionKey,
  open,
  onToggle,
}: {
  label: string;
  sectionKey: string;
  open: boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(sectionKey)}
      className="w-full flex items-center gap-2 mt-5 mb-1 pr-4 group transition-opacity hover:opacity-80"
      style={{ paddingLeft: "0.75rem" }}
    >
      <span
        className="text-xs font-bold uppercase tracking-wider shrink-0"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--bg-300)" }} />
      <ChevronDown
        size={12}
        className="shrink-0 transition-transform duration-200"
        style={{
          color: "var(--text-secondary)",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
        }}
      />
    </button>
  );
}

function NavActionButton({
  label, icon, onClick, danger,
}: {
  label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean;
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
  const isAdmin = session && (session.user as { role?: string }).role === "ADMIN";
  const [stores, setStores] = useState<Store[]>([]);
  const { actions } = useGroceryActions();
  const router = useRouter();

  const [sections, setSections] = useState<Record<string, boolean>>({
    totes: false,
    todos: false,
    packages: false,
    email: false,
    finance: false,
    recipes: false,
    grocery: false,
    pantry: false,
    settings: false,
  });

  function toggleSection(key: string) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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
          "md:static md:z-auto md:translate-x-0 md:h-screen md:sticky md:top-0",
          "transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ backgroundColor: "var(--bg-100)", borderRight: "1px solid var(--bg-200)" }}
      >
        {/* Brand + mobile close */}
        <div
          className="relative flex items-center justify-center py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--bg-200)" }}
        >
          <Link href="/" onClick={onClose} aria-label="HomeStack home" className="block w-full">
            <img src="/logo.png" alt="HomeStack" style={{ width: "100%", height: "auto", borderRadius: "6px" }} />
          </Link>
          <button className="md:hidden btn-secondary btn-sm p-1.5 absolute right-3 top-1/2 -translate-y-1/2" onClick={onClose} aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {session && (
            <SectionNavLink href="/" label="Dashboard" icon={<LayoutDashboard size={15} />} exact onClick={onClose} />
          )}

          <SectionNavLink href="/search" label="Search" icon={<Search size={15} />} exact onClick={onClose} />

          {session && (
            <>
              <SectionHeader label="Totes" sectionKey="totes" open={sections.totes} onToggle={toggleSection} />
              {sections.totes && (
                <>
                  <NavLink href="/totes" label="All Totes" icon={<Package size={15} />} exact onClick={onClose} />
                  <NavLink href="/totes/new" label="New Tote" icon={<Plus size={15} />} exact onClick={onClose} />
                </>
              )}
            </>
          )}

          {session && (
            <>
              <SectionHeader label="Todos" sectionKey="todos" open={sections.todos} onToggle={toggleSection} />
              {sections.todos && (
                <>
                  <NavLink href="/todos" label="View List" icon={<List size={15} />} onClick={onClose} />
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
            </>
          )}

          {session && (
            <>
              <SectionHeader label="Packages" sectionKey="packages" open={sections.packages} onToggle={toggleSection} />
              {sections.packages && (
                <NavLink href="/packages" label="Deliveries" icon={<Truck size={15} />} onClick={onClose} />
              )}
            </>
          )}

          {session && (
            <>
              <SectionHeader label="Email" sectionKey="email" open={sections.email} onToggle={toggleSection} />
              {sections.email && (
                <NavLink href="/email-digest" label="Daily Digest" icon={<Mail size={15} />} onClick={onClose} />
              )}
            </>
          )}

          {session && (
            <>
              <SectionHeader label="Finance" sectionKey="finance" open={sections.finance} onToggle={toggleSection} />
              {sections.finance && (
                <NavLink href="/finance" label="Budget" icon={<DollarSign size={15} />} exact onClick={onClose} />
              )}
            </>
          )}

          {session && (
            <>
              <SectionHeader label="Recipes" sectionKey="recipes" open={sections.recipes} onToggle={toggleSection} />
              {sections.recipes && (
                <>
                  <NavLink href="/recipes" label="All Recipes" icon={<UtensilsCrossed size={15} />} exact onClick={onClose} />
                  <NavLink href="/recipes/new" label="New Recipe" icon={<Plus size={15} />} exact onClick={onClose} />
                </>
              )}
            </>
          )}

          {session && (
            <>
              <SectionHeader label="Grocery" sectionKey="grocery" open={sections.grocery} onToggle={toggleSection} />
              {sections.grocery && (
                <>
                  <NavLink href="/grocery" label="All Lists" icon={<ShoppingCart size={15} />} exact onClick={onClose} />
                  {stores.map((store) => (
                    <NavLink
                      key={store.id}
                      href={`/grocery/${store.id}`}
                      label={store.activeItemCount > 0 ? `${store.name} (${store.activeItemCount})` : store.name}
                      icon={<ShoppingCart size={13} />}
                      onClick={onClose}
                    />
                  ))}
                  <NavLink href="/grocery/history" label="History" icon={<History size={15} />} exact onClick={onClose} />
                  {actions && (
                    <NavActionButton
                      label="Complete Trip"
                      icon={<CheckCheck size={15} />}
                      onClick={() => { onClose(); actions.completeTrip(); }}
                    />
                  )}
                </>
              )}
            </>
          )}

          {session && (
            <>
              <SectionHeader label="Pantry" sectionKey="pantry" open={sections.pantry} onToggle={toggleSection} />
              {sections.pantry && (
                <NavLink href="/pantry" label="Inventory" icon={<ScanLine size={15} />} exact onClick={onClose} />
              )}
            </>
          )}

          {isAdmin && (
            <>
              <SectionHeader label="Settings" sectionKey="settings" open={sections.settings} onToggle={toggleSection} />
              {sections.settings && (
                <>
                  <NavLink href="/settings/users" label="Users" icon={<Users size={15} />} onClick={onClose} />
                  <NavLink href="/settings/grocery" label="Grocery Settings" icon={<Settings size={15} />} onClick={onClose} />
                  <NavLink href="/settings/email-digest" label="Email Settings" icon={<Mail size={15} />} onClick={onClose} />
                  <NavLink href="/settings/finance" label="Finance Settings" icon={<DollarSign size={15} />} onClick={onClose} />
                  <NavLink href="/settings/pantry" label="Pantry Settings" icon={<ScanLine size={15} />} onClick={onClose} />
                </>
              )}
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
              style={{ color: "var(--text-secondary)", backgroundColor: "transparent", borderLeft: "2px solid transparent" }}
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="nav-link flex items-center gap-2.5 py-1.5 text-sm rounded-md pl-4 pr-3 transition-colors"
              style={{ color: "var(--text-secondary)", backgroundColor: "transparent", borderLeft: "2px solid transparent" }}
            >
              <LogIn size={15} />
              <span>Sign in</span>
            </Link>
          )}
          <div className="px-2 pt-1 text-xs font-medium" style={{ color: "var(--accent-orange)" }}>
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </div>
        </div>
      </aside>
    </>
  );
}
