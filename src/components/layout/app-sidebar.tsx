"use client";

import Link from "next/link";
import Image from "next/image";
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
  Wrench,
  Truck,
  Package,
  BarChart3,
  TrendingUp,
  Calculator,
  Wallet,
  Sparkles,
  Briefcase,
  Factory,
  Building2,
  Settings,
  FileSpreadsheet,
  BookOpen,
  Tag,
  Calendar,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useEffect, useState } from "react";
import { CollapsibleNavSection } from "./collapsible-nav-section";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  badgeText?: string;
};

type Props = {
  user: { name: string; email: string; image?: string | null };
};

export function AppSidebar({ user }: Props) {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebar();
  const [alertasCount, setAlertasCount] = useState(0);

  // Dashboard (direct link, no submenu)
  const dashboardItem: NavItem = {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  };

  // Categories with subitems
  const flota: NavItem[] = [
    { title: "Motos", href: "/admin/motos", icon: Bike },
    { title: "Mantenimientos", href: "/admin/mantenimientos", icon: Wrench },
    { title: "Repuestos", href: "/admin/repuestos", icon: Package },
  ];

  const comercial: NavItem[] = [
    { title: "Clientes", href: "/admin/clientes", icon: Users },
    { title: "Contratos", href: "/admin/contratos", icon: FileText },
    { title: "Pagos", href: "/admin/pagos", icon: CreditCard },
    { title: "Facturas", href: "/admin/facturas", icon: Receipt },
    { title: "Precios", href: "/admin/precios", icon: Tag },
  ];

  const finanzas: NavItem[] = [
    { title: "Finanzas", href: "/admin/finanzas", icon: BarChart3 },
    { title: "Gastos", href: "/admin/gastos", icon: Wallet },
    { title: "Rentabilidad", href: "/admin/finanzas/rentabilidad", icon: TrendingUp },
    { title: "Presupuestos", href: "/admin/presupuestos", icon: Calculator },
    { title: "Pricing", href: "/admin/finanzas/pricing", icon: DollarSign },
  ];

  const contabilidad: NavItem[] = [
    { title: "Facturas Compra", href: "/admin/facturas-compra", icon: FileSpreadsheet },
    { title: "Plan de Cuentas", href: "/admin/cuentas-contables", icon: BookOpen },
    { title: "Asientos Contables", href: "/admin/asientos-contables", icon: Calculator },
    { title: "Reportes", href: "/admin/contabilidad/reportes", icon: BarChart3 },
  ];

  const rrhh: NavItem[] = [
    { title: "Dashboard RRHH", href: "/admin/rrhh", icon: Users },
    { title: "Empleados", href: "/admin/rrhh/empleados", icon: UserCog },
    { title: "Ausencias", href: "/admin/rrhh/ausencias", icon: Calendar },
    { title: "Liquidación", href: "/admin/rrhh/liquidacion", icon: Banknote },
  ];

  const sistema: NavItem[] = [
    { title: "Usuarios", href: "/admin/usuarios", icon: UserCog },
    { title: "Proveedores", href: "/admin/proveedores", icon: Truck },
    { title: "Alertas", href: "/admin/alertas", icon: Bell, badge: alertasCount },
    { title: "Asistente IA", href: "/admin/asistente", icon: Sparkles, badgeText: "IA" },
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

  const isDashboardActive = pathname === dashboardItem.href;

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
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo header */}
        <div className="flex h-14 shrink-0 items-center border-b px-4">
          {!isCollapsed && (
            <Link href="/admin" className="flex items-center transition-opacity hover:opacity-80">
              <Image
                src="/logo.png"
                alt="motolibre"
                width={130}
                height={38}
                className="h-8 w-auto"
                priority
              />
            </Link>
          )}
          {isCollapsed && (
            <Link href="/admin" className="mx-auto transition-opacity hover:opacity-80">
              <Image
                src="/logo-color.png"
                alt="motolibre"
                width={40}
                height={40}
                className="h-10 w-10"
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
        <nav className="flex-1 space-y-2 overflow-y-auto p-2">
          {/* Dashboard - direct link */}
          <Link
            href={dashboardItem.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isDashboardActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? dashboardItem.title : undefined}
          >
            {isDashboardActive && (
              <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
            )}

            <dashboardItem.icon
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                !isDashboardActive && "group-hover:scale-110"
              )}
            />

            {!isCollapsed && (
              <span className="flex-1 tracking-tight">{dashboardItem.title}</span>
            )}
          </Link>

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* Flota */}
          <CollapsibleNavSection
            title="Flota"
            icon={Factory}
            items={flota}
            isCollapsed={isCollapsed}
            storageKey="sidebar-flota-open"
          />

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* Comercial */}
          <CollapsibleNavSection
            title="Comercial"
            icon={Briefcase}
            items={comercial}
            isCollapsed={isCollapsed}
            storageKey="sidebar-comercial-open"
          />

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* Finanzas */}
          <CollapsibleNavSection
            title="Finanzas"
            icon={DollarSign}
            items={finanzas}
            isCollapsed={isCollapsed}
            storageKey="sidebar-finanzas-open"
          />

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* Contabilidad */}
          <CollapsibleNavSection
            title="Contabilidad"
            icon={Building2}
            items={contabilidad}
            isCollapsed={isCollapsed}
            storageKey="sidebar-contabilidad-open"
          />

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* RRHH */}
          <CollapsibleNavSection
            title="RRHH"
            icon={Users}
            items={rrhh}
            isCollapsed={isCollapsed}
            storageKey="sidebar-rrhh-open"
          />

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* Sistema */}
          <CollapsibleNavSection
            title="Sistema"
            icon={Settings}
            items={sistema}
            isCollapsed={isCollapsed}
            storageKey="sidebar-sistema-open"
          />
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t p-3">
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
