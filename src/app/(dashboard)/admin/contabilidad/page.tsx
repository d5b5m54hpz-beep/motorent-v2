import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  BookOpen,
  Calculator,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function ContabilidadPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [totalAsientos, totalCuentas, factCompra] = await Promise.all([
    prisma.asientoContable.count({ where: { fecha: { gte: inicioMes } } }),
    prisma.cuentaContable.count({ where: { activa: true } }),
    prisma.facturaCompra.count({
      where: { estado: { not: "PAGADA" }, vencimiento: { lte: hoy } },
    }),
  ]);

  const sections = [
    {
      title: "Estado de Resultados",
      description: "P&L mensual con ingresos, costos y resultado neto.",
      href: "/admin/finanzas/estado-resultados",
      icon: FileSpreadsheet,
    },
    {
      title: "Facturas de Compra",
      description: "Facturas de proveedores, vencimientos y pagos.",
      href: "/admin/facturas-compra",
      icon: FileSpreadsheet,
      stat: factCompra > 0 ? `${factCompra} vencidas` : undefined,
      alert: factCompra > 0,
    },
    {
      title: "Plan de Cuentas",
      description: "Estructura contable, cuentas activas y jerarquía.",
      href: "/admin/cuentas-contables",
      icon: BookOpen,
      stat: `${totalCuentas} cuentas activas`,
    },
    {
      title: "Asientos Contables",
      description: "Libro diario, asientos automáticos y manuales.",
      href: "/admin/asientos-contables",
      icon: Calculator,
      stat: `${totalAsientos} este mes`,
    },
    {
      title: "Reportes",
      description: "Balances, estado de cuenta y exportación contable.",
      href: "/admin/contabilidad/reportes",
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contabilidad</h1>
        <p className="text-muted-foreground">
          Plan de cuentas, asientos de doble entrada y reportes contables
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Cuentas Activas</p>
          <p className="text-2xl font-bold">{totalCuentas}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Asientos este Mes</p>
          <p className="text-2xl font-bold text-teal-600">{totalAsientos}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Fact. Compra Vencidas</p>
          <p className={`text-2xl font-bold ${factCompra > 0 ? "text-red-600" : "text-teal-600"}`}>
            {factCompra}
          </p>
        </div>
      </div>

      {/* Sections grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-primary/10 p-2">
                      <section.icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <CardDescription className="text-xs leading-relaxed">
                  {section.description}
                </CardDescription>
                {section.stat && (
                  <Badge
                    variant={section.alert ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {section.stat}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
