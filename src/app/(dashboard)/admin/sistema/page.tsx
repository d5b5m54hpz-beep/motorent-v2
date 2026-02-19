import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserCog,
  Shield,
  Bell,
  AlertTriangle,
  Building2,
  Activity,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default async function SistemaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const [alertasNoLeidas, anomaliasCriticas, totalUsuarios] = await Promise.all([
    prisma.alerta.count({ where: { leida: false } }),
    prisma.anomalia.count({ where: { severidad: "CRITICA", estado: "NUEVA" } }),
    prisma.user.count(),
  ]);

  const sections = [
    {
      title: "Usuarios",
      description: "Gestión de cuentas, roles y accesos al sistema.",
      href: "/admin/usuarios",
      icon: UserCog,
      stat: `${totalUsuarios} usuarios`,
    },
    {
      title: "Permisos",
      description: "Perfiles de permisos granulares y asignación por usuario.",
      href: "/admin/permisos",
      icon: Shield,
    },
    {
      title: "Alertas",
      description: "Centro de notificaciones y alertas del sistema.",
      href: "/admin/alertas",
      icon: Bell,
      stat: alertasNoLeidas > 0 ? `${alertasNoLeidas} sin leer` : undefined,
      alert: alertasNoLeidas > 0,
    },
    {
      title: "Anomalías",
      description: "Detección automática de comportamientos anómalos y riesgos.",
      href: "/anomalias",
      icon: AlertTriangle,
      stat: anomaliasCriticas > 0 ? `${anomaliasCriticas} críticas` : undefined,
      alert: anomaliasCriticas > 0,
    },
    {
      title: "Configuración Empresa",
      description: "Datos fiscales, AFIP, logo y parámetros generales.",
      href: "/admin/configuracion/empresa",
      icon: Building2,
    },
    {
      title: "Diagnóstico",
      description: "Health check, performance del sistema y logs de eventos.",
      href: "/admin/sistema/diagnostico",
      icon: Activity,
    },
    {
      title: "Asistente IA",
      description: "Chat inteligente para consultas sobre el negocio.",
      href: "/admin/asistente",
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sistema</h1>
        <p className="text-muted-foreground">
          Administración, seguridad y configuración del sistema
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Usuarios</p>
          <p className="text-2xl font-bold">{totalUsuarios}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Alertas sin Leer</p>
          <p className={`text-2xl font-bold ${alertasNoLeidas > 0 ? "text-yellow-600" : "text-teal-600"}`}>
            {alertasNoLeidas}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Anomalías Críticas</p>
          <p className={`text-2xl font-bold ${anomaliasCriticas > 0 ? "text-red-600" : "text-teal-600"}`}>
            {anomaliasCriticas}
          </p>
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
