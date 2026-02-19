"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Wrench, RefreshCw } from "lucide-react";
import { KPICard } from "./KPICard";
import { SugerenciasPanel } from "./SugerenciasPanel";
import { MargenBadge } from "./MargenBadge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PrecioRow = {
  id: string;
  modeloMoto: string;
  margenPct: number;
  margenObjetivoPct: number;
  precioConDescuento: number;
  precioManual?: number | null;
  plan: { nombre: string; codigo: string };
};

type ConfigData = {
  tipoCambioUSD: number;
  tipoCambioUpdatedAt: string | null;
  mantenimientoTotal: number;
  seguroTotal: number;
};

const ARS = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export function DashboardTab() {
  const [precios, setPrecios] = useState<PrecioRow[]>([]);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/pricing-engine/precios").then((r) => r.json()),
      fetch("/api/pricing-engine/config").then((r) => r.json()),
    ]).then(([p, c]) => {
      setPrecios(p);
      setConfig(c);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-60 rounded-lg" />
      </div>
    );
  }

  // KPIs
  const margenPromedio = precios.length > 0
    ? precios.reduce((acc, p) => acc + Number(p.margenPct), 0) / precios.length
    : 0;

  const revenuePotencial = precios.reduce((acc, p) => {
    const precio = Number(p.precioManual ?? p.precioConDescuento);
    return acc + precio;
  }, 0);

  const costoOperFijo = config
    ? Number(config.mantenimientoTotal) + Number(config.seguroTotal)
    : 0;

  const tcDesactualizado = !config?.tipoCambioUpdatedAt ||
    (Date.now() - new Date(config.tipoCambioUpdatedAt).getTime()) > 7 * 86400000;

  // Chart data: group by modelo
  const modelosSet = [...new Set(precios.map((p) => p.modeloMoto))];
  const chartData = modelosSet.map((modelo) => {
    const row: Record<string, number | string> = { modelo: modelo.length > 12 ? modelo.slice(0, 12) + "…" : modelo };
    precios.filter((p) => p.modeloMoto === modelo).forEach((p) => {
      row[p.plan.nombre] = Number(p.margenPct);
    });
    return row;
  });

  const planNames = [...new Set(precios.map((p) => p.plan.nombre))];
  const COLORS = ["#23e0ff", "#38B2AC", "#5CE1E6", "#1A6B6A"];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Margen Promedio"
          value={`${margenPromedio.toFixed(1)}%`}
          subtitle={`Objetivo: 25%`}
          icon={TrendingUp}
          badge={margenPromedio < 10 ? "CRÍTICO" : margenPromedio < 25 ? "BAJO" : "OK"}
          badgeVariant={margenPromedio < 10 ? "destructive" : "secondary"}
        />
        <KPICard
          title="Revenue Potencial"
          value={ARS(revenuePotencial)}
          subtitle={`${precios.length} precios activos`}
          icon={DollarSign}
        />
        <KPICard
          title="Costo Operativo"
          value={ARS(costoOperFijo)}
          subtitle="Seguro + Mantenimiento"
          icon={Wrench}
        />
        <KPICard
          title="Tipo de Cambio"
          value={config ? ARS(config.tipoCambioUSD) : "—"}
          subtitle="USD Blue"
          icon={RefreshCw}
          badge={tcDesactualizado ? "+7 días" : "Actualizado"}
          badgeVariant={tcDesactualizado ? "destructive" : "secondary"}
        />
      </div>

      {/* Sugerencias IA */}
      <SugerenciasPanel />

      {/* Tabla resumen */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Resumen Modelo × Plan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Modelo</th>
                  {planNames.map((n) => (
                    <th key={n} className="px-4 py-2 text-center font-medium">{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelosSet.map((modelo) => (
                  <tr key={modelo} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{modelo}</td>
                    {planNames.map((planNombre) => {
                      const p = precios.find((pr) => pr.modeloMoto === modelo && pr.plan.nombre === planNombre);
                      if (!p) return <td key={planNombre} className="px-4 py-2 text-center text-muted-foreground">—</td>;
                      return (
                        <td key={planNombre} className="px-4 py-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono">{ARS(Number(p.precioManual ?? p.precioConDescuento))}</span>
                            <div className="flex items-center gap-1">
                              <MargenBadge pct={Number(p.margenPct)} objetivo={Number(p.margenObjetivoPct)} />
                              {p.precioManual && <Badge variant="outline" className="text-xs">Manual</Badge>}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {modelosSet.length === 0 && (
                  <tr><td colSpan={planNames.length + 1} className="px-4 py-8 text-center text-muted-foreground">Sin precios configurados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* BarChart márgenes */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Márgenes por Modelo y Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="modelo" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, ""]} />
                <Legend />
                <ReferenceLine y={25} stroke="#23e0ff" strokeDasharray="4 4" label={{ value: "Objetivo", fill: "#23e0ff", fontSize: 10 }} />
                <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Crítico", fill: "#ef4444", fontSize: 10 }} />
                {planNames.map((name, i) => (
                  <Bar key={name} dataKey={name} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={40} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
