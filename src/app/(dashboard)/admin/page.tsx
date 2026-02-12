"use client";

import { useEffect, useState } from "react";
import {
  Bike,
  FileText,
  CreditCard,
  Users,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Clock,
  Wrench,
  Package,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { IngresosChart } from "./components/ingresos-chart";
import { ContratosChart } from "./components/contratos-chart";

type DashboardData = {
  kpis: {
    totalMotos: number;
    motosDisponibles: number;
    motosAlquiladas: number;
    motosMantenimiento: number;
    totalClientes: number;
    contratosActivos: number;
    contratosPendientes: number;
    pagosPendientes: number;
    pagosVencidos: number;
    ingresosTotales: number;
    ingresosMes: number;
    alertasSinLeer: number;
  };
  charts: {
    ingresos: Array<{ mes: string; ingresos: number }>;
    contratos: Array<{ estado: string; cantidad: number }>;
    motos: Array<{ estado: string; cantidad: number }>;
  };
  actividades: {
    ultimosCobros: Array<{
      id: string;
      cliente: string;
      moto: string;
      patente: string;
      monto: number;
      fecha: string | null;
      metodo: string;
    }>;
    proximosVencimientos: Array<{
      id: string;
      cliente: string;
      moto: string;
      patente: string;
      monto: number;
      vencimiento: string | null;
      diasRestantes: number | null;
      vencido: boolean;
    }>;
  };
};

type MantenimientoStats = {
  enProceso: number;
  pendientes: number;
  completadosMes: number;
  gastoMes: number;
  stockBajo: number;
};

type FinanzasResumen = {
  ingresosMes: number;
  gastosMes: number;
  resultadoNeto: number;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [mantStats, setMantStats] = useState<MantenimientoStats | null>(null);
  const [finanzas, setFinanzas] = useState<FinanzasResumen | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((res) => res.json()),
      fetch("/api/mantenimientos/stats").then((res) => res.ok ? res.json() : null).catch(() => null),
      fetch("/api/finanzas/resumen").then((res) => res.ok ? res.json() : null).catch(() => null),
    ])
      .then(([dashData, statsData, finData]) => {
        setData(dashData);
        setMantStats(statsData);
        setFinanzas(finData);
      })
      .catch((err) => console.error("Error loading dashboard:", err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen general de motolibre</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpiCards = [
    {
      title: "Motos en Flota",
      value: data.kpis.totalMotos,
      subtitle: `${data.kpis.motosDisponibles} disponibles`,
      icon: Bike,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Contratos Activos",
      value: data.kpis.contratosActivos,
      subtitle: `${data.kpis.contratosPendientes} pendientes`,
      icon: FileText,
      color: "text-teal-600 dark:text-teal-400",
    },
    {
      title: "Ingresos del Mes",
      value: formatCurrency(data.kpis.ingresosMes),
      subtitle: "Mes actual",
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Ingresos Totales",
      value: formatCurrency(data.kpis.ingresosTotales),
      subtitle: "Todos los pagos",
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Pagos Pendientes",
      value: data.kpis.pagosPendientes,
      subtitle: data.kpis.pagosVencidos > 0 ? `${data.kpis.pagosVencidos} vencidos` : "Al día",
      icon: CreditCard,
      color: data.kpis.pagosVencidos > 0 ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400",
      badge: data.kpis.pagosVencidos > 0 ? data.kpis.pagosVencidos : undefined,
    },
    {
      title: "Clientes",
      value: data.kpis.totalClientes,
      subtitle: "Registrados",
      icon: Users,
      color: "text-indigo-600 dark:text-indigo-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general de motolibre
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border bg-card p-4 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(35,224,255,0.12)]"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              <div className="relative">
                <card.icon className={`h-5 w-5 ${card.color}`} />
                {card.badge && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {card.badge}
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Mantenimiento KPIs */}
      {mantStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">En Mantenimiento</p>
              <Wrench className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{mantStats.enProceso}</p>
            <p className="text-xs text-muted-foreground">{mantStats.pendientes} pendientes</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Gasto Mensual Mant.</p>
              <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{formatCurrency(mantStats.gastoMes)}</p>
            <p className="text-xs text-muted-foreground">{mantStats.completadosMes} completados este mes</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Motos en Taller</p>
              <Bike className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{data?.kpis.motosMantenimiento ?? 0}</p>
            <p className="text-xs text-muted-foreground">Fuera de servicio</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Stock Bajo</p>
              <Package className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{mantStats.stockBajo}</p>
            <p className="text-xs text-muted-foreground">Repuestos por debajo del mínimo</p>
          </div>
        </div>
      )}

      {/* Resultado Neto */}
      {finanzas && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Ingresos del Mes</p>
              <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-teal-600 dark:text-teal-400">
              {formatCurrency(finanzas.ingresosMes)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Gastos del Mes</p>
              <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
              {formatCurrency(finanzas.gastosMes)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Resultado Neto</p>
              <DollarSign className={`h-5 w-5 ${finanzas.resultadoNeto >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"}`} />
            </div>
            <p className={`mt-2 text-2xl font-bold tracking-tight ${finanzas.resultadoNeto >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"}`}>
              {formatCurrency(finanzas.resultadoNeto)}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-7">
        <div className="md:col-span-4 rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Ingresos Mensuales</h3>
          <IngresosChart data={data.charts.ingresos} />
        </div>
        <div className="md:col-span-3 rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Estado de Contratos</h3>
          <ContratosChart data={data.charts.contratos} />
        </div>
      </div>

      {/* Mini Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Últimos Cobros */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="border-b p-4">
            <h3 className="font-semibold">Últimos Cobros</h3>
            <p className="text-xs text-muted-foreground">
              Pagos aprobados recientemente
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {data.actividades.ultimosCobros.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay cobros registrados
                </p>
              ) : (
                data.actividades.ultimosCobros.map((cobro) => (
                  <div
                    key={cobro.id}
                    className="flex items-center justify-between text-sm border-b pb-3 last:border-0 hover:bg-muted/50 -mx-4 px-4 rounded transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cobro.cliente}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {cobro.moto} • {cobro.metodo}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-medium">{formatCurrency(cobro.monto)}</p>
                      <p className="text-xs text-muted-foreground">
                        {cobro.fecha ? formatDate(new Date(cobro.fecha)) : "—"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Próximos Vencimientos */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="border-b p-4">
            <h3 className="font-semibold">Próximos Vencimientos</h3>
            <p className="text-xs text-muted-foreground">
              Pagos pendientes por vencer
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {data.actividades.proximosVencimientos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay vencimientos próximos
                </p>
              ) : (
                data.actividades.proximosVencimientos.map((pago) => (
                  <div
                    key={pago.id}
                    className={`flex items-center justify-between text-sm border-b pb-3 last:border-0 -mx-4 px-4 rounded transition-colors ${
                      pago.vencido ? "bg-red-50 dark:bg-red-950/20" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{pago.cliente}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {pago.moto}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-medium">{formatCurrency(pago.monto)}</p>
                      <p
                        className={`text-xs ${
                          pago.vencido
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : pago.diasRestantes !== null && pago.diasRestantes <= 3
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {pago.vencido
                          ? `Vencido hace ${Math.abs(pago.diasRestantes || 0)} días`
                          : pago.diasRestantes === 0
                          ? "Vence hoy"
                          : pago.diasRestantes === 1
                          ? "Vence mañana"
                          : `${pago.diasRestantes} días`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
