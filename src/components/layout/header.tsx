"use client";

import { useTheme } from "next-themes";
import { Menu, Sun, Moon, Search, Bell, ChevronRight } from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CommandPalette } from "@/components/command-palette";

// Map routes to breadcrumb labels
const routeLabels: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/motos": "Motos",
  "/admin/contratos": "Contratos",
  "/admin/pagos": "Pagos",
  "/admin/facturas": "Facturas",
  "/admin/clientes": "Clientes",
  "/admin/usuarios": "Usuarios",
  "/admin/alertas": "Alertas",
  "/admin/pricing": "Pricing",
};

export function Header() {
  const { toggleMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [alertasCount, setAlertasCount] = useState(0);
  const pathname = usePathname();

  // Generate breadcrumbs
  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const path = `/${pathParts.slice(0, index + 1).join("/")}`;
    return {
      label: routeLabels[path] || part,
      path,
      isLast: index === pathParts.length - 1,
    };
  });

  // Fetch alertas count
  useEffect(() => {
    const fetchAlertasCount = async () => {
      try {
        let totalAlertas = 0;

        // Alertas generales
        const resAlertas = await fetch("/api/alertas?leida=false&limit=1");
        if (resAlertas.ok) {
          const dataAlertas = await resAlertas.json();
          totalAlertas += dataAlertas.total || 0;
        }

        // Alertas de pricing (márgenes bajos, críticos, etc.)
        const resPricing = await fetch("/api/pricing-repuestos/dashboard-margenes?periodo=30d");
        if (resPricing.ok) {
          const dataPricing = await resPricing.json();
          const alertasPricing = dataPricing.alertas?.length || 0;
          totalAlertas += alertasPricing;
        }

        setAlertasCount(totalAlertas);
      } catch (error) {
        console.error("Error fetching alertas count:", error);
      }
    };

    fetchAlertasCount();

    // Refresh every 60 seconds
    const interval = setInterval(fetchAlertasCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 md:px-6">
      {/* Mobile menu button */}
      <button
        onClick={toggleMobile}
        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs (desktop) */}
      <div className="hidden flex-1 items-center gap-2 lg:flex">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
            {crumb.isLast ? (
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.path}
                className="text-sm font-medium tracking-tight text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Search (⌘K) - mobile/tablet */}
      <div className="flex flex-1 items-center lg:hidden">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:max-w-xs"
        >
          <Search className="h-4 w-4 text-muted-foreground/70" />
          <span className="text-muted-foreground/70">Buscar...</span>
          <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Command Palette */}
      <CommandPalette />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <Link
          href="/admin/alertas"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Alertas"
        >
          <Bell className="h-4 w-4" />
          {alertasCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-[16px] px-1 text-[9px] font-bold"
            >
              {alertasCount > 99 ? "99+" : alertasCount}
            </Badge>
          )}
        </Link>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Cambiar tema"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>
      </div>
    </header>
  );
}
