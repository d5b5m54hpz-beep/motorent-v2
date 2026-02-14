"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Package,
  RefreshCw,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type RepuestoForecast = {
  repuestoId: string;
  sku: string;
  nombre: string;
  unidad: string | null;
  cantidadObligatoria: number;
  cantidadCondicional: number;
  cantidadTotal: number;
  costoUnitario: number;
  costoTotal: number;
  costoFaltante: number;
  stockActual: number;
  stockMinimo: number;
  faltante: number;
  puntoReorden: number;
  alertaReorden: boolean;
  leadTimeDias: number;
  fechaLimitePedido: string | null;
  fuenteCalculo: "DATOS_REALES" | "VIDA_UTIL_KM" | "PLAN_FALLBACK";
  desglosePorMes: Array<{ mes: string; cantidad: number }>;
};

type MotoProjection = {
  motoId: string;
  patente: string;
  marca: string;
  modelo: string;
  kmActual: number;
  kmPorMes: number;
  services: Array<{ mes: string; tipo: string; kmEstimado: number }>;
};

type ForecastData = {
  periodo: string;
  meses: number;
  totalMotos: number;
  kmPromedioFlota: number;
  fuenteDatos: "REAL" | "ESTIMADO";
  totalOTsHistoricas: number;
  servicesProgramados: {
    basicos: number;
    intermedios: number;
    mayores: number;
    total: number;
    detallePorMes: Array<{
      mes: string;
      basicos: number;
      intermedios: number;
      mayores: number;
    }>;
  };
  costoTotalEstimado: number;
  costoFaltante: number;
  repuestosNecesarios: RepuestoForecast[];
  alertasCriticas: Array<{ tipo: string; sku: string; mensaje: string }>;
  detallePorMoto: MotoProjection[];
};

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatMonth(mes: string): string {
  const [year, month] = mes.split("-");
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
}

function EstadoBadge({ repuesto }: { repuesto: RepuestoForecast }) {
  if (repuesto.stockActual <= 0 && repuesto.cantidadTotal > 0) {
    return (
      <Badge className="bg-red-600 text-white hover:bg-red-700">SIN STOCK</Badge>
    );
  }
  if (repuesto.faltante > 0 && repuesto.alertaReorden) {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">PEDIR AHORA</Badge>
    );
  }
  if (repuesto.alertaReorden) {
    return (
      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">STOCK BAJO</Badge>
    );
  }
  return (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">OK</Badge>
  );
}

export function PronosticoTab() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [meses, setMeses] = useState("3");
  const [kmPromedio, setKmPromedio] = useState("");

  const fetchForecast = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ meses });
      if (kmPromedio) params.set("kmPromedioPorMes", kmPromedio);

      const res = await fetch(`/api/mantenimientos/pronostico-repuestos?${params}`);
      if (!res.ok) throw new Error("Error al cargar pronóstico");
      const json = await res.json();
      setData(json.data);

      // Set km average from API if not overridden
      if (!kmPromedio && json.data?.kmPromedioFlota) {
        setKmPromedio(String(json.data.kmPromedioFlota));
      }
    } catch (error) {
      console.error("Error fetching forecast:", error);
      toast.error("Error al cargar pronóstico de repuestos");
    } finally {
      setIsLoading(false);
    }
  }, [meses, kmPromedio]);

  useEffect(() => {
    fetchForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Chart data for services per month
  const chartData = data?.servicesProgramados.detallePorMes.map((m) => ({
    mes: formatMonth(m.mes),
    "Básico": m.basicos,
    "Intermedio": m.intermedios,
    "Mayor": m.mayores,
  })) || [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="periodo">Período</Label>
              <Select value={meses} onValueChange={setMeses}>
                <SelectTrigger id="periodo" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mes</SelectItem>
                  <SelectItem value="2">2 meses</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="km">Km promedio/mes</Label>
              <Input
                id="km"
                type="number"
                placeholder="4000"
                value={kmPromedio}
                onChange={(e) => setKmPromedio(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <Button onClick={fetchForecast} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Recalcular
            </Button>
            <div className="ml-auto">
              {data?.fuenteDatos === "REAL" ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  Basado en datos reales ({data.totalOTsHistoricas} OTs)
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                  Estimación (usando {data?.kmPromedioFlota || 4000} km/mes)
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {data?.alertasCriticas && data.alertasCriticas.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-semibold text-red-800 dark:text-red-300">
                {data.alertasCriticas.length} alerta{data.alertasCriticas.length > 1 ? "s" : ""} crítica{data.alertasCriticas.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {data.alertasCriticas.map((alerta, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-md border border-red-200 bg-white p-3 text-sm dark:border-red-800 dark:bg-red-950"
                >
                  <span className="shrink-0">
                    {alerta.tipo === "STOCK_CRITICO" ? "🔴" : alerta.tipo === "LEAD_TIME" ? "🔴" : "⚠️"}
                  </span>
                  <span>{alerta.mensaje}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary KPIs */}
      {data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Services Básicos</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.servicesProgramados.basicos}</div>
              <p className="text-xs text-muted-foreground">próx {data.meses}m</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Services Intermedio</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.servicesProgramados.intermedios}</div>
              <p className="text-xs text-muted-foreground">próx {data.meses}m</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Services Mayores</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.servicesProgramados.mayores}</div>
              <p className="text-xs text-muted-foreground">próx {data.meses}m</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Costo Estimado</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.costoTotalEstimado)}</div>
              <p className="text-xs text-muted-foreground">próx {data.meses}m</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faltante a Comprar</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.costoFaltante > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(data.costoFaltante)}
              </div>
              <p className="text-xs text-muted-foreground">próx {data.meses}m</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Services Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Services Programados por Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Básico" stackId="a" fill="#22d3ee" />
                <Bar dataKey="Intermedio" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Mayor" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Repuestos Table */}
      {data && data.repuestosNecesarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Repuestos Necesarios</CardTitle>
            <CardDescription>
              Desglose mensual de repuestos con estado de stock y alertas de reorden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">SKU</th>
                    <th className="px-3 py-2 text-left font-medium">Repuesto</th>
                    {data.servicesProgramados.detallePorMes.map((m) => (
                      <th key={m.mes} className="px-3 py-2 text-right font-medium">
                        {formatMonth(m.mes)}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="px-3 py-2 text-right font-medium">Stock</th>
                    <th className="px-3 py-2 text-right font-medium">Faltante</th>
                    <th className="px-3 py-2 text-right font-medium">Costo</th>
                    <th className="px-3 py-2 text-center font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.repuestosNecesarios.map((rep) => (
                    <tr key={rep.repuestoId} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{rep.sku}</td>
                      <td className="px-3 py-2">{rep.nombre}</td>
                      {rep.desglosePorMes.map((m) => (
                        <td key={m.mes} className="px-3 py-2 text-right">
                          {m.cantidad > 0 ? m.cantidad : "-"}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-medium">
                        {Math.ceil(rep.cantidadTotal)} {rep.unidad || "U"}
                      </td>
                      <td className="px-3 py-2 text-right">{rep.stockActual}</td>
                      <td className={`px-3 py-2 text-right font-medium ${rep.faltante > 0 ? "text-red-600" : "text-green-600"}`}>
                        {rep.faltante > 0 ? rep.faltante : "0"}
                      </td>
                      <td className="px-3 py-2 text-right">{formatCurrency(rep.costoTotal)}</td>
                      <td className="px-3 py-2 text-center">
                        <EstadoBadge repuesto={rep} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-medium">
                    <td colSpan={2 + data.servicesProgramados.detallePorMes.length} className="px-3 py-2 text-right">
                      Totales
                    </td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right font-bold text-red-600">
                      {data.repuestosNecesarios.reduce((s, r) => s + r.faltante, 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold">
                      {formatCurrency(data.costoTotalEstimado)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail per Moto */}
      {data && data.detallePorMoto.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle por Moto</CardTitle>
            <CardDescription>
              Services proyectados para cada moto según su kilometraje actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.detallePorMoto.map((moto) => (
                <Collapsible key={moto.motoId}>
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-muted">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{moto.patente}</span>
                    <span className="text-muted-foreground">
                      — {moto.marca} {moto.modelo}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (km: {moto.kmActual.toLocaleString()} | ~{moto.kmPorMes.toLocaleString()} km/mes)
                    </span>
                    <Badge variant="outline" className="ml-auto">
                      {moto.services.length} service{moto.services.length !== 1 ? "s" : ""}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-8 space-y-1 pb-2">
                      {moto.services.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">{formatMonth(s.mes)}:</span>
                          <Badge
                            variant="outline"
                            className={
                              s.tipo === "MAYOR"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                : s.tipo === "INTERMEDIO"
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                                : "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300"
                            }
                          >
                            {s.tipo}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            (km est: {s.kmEstimado.toLocaleString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {data && data.repuestosNecesarios.length === 0 && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
            No hay repuestos proyectados para el período seleccionado.
            Verifique que existan motos activas y planes con repuestos vinculados.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
