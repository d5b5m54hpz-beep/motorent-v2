"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SeveridadCount = {
  severidad: string;
  total: number;
};

type ResumenData = {
  totalPorSeveridad: SeveridadCount[];
};

const SEVERIDAD_CONFIG: Record<string, { icon: React.ElementType; bg: string; text: string; border: string; label: string }> = {
  CRITICA: {
    icon: AlertTriangle,
    bg: "bg-red-50 dark:bg-red-950",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    label: "Críticas",
  },
  ALTA: {
    icon: AlertCircle,
    bg: "bg-orange-50 dark:bg-orange-950",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    label: "Altas",
  },
  MEDIA: {
    icon: Info,
    bg: "bg-yellow-50 dark:bg-yellow-950",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
    label: "Medias",
  },
  BAJA: {
    icon: MinusCircle,
    bg: "bg-gray-50 dark:bg-gray-900",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700",
    label: "Bajas",
  },
};

function getCount(data: SeveridadCount[], sev: string): number {
  return data.find((d) => d.severidad === sev)?.total ?? 0;
}

export function ResumenAnomalias({ data }: { data: ResumenData | null }) {
  const severidades = ["CRITICA", "ALTA", "MEDIA", "BAJA_DEFINITIVA"];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {severidades.map((sev) => {
        const config = SEVERIDAD_CONFIG[sev];
        if (!config) return null;
        const Icon = config.icon;
        const count = data ? getCount(data.totalPorSeveridad, sev) : 0;

        return (
          <Card key={sev} className={cn("border", config.border, config.bg)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-2xl font-bold", config.text)}>{count}</p>
                  <p className={cn("text-sm", config.text)}>{config.label}</p>
                </div>
                <Icon className={cn("h-8 w-8 opacity-60", config.text)} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
