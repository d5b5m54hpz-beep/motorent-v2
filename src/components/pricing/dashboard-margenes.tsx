"use client";

import { useState, useEffect } from "react";
import { TrendingUp, AlertTriangle, DollarSign, Package, Activity, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { SimuladorWhatIfDialog } from "./simulador-whatif-dialog";

type DashboardData = {
  kpis: {
    margenPromedioPortfolio: number;
    margenPromedioSimple: number;
    tendenciaMargen: number;
    totalRepuestos: number;
    repuestosBajoMinimo: number;
    repuestosSinPrecio: number;
    repuestosMargenCritico: number;
    valorInventarioCosto: number;
    valorInventarioPrecio: number;
    margenBrutoInventario: number;
    cambiosPreciosPeriodo: number;
    embarquesEnTransito: number;
    ultimoAjusteBulk: string | null;
  };
  porCategoria: Array<{
    categoria: string;
    totalProductos: number;
    margenPromedio: number;
    margenObjetivo: number;
    margenMinimo: number;
    valorInventario: number;
    estado: string;
  }>;
  distribucionMargenes: {
    critico: number;
    bajo: number;
    aceptable: number;
    optimo: number;
  };
  peoresMargenes: Array<{
    repuestoId: string;
    nombre: string;
    categoria: string | null;
    costo: number;
    precioVenta: number;
    margen: number;
    margenMinimo: number;
    diferencia: number;
  }>;
  mejoresMargenes: Array<{
    repuestoId: string;
    nombre: string;
    margen: number;
  }>;
  tendenciaCostos: Array<{
    mes: string;
    costoPromedio: number;
    precioPromedio: number;
    margen: number;
  }>;
  alertas: Array<{
    tipo: string;
    severidad: string;
    mensaje: string;
    repuestoId?: string;
    accion?: string;
  }>;
  ultimosCambios: Array<{
    repuesto: string;
    fecha: string;
    precioAnterior: number;
    precioNuevo: number;
    cambio: string;
    motivo: string;
  }>;
};

export function DashboardMargenes() {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("30d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [dialogWhatIf, setDialogWhatIf] = useState(false);

  useEffect(() => {
    fetchData();
  }, [periodo]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/pricing-repuestos/dashboard-margenes?periodo=${periodo}`);
      if (!res.ok) throw new Error();
      const dashboard = await res.json();
      setData(dashboard);
    } catch (error) {
      toast.error("Error al cargar dashboard");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { kpis, porCategoria, distribucionMargenes, tendenciaCostos, alertas, ultimosCambios } = data;

  // Preparar datos para gráfico de distribución
  const distribucionData = [
    { name: "Crítico", value: distribucionMargenes.critico, fill: "#ef4444" },
    { name: "Bajo", value: distribucionMargenes.bajo, fill: "#f97316" },
    { name: "Aceptable", value: distribucionMargenes.aceptable, fill: "#eab308" },
    { name: "Óptimo", value: distribucionMargenes.optimo, fill: "#22c55e" },
  ];

  // Colores por estado para categorías
  const getColorEstado = (estado: string) => {
    switch (estado) {
      case "OK":
        return "#22c55e";
      case "BAJO":
        return "#eab308";
      case "CRITICO":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  // Formatear mes para tendencia
  const formatMes = (mes: string) => {
    const [year, month] = mes.split("-");
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return meses[parseInt(month) - 1];
  };

  return (
    <div className="space-y-6">
      {/* Header con selector de período */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Pricing</h2>
          <p className="text-sm text-muted-foreground">Análisis ejecutivo de márgenes y rentabilidad</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogWhatIf(true)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Simulador What-If
          </Button>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">30 días</SelectItem>
              <SelectItem value="90d">90 días</SelectItem>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(kpis.margenPromedioPortfolio * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {kpis.tendenciaMargen > 0 ? (
                <span className="text-green-600">▲ +{(kpis.tendenciaMargen * 100).toFixed(1)}%</span>
              ) : kpis.tendenciaMargen < 0 ? (
                <span className="text-red-600">▼ {(kpis.tendenciaMargen * 100).toFixed(1)}%</span>
              ) : (
                <span className="text-gray-600">— sin cambios</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bajo Mínimo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.repuestosBajoMinimo}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.repuestosBajoMinimo === 0 ? "Todos OK" : "requieren ajuste"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Críticos &lt; 10%</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.repuestosMargenCritico}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.repuestosMargenCritico === 0 ? "Ninguno" : "urgente"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(kpis.valorInventarioPrecio / 1000000).toFixed(2)}M
            </div>
            <p className="text-xs text-muted-foreground">
              Costo: ${(kpis.valorInventarioCosto / 1000000).toFixed(2)}M
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Margen por categoría */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margen por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={porCategoria.slice(0, 7)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <YAxis type="category" dataKey="categoria" width={100} />
                <Tooltip
                  formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                  labelStyle={{ color: "#000" }}
                />
                <Bar dataKey="margenPromedio" radius={[0, 4, 4, 0]}>
                  {porCategoria.slice(0, 7).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColorEstado(entry.estado)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución de márgenes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución de Márgenes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribucionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {distribucionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tendencia de márgenes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendencia de Márgenes ({periodo})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={tendenciaCostos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tickFormatter={formatMes} />
              <YAxis
                yAxisId="left"
                domain={[0, 1]}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "margen") return `${(value * 100).toFixed(1)}%`;
                  return `$${value.toLocaleString("es-AR")}`;
                }}
                labelFormatter={(label) => formatMes(label)}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="margen"
                stroke="#23e0ff"
                strokeWidth={2}
                dot={{ fill: "#23e0ff" }}
                name="Margen promedio"
              />
              <ReferenceLine
                yAxisId="left"
                y={0.25}
                stroke="#666"
                strokeDasharray="3 3"
                label={{ value: "Mínimo", position: "right" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Alertas y Últimos Cambios */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Alertas Activas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertas.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No hay alertas activas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertas.slice(0, 5).map((alerta, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-3 space-y-1"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">
                        {alerta.severidad === "ALTA" ? "🔴" : alerta.severidad === "MEDIA" ? "🟡" : "🔵"}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alerta.mensaje}</p>
                        {alerta.accion && (
                          <p className="text-xs text-muted-foreground mt-1">
                            → {alerta.accion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos Cambios de Precio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Últimos Cambios de Precio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ultimosCambios.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No hay cambios recientes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ultimosCambios.slice(0, 8).map((cambio, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm border-b pb-2">
                    <div className="flex-1">
                      <p className="font-medium text-xs">{cambio.repuesto}</p>
                      <p className="text-xs text-muted-foreground">{cambio.fecha}</p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={cambio.cambio.startsWith("+") ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {cambio.cambio}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        ${cambio.precioNuevo.toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Simulador What-If */}
      <SimuladorWhatIfDialog open={dialogWhatIf} onOpenChange={setDialogWhatIf} />
    </div>
  );
}
