"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = { pct: number; objetivo?: number; className?: string };

export function MargenBadge({ pct, objetivo = 25, className }: Props) {
  const estado = pct >= objetivo ? "ok" : pct >= 10 ? "bajo" : "critico";
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-mono",
        estado === "ok" && "border-teal-500/50 bg-teal-500/10 text-teal-600 dark:text-teal-400",
        estado === "bajo" && "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
        estado === "critico" && "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400",
        className
      )}
    >
      {pct.toFixed(1)}%
    </Badge>
  );
}
