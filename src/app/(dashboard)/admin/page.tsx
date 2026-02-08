import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import {
  Bike,
  FileText,
  CreditCard,
  Users,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

async function getStats() {
  const [motos, contratos, pagos, clientes, alertas] = await Promise.all([
    prisma.moto.count(),
    prisma.contrato.count({ where: { estado: "activo" } }),
    prisma.pago.aggregate({
      where: { estado: "pagado" },
      _sum: { monto: true },
    }),
    prisma.cliente.count(),
    prisma.alerta.count({ where: { leida: false } }),
  ]);

  return {
    motos,
    contratosActivos: contratos,
    ingresosTotales: pagos._sum.monto ?? 0,
    clientes,
    alertasPendientes: alertas,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      title: "Motos",
      value: stats.motos,
      icon: Bike,
      description: "Total en flota",
    },
    {
      title: "Contratos activos",
      value: stats.contratosActivos,
      icon: FileText,
      description: "En curso",
    },
    {
      title: "Ingresos totales",
      value: formatCurrency(stats.ingresosTotales),
      icon: TrendingUp,
      description: "Pagos confirmados",
    },
    {
      title: "Clientes",
      value: stats.clientes,
      icon: Users,
      description: "Registrados",
    },
    {
      title: "Alertas",
      value: stats.alertasPendientes,
      icon: AlertTriangle,
      description: "Sin leer",
      alert: stats.alertasPendientes > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general de MotoRent
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              <card.icon
                className={`h-4 w-4 ${
                  card.alert ? "text-destructive" : "text-muted-foreground"
                }`}
              />
            </div>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Ingresos mensuales
          </h3>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            {/* TODO: Recharts BarChart component */}
            <p className="text-sm">Gráfico de ingresos — pendiente de conectar</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Estado de contratos
          </h3>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            {/* TODO: Recharts PieChart component */}
            <p className="text-sm">Gráfico de contratos — pendiente de conectar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
