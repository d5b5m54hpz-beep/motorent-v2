"use client";

import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Menu, Sun, Moon, LogOut, Search, User, Bell, ChevronRight } from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

type Props = {
  user: { name: string; email: string; image?: string | null; role: string };
};

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

export function Header({ user }: Props) {
  const { toggleMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
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

      {/* Search placeholder (⌘K) - mobile/tablet */}
      <div className="flex flex-1 items-center lg:hidden">
        <button className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:max-w-xs">
          <Search className="h-4 w-4 text-muted-foreground/70" />
          <span className="text-muted-foreground/70">Buscar...</span>
          <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </button>
      </div>

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

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg p-2 text-sm transition-colors hover:bg-accent"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
              {user.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <span className="hidden text-sm font-medium tracking-tight md:inline">
              {user.name}
            </span>
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-2 w-60 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
                <div className="px-3 py-2.5">
                  <p className="text-sm font-semibold tracking-tight">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {user.role}
                  </span>
                </div>
                <div className="my-1 h-px bg-border" />
                <Link
                  href="/perfil"
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Mi perfil
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login-admin" })}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-accent"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
