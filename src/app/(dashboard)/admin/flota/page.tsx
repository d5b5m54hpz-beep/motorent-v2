import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bike,
  FileCheck,
  Tag,
  Settings,
  TrendingUp,
  BarChart3,
  Wrench,
  Factory,
  ArrowRight,
} from "lucide-react";

export default async function FlotaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const [totalMotos, enMantenimiento, patentamientoPendiente] = await Promise.all([
    prisma.moto.count({ where: { estado: { not: "BAJA_DEFINITIVA" } } }),
    prisma.moto.count({ where: { estado: "EN_SERVICE" } }),
    prisma.moto.count({ where: { estadoPatentamiento: { not: "PATENTADA" } } }),
  ]);

  const disponibles = await prisma.moto.count({ where: { estado: "DISPONIBLE" } });

  const sections = [
    {
      title: "Motos",
      description: "Gestión del inventario de motocicletas, alta, baja y estados.",
      href: "/admin/motos",
      icon: Bike,
      stat: `${totalMotos} en flota`,
    },
    {
      title: "Patentamiento RUNA",
      description: "Trámites DNRPA y checklist de documentación por moto.",
      href: "/admin/motos/patentamiento",
      icon: FileCheck,
      stat: `${patentamientoPendiente} pendientes`,
      alert: patentamientoPendiente > 0,
    },
    {
      title: "Precios por Moto",
      description: "Configuración de precios de alquiler por categoría y período.",
      href: "/admin/precios",
      icon: Tag,
    },
    {
      title: "Config de Precios",
      description: "Reglas de pricing, frecuencias y descuentos globales.",
      href: "/admin/pricing",
      icon: Settings,
    },
    {
      title: "Pricing Inteligente",
      description: "Sugerencias de precios basadas en demanda y mercado.",
      href: "/admin/finanzas/pricing",
      icon: TrendingUp,
    },
    {
      title: "Amortización",
      description: "Seguimiento de depreciación y valor residual de la flota.",
      href: "/admin/flota/amortizacion",
      icon: BarChart3,
    },
    {
      title: "Mantenimientos",
      description: "Órdenes de trabajo, planes preventivos y citas de servicio.",
      href: "/admin/mantenimientos",
      icon: Wrench,
    },
    {
      title: "Talleres",
      description: "Gestión de talleres y mecánicos asociados.",
      href: "/admin/talleres",
      icon: Factory,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Flota</h1>
        <p className="text-muted-foreground">
          Gestión integral de la flota de motocicletas
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Flota</p>
          <p className="text-2xl font-bold">{totalMotos}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Disponibles</p>
          <p className="text-2xl font-bold text-teal-600">{disponibles}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">En Mantenimiento</p>
          <p className="text-2xl font-bold text-yellow-600">{enMantenimiento}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Patentamiento Pendiente</p>
          <p className="text-2xl font-bold text-blue-600">{patentamientoPendiente}</p>
        </div>
      </div>

      {/* Sections grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
