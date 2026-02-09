"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
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
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};

type Props = {
  user: { name: string; email: string; image?: string | null };
};

export function AppSidebar({ user }: Props) {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebar();
  const { theme } = useTheme();
  const [alertasCount, setAlertasCount] = useState(0);

  const navItems: NavItem[] = [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { title: "Motos", href: "/admin/motos", icon: Bike },
    { title: "Contratos", href: "/admin/contratos", icon: FileText },
    { title: "Pagos", href: "/admin/pagos", icon: CreditCard },
    { title: "Facturas", href: "/admin/facturas", icon: Receipt },
    { title: "Clientes", href: "/admin/clientes", icon: Users },
    { title: "Usuarios", href: "/admin/usuarios", icon: UserCog },
    { title: "Alertas", href: "/admin/alertas", icon: Bell, badge: alertasCount },
    { title: "Pricing", href: "/admin/pricing", icon: DollarSign },
  ];

  // Fetch alertas count
  useEffect(() => {
    const fetchAlertasCount = async () => {
      try {
        const res = await fetch("/api/alertas?leida=false&limit=1");
        if (res.ok) {
          const data = await res.json();
          setAlertasCount(data.total || 0);
        }
      } catch (error) {
        console.error("Error fetching alertas count:", error);
      }
    };

    fetchAlertasCount();

    // Refresh every 60 seconds
    const interval = setInterval(fetchAlertasCount, 60000);
    return () => clearInterval(interval);
  }, []);

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
            <Link href="/admin" className="flex items-center transition-opacity hover:opacity-80">
              <Image
                src={theme === "dark" ? "/logo-light.svg" : "/logo-dark.svg"}
                alt="motolibre"
                width={120}
                height={35}
                className="h-7 w-auto"
                priority
              />
            </Link>
          )}
          {isCollapsed && (
            <Link href="/admin" className="mx-auto transition-opacity hover:opacity-80">
              <Image
                src="/logo-color.svg"
                alt="motolibre"
                width={28}
                height={28}
                className="h-7 w-7"
                priority
              />
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
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
                )}

                <item.icon className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  !isActive && "group-hover:scale-110"
                )} />

                {!isCollapsed && (
                  <>
                    <span className="flex-1 tracking-tight">{item.title}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge
                        variant="destructive"
                        className="h-5 min-w-[20px] px-1 text-[10px] font-bold"
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </Badge>
                    )}
                  </>
                )}

                {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {item.badge > 9 ? "9+" : item.badge}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/50",
              isCollapsed && "justify-center"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground shadow-sm">
              {user.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium tracking-tight text-sidebar-foreground">
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
