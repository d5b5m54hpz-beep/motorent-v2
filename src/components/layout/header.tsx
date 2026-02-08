"use client";

import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Menu, Sun, Moon, LogOut, Search, User } from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useState } from "react";
import Link from "next/link";

type Props = {
  user: { name: string; email: string; image?: string | null; role: string };
};

export function Header({ user }: Props) {
  const { toggleMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Mobile menu button */}
      <button
        onClick={toggleMobile}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search placeholder (⌘K) */}
      <div className="flex flex-1 items-center">
        <button className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground hover:bg-muted/60 md:max-w-xs">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Buscar...</span>
          <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {user.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <span className="hidden text-sm font-medium md:inline">
              {user.name}
            </span>
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-1 w-56 rounded-md border bg-popover p-1 shadow-md">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
                    {user.role}
                  </span>
                </div>
                <div className="my-1 h-px bg-border" />
                <Link
                  href="/perfil"
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Mi perfil
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login-admin" })}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm text-destructive hover:bg-accent"
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
