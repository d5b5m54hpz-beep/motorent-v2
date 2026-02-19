"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  badge?: string;
  badgeVariant?: "default" | "destructive" | "secondary" | "outline";
  className?: string;
};

export function KPICard({ title, value, subtitle, icon: Icon, badge, badgeVariant = "secondary", className }: Props) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="rounded-md bg-primary/10 p-2">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            {badge && <Badge variant={badgeVariant} className="text-xs">{badge}</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
