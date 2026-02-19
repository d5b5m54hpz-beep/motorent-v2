"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Info, Clock, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Sugerencia = {
  tipo: "CRITICO" | "ADVERTENCIA" | "ALERTA_TC" | "PENDIENTE" | "REVISAR" | "INFO";
  modeloMoto?: string;
  planCodigo?: string;
  mensaje: string;
  accion?: string;
};

type SugerenciasData = { total: number; criticos: number; sugerencias: Sugerencia[] };

const ICON_MAP = {
  CRITICO: AlertCircle,
  ADVERTENCIA: AlertTriangle,
  ALERTA_TC: Clock,
  PENDIENTE: RefreshCw,
  REVISAR: Info,
  INFO: CheckCircle2,
};

const COLOR_MAP = {
  CRITICO: "text-red-500",
  ADVERTENCIA: "text-yellow-500",
  ALERTA_TC: "text-orange-500",
  PENDIENTE: "text-blue-500",
  REVISAR: "text-purple-500",
  INFO: "text-teal-500",
};

export function SugerenciasPanel() {
  const [data, setData] = useState<SugerenciasData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pricing-engine/sugerencias");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch_(); }, []);

  if (loading) return <Skeleton className="h-32 rounded-lg" />;
  if (!data || data.total === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <CheckCircle2 className="h-5 w-5 text-teal-500" />
          Sin sugerencias pendientes. Todos los precios están en orden.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Sugerencias ({data.total})
            {data.criticos > 0 && (
              <Badge variant="destructive" className="text-xs">{data.criticos} críticos</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetch_}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2 max-h-64 overflow-y-auto">
        {data.sugerencias.slice(0, 10).map((s, i) => {
          const Icon = ICON_MAP[s.tipo];
          return (
            <div key={i} className="flex items-start gap-3 rounded-md border p-2.5 text-sm">
              <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", COLOR_MAP[s.tipo])} />
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-relaxed">{s.mensaje}</p>
                {s.accion && (
                  <p className="text-xs text-primary mt-1 font-medium">{s.accion}</p>
                )}
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{s.tipo}</Badge>
            </div>
          );
        })}
        {data.total > 10 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{data.total - 10} más sugerencias
          </p>
        )}
      </CardContent>
    </Card>
  );
}
