"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SEVERIDAD_STYLES: Record<string, string> = {
  CRITICA: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200",
  ALTA: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 border-orange-200",
  MEDIA: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200",
  BAJA: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200",
};

export function SeveridadBadge({ severidad, className }: { severidad: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn(SEVERIDAD_STYLES[severidad] || "", className)}>
      {severidad}
    </Badge>
  );
}
