"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ESTADO_STYLES: Record<string, string> = {
  NUEVA: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  EN_REVISION: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  RESUELTA: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  DESCARTADA: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const ESTADO_LABELS: Record<string, string> = {
  NUEVA: "Nueva",
  EN_REVISION: "En Revisión",
  RESUELTA: "Resuelta",
  DESCARTADA: "Descartada",
};

export function EstadoBadge({ estado, className }: { estado: string; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(ESTADO_STYLES[estado] || "", className)}>
      {ESTADO_LABELS[estado] || estado}
    </Badge>
  );
}
