"use client";

import { useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";
import { Header } from "./header";

type Props = {
  children: React.ReactNode;
};

export function DashboardContent({ children }: Props) {
  const { isCollapsed } = useSidebar();

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col transition-all duration-300",
        isCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}
    >
      <Header />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
