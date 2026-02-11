"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

type FlujoData = {
  periodo: { desde: string; hasta: string; dias: number };
  resumen: {
    totalIngresos: number;
    totalGastos: number;
    flujoNetoTotal: number;
    promedioIngresosDiario: number;
    promedioGastosDiario: number;
    saldoFinal: number;
  };
  flujo: Array<{
    fecha: string;
    ingresos: number;
    gastos: number;
    flujoNeto: number;
    saldoAcumulado: number;
    esProyeccion: boolean;
  }>;
  proyeccion: Array<{
    fecha: string;
    ingresos: number;
    gastos: number;
    flujoNeto: number;
    saldoAcumulado: number;
    esProyeccion: boolean;
  }>;
};

const PERIODOS = [
  { value: "30", label: "Últimos 30 días" },
  { value: "60", label: "Últimos 60 días" },
  { value: "90", label: "Últimos 90 días" },
];

export default function FlujoCajaPage() {
  const [data, setData] = useState<FlujoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dias, setDias] = useState("90");
  const [mostrarProyeccion, setMostrarProyeccion] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/finanzas/flujo-caja?dias=${dias}&proyectar=${mostrarProyeccion}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [dias, mostrarProyeccion]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Flujo de Caja</h1>
        </div>
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Flujo de Caja</h1>
        <p className="text-muted-foreground">Error al cargar datos.</p>
      </div>
    );
  }

  const chartData = [
    ...data.flujo,
    ...(mostrarProyeccion ? data.proyeccion : []),
  ];

  const kpis = [
    {
      label: "Total Ingresos",
      value: formatCurrency(data.resumen.totalIngresos),
      icon: TrendingUp,
      iconClass: "text-green-500",
      subtitle: `${formatCurrency(data.resumen.promedioIngresosDiario)}/día`,
    },
    {
      label: "Total Gastos",
      value: formatCurrency(data.resumen.totalGastos),
      icon: TrendingDown,
      iconClass: "text-red-500",
      subtitle: `${formatCurrency(data.resumen.promedioGastosDiario)}/día`,
    },
    {
      label: "Flujo Neto",
      value: formatCurrency(data.resumen.flujoNetoTotal),
      icon: DollarSign,
      iconClass:
        data.resumen.flujoNetoTotal >= 0 ? "text-green-500" : "text-red-500",
      subtitle: data.resumen.flujoNetoTotal >= 0 ? "Positivo" : "Negativo",
    },
    {
      label: "Saldo Actual",
      value: formatCurrency(data.resumen.saldoFinal),
      icon: Activity,
      iconClass: data.resumen.saldoFinal >= 0 ? "text-[#23e0ff]" : "text-red-500",
      subtitle: `Período: ${data.periodo.dias} días`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Flujo de Caja</h1>
        <p className="text-muted-foreground">
          Análisis de ingresos y gastos diarios con proyección
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={dias} onValueChange={setDias}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="proyeccion"
              checked={mostrarProyeccion}
              onCheckedChange={setMostrarProyeccion}
            />
            <Label htmlFor="proyeccion" className="cursor-pointer">
              Mostrar proyección (30 días)
            </Label>
          </div>

          <div className="text-sm text-muted-foreground ml-auto">
            {data.periodo.desde} al {data.periodo.hasta}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
              <kpi.icon className={`h-5 w-5 ${kpi.iconClass}`} />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">
          Saldo Acumulado{" "}
          {mostrarProyeccion && (
            <span className="text-sm text-muted-foreground font-normal">
              (línea punteada = proyección)
            </span>
          )}
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="fecha"
              className="text-xs"
              interval={Math.floor(chartData.length / 10)}
            />
            <YAxis
              className="text-xs"
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
              }}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />

            {/* Histórico */}
            <Area
              type="monotone"
              dataKey="saldoAcumulado"
              name="Saldo Acumulado"
              stroke="#23e0ff"
              fill="#23e0ff"
              fillOpacity={0.3}
              strokeWidth={2}
              connectNulls
              data={data.flujo}
            />

            {/* Proyección */}
            {mostrarProyeccion && data.proyeccion.length > 0 && (
              <Area
                type="monotone"
                dataKey="saldoAcumulado"
                name="Proyección"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
                connectNulls
                data={[
                  data.flujo[data.flujo.length - 1],
                  ...data.proyeccion,
                ]}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla Detallada (últimos 30 días) */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Detalle Diario (últimos 30 días)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium">Fecha</th>
                <th className="px-4 py-3 text-right text-xs font-medium">Ingresos</th>
                <th className="px-4 py-3 text-right text-xs font-medium">Gastos</th>
                <th className="px-4 py-3 text-right text-xs font-medium">Flujo Neto</th>
                <th className="px-4 py-3 text-right text-xs font-medium">Saldo Acum.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.flujo.slice(-30).map((dia, i) => (
                <tr key={i} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm">{dia.fecha}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
                    {formatCurrency(dia.ingresos)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">
                    {formatCurrency(dia.gastos)}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-medium ${
                      dia.flujoNeto >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {dia.flujoNeto >= 0 ? "+" : ""}
                    {formatCurrency(dia.flujoNeto)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">
                    {formatCurrency(dia.saldoAcumulado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proyección Table (si está habilitada) */}
      {mostrarProyeccion && data.proyeccion.length > 0 && (
        <div className="rounded-lg border bg-card shadow-sm border-dashed">
          <div className="p-6 border-b bg-muted/30">
            <h3 className="font-semibold">Proyección (próximos 30 días)</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Basada en promedio histórico del período
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-medium">
                    Ingresos (proy.)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium">
                    Gastos (proy.)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium">
                    Flujo Neto (proy.)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium">
                    Saldo Acum. (proy.)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.proyeccion.slice(0, 10).map((dia, i) => (
                  <tr key={i} className="hover:bg-muted/50 opacity-70">
                    <td className="px-4 py-3 text-sm">{dia.fecha}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
                      {formatCurrency(dia.ingresos)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">
                      {formatCurrency(dia.gastos)}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-medium ${
                        dia.flujoNeto >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {dia.flujoNeto >= 0 ? "+" : ""}
                      {formatCurrency(dia.flujoNeto)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">
                      {formatCurrency(dia.saldoAcumulado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.proyeccion.length > 10 && (
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              ... y {data.proyeccion.length - 10} días más
            </div>
          )}
        </div>
      )}
    </div>
  );
}
