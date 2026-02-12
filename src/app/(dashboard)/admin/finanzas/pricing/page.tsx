"use client";

import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type MotoPricing = {
  id: string;
  marca: string;
  modelo: string;
  patente: string;
  costoOperativoMensual: number;
  precioActual: number;
  precioSugeridoMensual: number;
  precioSugeridoDiario: number;
  precioSugeridoSemanal: number;
  diferencia: number;
  puntoEquilibrio: number;
  status: "subpreciada" | "ok" | "sobrepreciada";
};

type PricingData = {
  data: MotoPricing[];
  ocupacionFlota: number;
  precioPromedioFlota: number;
  margenPromedioActual: number;
  motosSubpreciadas: number;
};

const statusConfig = {
  subpreciada: {
    label: "Subpreciada",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  ok: {
    label: "OK",
    className: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  },
  sobrepreciada: {
    label: "Sobrepreciada",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
};

export default function PricingPage() {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [margen, setMargen] = useState(30);

  const fetchPricing = useCallback(async (m: number) => {
    try {
      const res = await fetch(`/api/finanzas/pricing?margen=${m}`);
      if (res.ok) {
        const d = await res.json();
        setPricing(d);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing(margen);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMargenChange = (value: number[]) => {
    const newMargen = value[0];
    setMargen(newMargen);
    fetchPricing(newMargen);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Pricing Intelligence</h1></div>
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  const data = pricing?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pricing Intelligence</h1>
        <p className="text-muted-foreground">Análisis de precios y margen por moto</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Margen Promedio Actual</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{pricing?.margenPromedioActual ?? 0}%</p>
          <p className="text-xs text-muted-foreground">Sobre costo operativo</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Motos Subpreciadas</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">{pricing?.motosSubpreciadas ?? 0}</p>
          <p className="text-xs text-muted-foreground">Precio menor al sugerido</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Precio Promedio Flota</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{formatCurrency(pricing?.precioPromedioFlota ?? 0)}</p>
          <p className="text-xs text-muted-foreground">Mensual</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Ocupación Flota</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{pricing?.ocupacionFlota ?? 0}%</p>
          <p className="text-xs text-muted-foreground">Motos alquiladas</p>
        </div>
      </div>

      {/* Margin Slider */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Margen Deseado</h3>
            <p className="text-sm text-muted-foreground">Ajustá el margen para recalcular precios sugeridos</p>
          </div>
          <span className="text-2xl font-bold text-[#23e0ff]">{margen}%</span>
        </div>
        <Slider
          value={[margen]}
          onValueCommit={handleMargenChange}
          min={10}
          max={50}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>10%</span>
          <span>50%</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Moto</TableHead>
              <TableHead>Costo Operativo</TableHead>
              <TableHead>Precio Actual</TableHead>
              <TableHead>Precio Sugerido</TableHead>
              <TableHead>Diferencia</TableHead>
              <TableHead>Equilibrio</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Sin datos</TableCell>
              </TableRow>
            ) : (
              data.map((m) => {
                const cfg = statusConfig[m.status];
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{m.marca} {m.modelo}</p>
                        <p className="text-xs text-muted-foreground font-mono">{m.patente}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(m.costoOperativoMensual)}/mes</TableCell>
                    <TableCell className="font-medium">{formatCurrency(m.precioActual)}/mes</TableCell>
                    <TableCell className="text-[#23e0ff] font-medium">{formatCurrency(m.precioSugeridoMensual)}/mes</TableCell>
                    <TableCell>
                      <span className={`font-medium ${m.diferencia >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"}`}>
                        {m.diferencia >= 0 ? "+" : ""}{formatCurrency(m.diferencia)}
                      </span>
                    </TableCell>
                    <TableCell>{m.puntoEquilibrio} días</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.className}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
