"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Percent,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { categoriaGastoLabels } from "@/lib/validations";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

type ResumenData = {
  ingresosMes: number;
  gastosMes: number;
  resultadoNeto: number;
  margenEbitda: number;
  ocupacionFlota: number;
  totalMotos: number;
  motosAlquiladas: number;
  ultimos12: { mes: string; ingresos: number; gastos: number }[];
  topCategorias: { categoria: string; monto: number }[];
  presupuestoVsReal: {
    categoria: string;
    presupuestado: number;
    real: number;
    porcentaje: number;
  }[];
  flujoCaja: { fecha: string; ingresos: number; gastos: number }[];
  roiMotos: {
    id: string;
    nombre: string;
    patente: string;
    ingresos: number;
    valorCompra: number;
    roi: number;
  }[];
  evolucionOcupacion: { mes: string; ocupacion: number }[];
};

const PIE_COLORS = [
  "#23e0ff", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6",
  "#ec4899", "#f97316", "#06b6d4", "#84cc16", "#6366f1",
];

export default function FinanzasDashboardPage() {
  const [data, setData] = useState<ResumenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/finanzas/resumen")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Dashboard Financiero</h1></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard Financiero</h1>
        <p className="text-muted-foreground">Error al cargar datos financieros.</p>
      </div>
    );
  }

  const kpis = [
    {
      label: "Ingresos del Mes",
      value: formatCurrency(data.ingresosMes),
      icon: TrendingUp,
      iconClass: "text-[#23e0ff]",
      subtitle: `${data.motosAlquiladas} motos alquiladas`,
    },
    {
      label: "Gastos del Mes",
      value: formatCurrency(data.gastosMes),
      icon: TrendingDown,
      iconClass: "text-red-500",
      subtitle: `${data.topCategorias.length} categorías`,
    },
    {
      label: "Resultado Neto",
      value: formatCurrency(data.resultadoNeto),
      icon: DollarSign,
      iconClass: data.resultadoNeto >= 0 ? "text-teal-500" : "text-red-500",
      subtitle: data.resultadoNeto >= 0 ? "Ganancia" : "Pérdida",
    },
    {
      label: "Margen EBITDA",
      value: `${data.margenEbitda}%`,
      icon: Percent,
      iconClass: data.margenEbitda >= 20 ? "text-teal-500" : data.margenEbitda >= 10 ? "text-yellow-500" : "text-red-500",
      subtitle: `${data.ocupacionFlota}% ocupación`,
    },
  ];

  // Prepare data for area chart (cumulative cash flow)
  const flujoCajaConSaldo = data.flujoCaja.map((d, i, arr) => {
    const saldoAnterior = i > 0 ? (arr[i - 1] as any).saldo || 0 : 0;
    const saldo = saldoAnterior + d.ingresos - d.gastos;
    return { ...d, saldo, neto: d.ingresos - d.gastos };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Financiero</h1>
        <p className="text-muted-foreground">Resumen de ingresos, gastos y rentabilidad</p>
      </div>

      {/* KPI Cards */}
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

      {/* Charts Row 1: Bar + Area */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Income vs Expenses Bar Chart */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Ingresos vs Gastos (12 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.ultimos12}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="mes" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Legend />
              <Bar dataKey="ingresos" name="Ingresos" fill="#23e0ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cash Flow Area Chart */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Flujo de Caja (30 días)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={flujoCajaConSaldo}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="fecha" className="text-xs" interval={4} />
              <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="saldo"
                name="Saldo Acumulado"
                stroke="#23e0ff"
                fill="#23e0ff"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Pie + ROI Horizontal Bar */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pie Chart */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Distribución de Gastos (Top 5)</h3>
          {data.topCategorias.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sin gastos este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.topCategorias.map((c) => ({
                    name: categoriaGastoLabels[c.categoria] ?? c.categoria,
                    value: c.monto,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.topCategorias.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ROI por Moto - Horizontal Bar */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">ROI por Moto (Top 10)</h3>
          {data.roiMotos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Sin datos de ROI (falta valorCompra en motos)
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.roiMotos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" tickFormatter={(v) => `${v}%`} />
                <YAxis
                  dataKey="patente"
                  type="category"
                  className="text-xs"
                  width={80}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "ROI") return `${value}%`;
                    return formatCurrency(value);
                  }}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="roi" name="ROI" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 3: Ocupación + Budget */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Evolución de Ocupación */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Evolución de Ocupación (12 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.evolucionOcupacion}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="mes" className="text-xs" />
              <YAxis
                className="text-xs"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value: number) => `${value}%`}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="ocupacion"
                name="Ocupación"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Budget vs Actual Table */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Presupuesto vs Real</h3>
          {data.presupuestoVsReal.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Sin presupuestos configurados este mes
            </p>
          ) : (
            <div className="space-y-4">
              {data.presupuestoVsReal.map((item) => (
                <div key={item.categoria} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {categoriaGastoLabels[item.categoria] ?? item.categoria}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {formatCurrency(item.real)} / {formatCurrency(item.presupuestado)}
                      </span>
                      {item.porcentaje > 100 && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">Excedido</Badge>
                      )}
                    </div>
                  </div>
                  <Progress
                    value={Math.min(item.porcentaje, 100)}
                    className={`h-2 ${item.porcentaje > 100 ? "[&>div]:bg-destructive" : item.porcentaje > 80 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-[#23e0ff]"}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
