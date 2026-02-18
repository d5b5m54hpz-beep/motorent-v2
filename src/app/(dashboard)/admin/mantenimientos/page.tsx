"use client";

import { useState, useEffect } from "react";
import { Calendar, Wrench, QrCode, FileText, Activity, DollarSign, Bike } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CalendarioTab } from "./_components/calendario-tab";
import { OrdenesTab } from "./_components/ordenes-tab";
import { CheckinTab } from "./_components/checkin-tab";
import { PlanesTab } from "./_components/planes-tab";

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
        const motosRes = await fetch("/api/motos?estado=MANTENIMIENTO&limit=1");
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
          <CalendarioTab />
        </TabsContent>

        {/* Tab 2: Órdenes de Trabajo */}
        <TabsContent value="ordenes" className="space-y-4">
          <OrdenesTab />
        </TabsContent>

        {/* Tab 3: Check-in/Check-out */}
        <TabsContent value="checkin" className="space-y-4">
          <CheckinTab />
        </TabsContent>

        {/* Tab 4: Planes de Mantenimiento */}
        <TabsContent value="planes" className="space-y-4">
          <PlanesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
