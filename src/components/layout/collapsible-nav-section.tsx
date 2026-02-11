"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  badgeText?: string;
};

type Props = {
  title: string;
  icon: React.ElementType;
  items: NavItem[];
  isCollapsed: boolean;
  storageKey: string;
};

export function CollapsibleNavSection({
  title,
  icon: Icon,
  items,
  isCollapsed,
  storageKey,
}: Props) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Check if any item in this section is active
  const hasActiveItem = items.some(
    (item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
  );

  // Load collapsed state from localStorage and auto-expand if has active item
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      setIsOpen(stored === "true");
    } else if (hasActiveItem) {
      setIsOpen(true);
    }
  }, [storageKey, hasActiveItem]);

  // Save state to localStorage
  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem(storageKey, String(newState));
  };

  // If sidebar is collapsed, show only icons
  if (isCollapsed) {
    return (
      <div className="space-y-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
              title={item.title}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
              )}

              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  !isActive && "group-hover:scale-110"
                )}
              />

              {item.badge !== undefined && item.badge > 0 && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {item.badge > 9 ? "9+" : item.badge}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Category header */}
      <button
        onClick={toggleOpen}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Items */}
      <div
        className={cn(
          "grid transition-all duration-200",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-1 pb-1 pl-2">
            {items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
                  )}

                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      !isActive && "group-hover:scale-110"
                    )}
                  />

                  <span className="flex-1 tracking-tight">{item.title}</span>

                  {item.badgeText && (
                    <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-500">
                      {item.badgeText}
                    </span>
                  )}

                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 min-w-[20px] px-1 text-[10px] font-bold"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
