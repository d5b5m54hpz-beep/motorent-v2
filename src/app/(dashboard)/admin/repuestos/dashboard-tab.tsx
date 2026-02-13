"use client";

import { useEffect, useState } from "react";
import { Package, AlertTriangle, XCircle, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type DashboardData = {
  totalRepuestos: number;
  totalActivos: number;
  stockBajo: number;
  sinStock: number;
  valorInventario: number;
  valorVenta: number;
  porCategoria: Array<{ categoria: string; cantidad: number }>;
  topConsumidos: Array<{ repuestoId: string; nombre: string; totalConsumido: number }>;
  alertas: Array<{ repuestoId: string; nombre: string; codigo: string | null; stock: number; stockMinimo: number }>;
  movimientosRecientes: Array<{
    id: string;
    tipo: string;
    cantidad: number;
    motivo: string | null;
    stockAnterior: number;
    stockNuevo: number;
    createdAt: string;
    repuesto: { nombre: string };
    usuario: { email: string } | null;
  }>;
};

type DashboardTabProps = {
  onFilterStockBajo?: () => void;
};

const TIPO_COLORS: Record<string, string> = {
  ENTRADA_COMPRA: "bg-green-500/10 text-green-700 border-green-200",
  SALIDA_CONSUMO_OT: "bg-red-500/10 text-red-700 border-red-200",
  ENTRADA_AJUSTE: "bg-blue-500/10 text-blue-700 border-blue-200",
  SALIDA_AJUSTE: "bg-orange-500/10 text-orange-700 border-orange-200",
  SALIDA_ROTURA: "bg-red-700/10 text-red-800 border-red-300",
  IMPORTACION: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
};

export function DashboardTab({ onFilterStockBajo }: DashboardTabProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/repuestos/dashboard");
        if (!res.ok) throw new Error("Error fetching dashboard");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="text-center text-muted-foreground">No se pudo cargar el dashboard</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repuestos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalRepuestos}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalActivos} activos
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-accent"
          onClick={onFilterStockBajo}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{data.stockBajo}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{data.sinStock}</div>
            <p className="text-xs text-muted-foreground">Crítico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.valorInventario)}</div>
            <p className="text-xs text-muted-foreground">Precio de compra</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Alerts */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Stock por Categoría Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Stock por Categoría
            </CardTitle>
            <CardDescription>Distribución de repuestos por categoría</CardDescription>
          </CardHeader>
          <CardContent>
            {data.porCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.porCategoria} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="categoria" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#23e0ff" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-10">
                Sin datos de categorías
              </p>
            )}
          </CardContent>
        </Card>

        {/* Alertas de Reposición */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Alertas de Reposición
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.alertas.slice(0, 10).map((alerta) => {
                const isCritico = alerta.stock === 0;
                return (
                  <div key={alerta.repuestoId} className="flex flex-col gap-1 pb-3 border-b last:border-0">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">{alerta.nombre}</span>
                      <Badge
                        variant={isCritico ? "destructive" : "outline"}
                        className={isCritico ? "" : "bg-yellow-50 text-yellow-700 border-yellow-300"}
                      >
                        {isCritico ? "🔴 Crítico" : "🟡 Bajo"}
                      </Badge>
                    </div>
                    {alerta.codigo && (
                      <span className="text-xs text-muted-foreground font-mono">{alerta.codigo}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Stock: {alerta.stock} / {alerta.stockMinimo} mín
                    </span>
                  </div>
                );
              })}
              {data.alertas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay alertas de stock bajo
                </p>
              )}
              {data.alertas.length > 10 && (
                <button
                  onClick={onFilterStockBajo}
                  className="text-sm text-cyan-600 hover:text-cyan-700 w-full text-center pt-2"
                >
                  Ver todos ({data.alertas.length}) →
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Últimos Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Últimos Movimientos</CardTitle>
          <CardDescription>Historial reciente de movimientos de stock</CardDescription>
        </CardHeader>
        <CardContent>
          {data.movimientosRecientes.length > 0 ? (
            <div className="space-y-3">
              {data.movimientosRecientes.slice(0, 10).map((mov) => (
                <div key={mov.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={TIPO_COLORS[mov.tipo] || "bg-gray-100"}>
                        {mov.tipo.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-sm font-medium">{mov.repuesto.nombre}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(mov.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                      <span className={mov.cantidad > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {mov.cantidad > 0 ? "+" : ""}{mov.cantidad}
                      </span>
                      <span>Stock: {mov.stockAnterior} → {mov.stockNuevo}</span>
                      {mov.usuario && <span>{mov.usuario.email}</span>}
                    </div>
                    {mov.motivo && (
                      <p className="text-xs text-muted-foreground mt-1">{mov.motivo}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No hay movimientos registrados
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
