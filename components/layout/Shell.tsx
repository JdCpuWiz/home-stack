"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import SideNav from "./SideNav";
import { GroceryActionsProvider } from "@/components/grocery/GroceryActionsContext";

type Props = {
  children: React.ReactNode;
};

export default function Shell({ children }: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Kiosk is full-screen with no nav
  if (pathname.startsWith("/kiosk")) {
    return <>{children}</>;
  }

  return (
    <GroceryActionsProvider>
    <div className="flex flex-col min-h-screen">
      <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 md:hidden"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
    </GroceryActionsProvider>
  );
}
