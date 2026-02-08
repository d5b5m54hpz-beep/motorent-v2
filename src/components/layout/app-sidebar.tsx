"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bike,
  FileText,
  CreditCard,
  Receipt,
  Users,
  UserCog,
  Bell,
  DollarSign,
  ChevronLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useEffect } from "react";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Motos", href: "/admin/motos", icon: Bike },
  { title: "Contratos", href: "/admin/contratos", icon: FileText },
  { title: "Pagos", href: "/admin/pagos", icon: CreditCard },
  { title: "Facturas", href: "/admin/facturas", icon: Receipt },
  { title: "Clientes", href: "/admin/clientes", icon: Users },
  { title: "Usuarios", href: "/admin/usuarios", icon: UserCog },
  { title: "Alertas", href: "/admin/alertas", icon: Bell },
  { title: "Pricing", href: "/admin/pricing", icon: DollarSign },
];

type Props = {
  user: { name: string; email: string; image?: string | null };
};

export function AppSidebar({ user }: Props) {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebar();

  // Close mobile on route change
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar transition-all duration-300 lg:static lg:z-auto",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo header */}
        <div className="flex h-14 items-center border-b px-4">
          {!isCollapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <Bike className="h-6 w-6 text-sidebar-primary" />
              <span className="text-lg font-bold text-sidebar-foreground">
                MotoRent
              </span>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/admin" className="mx-auto">
              <Bike className="h-6 w-6 text-sidebar-primary" />
            </Link>
          )}

          {/* Close button mobile */}
          <button
            onClick={closeMobile}
            className="ml-auto rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Collapse button desktop */}
          <button
            onClick={toggleCollapse}
            className="ml-auto hidden rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent lg:block"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                isCollapsed && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t p-3">
          <div
            className={cn(
              "flex items-center gap-3",
              isCollapsed && "justify-center"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
              {user.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.name}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
