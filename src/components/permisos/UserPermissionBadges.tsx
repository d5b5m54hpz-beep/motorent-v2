"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProfileInfo = {
  id: string;
  name: string;
};

const PROFILE_COLORS: Record<string, string> = {
  "Administrador": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "Contador": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "Operador Flota": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Operador Comercial": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  "RRHH": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "Auditor": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  "Viewer": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export function UserPermissionBadges({
  profiles,
  maxVisible = 3,
}: {
  profiles: ProfileInfo[];
  maxVisible?: number;
}) {
  const visible = profiles.slice(0, maxVisible);
  const remaining = profiles.length - maxVisible;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((p) => (
        <Badge
          key={p.id}
          variant="secondary"
          className={cn("text-xs", PROFILE_COLORS[p.name] || "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300")}
        >
          {p.name}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remaining}
        </Badge>
      )}
      {profiles.length === 0 && (
        <span className="text-xs text-muted-foreground">Sin perfiles</span>
      )}
    </div>
  );
}
