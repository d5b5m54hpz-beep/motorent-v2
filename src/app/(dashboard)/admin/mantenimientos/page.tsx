"use client";

import { useState, useEffect } from "react";
import { Calendar, Wrench, QrCode, FileText, Activity, Clock, DollarSign, Bike } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type DashboardStats = {
  citasProgramadas: number;
  ordenesEnEjecucion: number;
  motosEnMantenimiento: number;
  costoPromedioOT: number;
};

export default function MantenimientosPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);

        // Fetch citas programadas
        const citasRes = await fetch("/api/mantenimientos/citas?estado=PROGRAMADA");
        const citasData = await citasRes.json();

        // Fetch órdenes en ejecución
        const ordenesRes = await fetch("/api/mantenimientos/ordenes?estado=EN_EJECUCION");
        const ordenesData = await ordenesRes.json();

        // Fetch motos en mantenimiento
        const motosRes = await fetch("/api/motos?estado=mantenimiento&limit=1");
        const motosData = await motosRes.json();

        // Calculate average cost from recent completed OTs
        const completadasRes = await fetch("/api/mantenimientos/ordenes?estado=COMPLETADA&limit=50");
        const completadasData = await completadasRes.json();
        const avgCosto = completadasData.data?.length > 0
          ? completadasData.data.reduce((sum: number, ot: any) => sum + (ot.costoTotal || 0), 0) / completadasData.data.length
          : 0;

        setStats({
          citasProgramadas: citasData.total || 0,
          ordenesEnEjecucion: ordenesData.total || 0,
          motosEnMantenimiento: motosData.total || 0,
          costoPromedioOT: avgCosto,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("Error al cargar estadísticas");
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mantenimientos</h1>
        <p className="text-muted-foreground">
          Sistema de gestión de mantenimientos preventivos y correctivos
        </p>
      </div>

      {/* Dashboard KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas Programadas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.citasProgramadas || 0}</div>
                <p className="text-xs text-muted-foreground">Próximos 30 días</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes en Ejecución</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.ordenesEnEjecucion || 0}</div>
                <p className="text-xs text-muted-foreground">OTs activas</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Motos en Taller</CardTitle>
            <Bike className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.motosEnMantenimiento || 0}</div>
                <p className="text-xs text-muted-foreground">Fuera de servicio</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Promedio OT</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${Math.round(stats?.costoPromedioOT || 0).toLocaleString('es-AR')}
                </div>
                <p className="text-xs text-muted-foreground">Últimas 50 OTs</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs Interface */}
      <Tabs defaultValue="calendario" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendario</span>
          </TabsTrigger>
          <TabsTrigger value="ordenes" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Órdenes</span>
          </TabsTrigger>
          <TabsTrigger value="checkin" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Check-in/out</span>
          </TabsTrigger>
          <TabsTrigger value="planes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Planes</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Calendario de Citas */}
        <TabsContent value="calendario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendario de Citas</CardTitle>
              <CardDescription>
                Visualiza y gestiona las citas de mantenimiento programadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Calendario de Citas</p>
                  <p className="text-xs text-muted-foreground">
                    Vista de calendario en desarrollo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Órdenes de Trabajo */}
        <TabsContent value="ordenes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes de Trabajo</CardTitle>
              <CardDescription>
                Listado completo de órdenes de trabajo (OTs) con filtros y búsqueda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Wrench className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Tabla de Órdenes de Trabajo</p>
                  <p className="text-xs text-muted-foreground">
                    DataTable con filtros en desarrollo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Check-in/Check-out */}
        <TabsContent value="checkin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Check-in / Check-out</CardTitle>
              <CardDescription>
                Escanea el código QR para iniciar o finalizar una orden de trabajo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
                <div className="flex flex-col items-center gap-2 text-center">
                  <QrCode className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Escáner QR</p>
                  <p className="text-xs text-muted-foreground">
                    Interfaz de check-in/out en desarrollo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Planes de Mantenimiento */}
        <TabsContent value="planes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Planes de Mantenimiento</CardTitle>
              <CardDescription>
                Visualiza los planes predefinidos (Básico, Intermedio, Mayor) y sus tareas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
                <div className="flex flex-col items-center gap-2 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Planes de Mantenimiento</p>
                  <p className="text-xs text-muted-foreground">
                    Visualización de planes en desarrollo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
