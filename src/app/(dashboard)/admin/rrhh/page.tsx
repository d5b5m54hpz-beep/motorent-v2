import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserX, TrendingDown, DollarSign } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/rrhh/stats`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  } catch (error) {
    console.error("Error fetching RRHH stats:", error);
    return { activos: 0, enLicencia: 0, bajasDelMes: 0, costoLaboralMes: 0, ausenciasDelMes: [] };
  }
}

export default async function RRHHDashboardPage() {
  const stats = await getStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recursos Humanos</h1>
          <p className="text-muted-foreground">Gestión de personal y liquidaciones</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/rrhh/empleados">
            <Button>Ver Empleados</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activos}</div>
            <p className="text-xs text-muted-foreground">Personal en actividad</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Licencia</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enLicencia}</div>
            <p className="text-xs text-muted-foreground">Ausencias temporales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bajas del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bajasDelMes}</div>
            <p className="text-xs text-muted-foreground">Egresos en el período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Laboral</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.costoLaboralMes)}</div>
            <p className="text-xs text-muted-foreground">Mes actual (confirmado)</p>
          </CardContent>
        </Card>
      </div>

      {/* Ausencias del Mes */}
      {stats.ausenciasDelMes && stats.ausenciasDelMes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ausencias del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.ausenciasDelMes.map((ausencia: { tipo: string; cantidad: number }) => (
                <div key={ausencia.tipo} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span className="text-sm font-medium capitalize">{ausencia.tipo.replace(/_/g, " ").toLowerCase()}</span>
                  <span className="text-sm text-muted-foreground">{ausencia.cantidad}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/rrhh/empleados">
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Gestionar Empleados
            </Button>
          </Link>
          <Button variant="outline" className="w-full justify-start" disabled>
            <DollarSign className="mr-2 h-4 w-4" />
            Liquidar Sueldos
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            <UserX className="mr-2 h-4 w-4" />
              Registrar Ausencia
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
