"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type HistorialPrecio = {
  id: string;
  repuesto: { id: string; nombre: string };
  precioAnterior: number | null;
  precioNuevo: number;
  tipoCambio: string;
  motivo: string | null;
  createdAt: string;
  loteId: string | null;
};

type HistorialCosto = {
  id: string;
  repuesto: { id: string; nombre: string };
  costoAnteriorArs: number | null;
  costoNuevoArs: number;
  motivo: string | null;
  createdAt: string;
};

type ChartDataPoint = {
  fecha: string;
  precio: number | null;
  costo: number | null;
  margen: number | null;
};

export function HistorialTab() {
  const [tipoHistorial, setTipoHistorial] = useState<"precios" | "costos" | "ambos">("precios");
  const [loading, setLoading] = useState(true);
  const [historialPrecios, setHistorialPrecios] = useState<HistorialPrecio[]>([]);
  const [historialCostos, setHistorialCostos] = useState<HistorialCosto[]>([]);
  const [repuestoFiltro, setRepuestoFiltro] = useState("");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [repuestoSeleccionado, setRepuestoSeleccionado] = useState<{ id: string; nombre: string } | null>(null);

  useEffect(() => {
    fetchHistorial();
  }, [tipoHistorial]);

  const fetchHistorial = async () => {
    try {
      setLoading(true);

      if (tipoHistorial === "precios" || tipoHistorial === "ambos") {
        const resPrecios = await fetch("/api/pricing-repuestos/historial?limit=50");
        if (resPrecios.ok) {
          const dataPrecios = await resPrecios.json();
          setHistorialPrecios(dataPrecios.data || []);
        }
      }

      if (tipoHistorial === "costos" || tipoHistorial === "ambos") {
        const resCostos = await fetch("/api/repuestos/historial-costos?limit=50");
        if (resCostos.ok) {
          const dataCostos = await resCostos.json();
          setHistorialCostos(dataCostos.data || []);
        }
      }
    } catch (error) {
      toast.error("Error al cargar historial");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const historialPreciosFiltrado = historialPrecios.filter((h) =>
    h.repuesto.nombre.toLowerCase().includes(repuestoFiltro.toLowerCase())
  );

  const historialCostosFiltrado = historialCostos.filter((h) =>
    h.repuesto.nombre.toLowerCase().includes(repuestoFiltro.toLowerCase())
  );

  // Detectar repuesto único para mostrar gráfico de evolución
  useEffect(() => {
    if (!repuestoFiltro.trim()) {
      setRepuestoSeleccionado(null);
      setChartData([]);
      return;
    }

    // Obtener repuestos únicos de los datos filtrados
    const repuestosUnicos = new Map<string, { id: string; nombre: string }>();

    historialPreciosFiltrado.forEach((h) => {
      if (!repuestosUnicos.has(h.repuesto.id)) {
        repuestosUnicos.set(h.repuesto.id, { id: h.repuesto.id, nombre: h.repuesto.nombre });
      }
    });

    historialCostosFiltrado.forEach((h) => {
      if (!repuestosUnicos.has(h.repuesto.id)) {
        repuestosUnicos.set(h.repuesto.id, { id: h.repuesto.id, nombre: h.repuesto.nombre });
      }
    });

    // Si hay exactamente un repuesto único, cargar su evolución
    if (repuestosUnicos.size === 1) {
      const repuesto = Array.from(repuestosUnicos.values())[0];
      setRepuestoSeleccionado(repuesto);
      fetchEvolucion(repuesto.id);
    } else {
      setRepuestoSeleccionado(null);
      setChartData([]);
    }
  }, [repuestoFiltro, historialPreciosFiltrado, historialCostosFiltrado]);

  const fetchEvolucion = async (repuestoId: string) => {
    try {
      setLoadingChart(true);

      // Fetch completo de historial de precios y costos para este repuesto
      const [resPrecios, resCostos] = await Promise.all([
        fetch(`/api/pricing-repuestos/historial?repuestoId=${repuestoId}&limit=100`),
        fetch(`/api/repuestos/historial-costos?repuestoId=${repuestoId}&limit=100`),
      ]);

      let preciosData: HistorialPrecio[] = [];
      let costosData: HistorialCosto[] = [];

      if (resPrecios.ok) {
        const data = await resPrecios.json();
        preciosData = data.data || [];
      }

      if (resCostos.ok) {
        const data = await resCostos.json();
        costosData = data.data || [];
      }

      // Combinar datos por fecha
      const dataMap = new Map<string, { precio: number | null; costo: number | null }>();

      // Agregar precios
      preciosData.forEach((h) => {
        const fecha = format(new Date(h.createdAt), "dd/MM/yyyy");
        dataMap.set(fecha, { precio: h.precioNuevo, costo: dataMap.get(fecha)?.costo || null });
      });

      // Agregar costos
      costosData.forEach((h) => {
        const fecha = format(new Date(h.createdAt), "dd/MM/yyyy");
        const existing = dataMap.get(fecha);
        dataMap.set(fecha, { precio: existing?.precio || null, costo: h.costoNuevoArs });
      });

      // Convertir a array y ordenar por fecha
      const chartPoints: ChartDataPoint[] = Array.from(dataMap.entries())
        .map(([fecha, { precio, costo }]) => {
          const margen = precio && costo && precio > 0 ? ((precio - costo) / precio) * 100 : null;
          return { fecha, precio, costo, margen };
        })
        .sort((a, b) => {
          const [dA, mA, yA] = a.fecha.split("/").map(Number);
          const [dB, mB, yB] = b.fecha.split("/").map(Number);
          return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
        });

      setChartData(chartPoints);
    } catch (error) {
      toast.error("Error al cargar evolución");
      console.error(error);
    } finally {
      setLoadingChart(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Historial de Cambios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <Label>Mostrar:</Label>
            <RadioGroup
              value={tipoHistorial}
              onValueChange={(val: any) => setTipoHistorial(val)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="precios" id="precios" />
                <Label htmlFor="precios" className="font-normal cursor-pointer">
                  Precios
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="costos" id="costos" />
                <Label htmlFor="costos" className="font-normal cursor-pointer">
                  Costos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ambos" id="ambos" />
                <Label htmlFor="ambos" className="font-normal cursor-pointer">
                  Ambos
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por repuesto..."
              value={repuestoFiltro}
              onChange={(e) => setRepuestoFiltro(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Historial de Precios */}
      {(tipoHistorial === "precios" || tipoHistorial === "ambos") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de Precios</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : historialPreciosFiltrado.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cambios de precio registrados
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Repuesto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Anterior</TableHead>
                      <TableHead className="text-right">Nuevo</TableHead>
                      <TableHead className="text-right">Variación</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historialPreciosFiltrado.map((h) => {
                      const cambio =
                        h.precioAnterior && h.precioAnterior > 0
                          ? ((h.precioNuevo - h.precioAnterior) / h.precioAnterior) * 100
                          : 0;

                      return (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium">{h.repuesto.nombre}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(h.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell className="text-right">
                            ${(h.precioAnterior || 0).toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${h.precioNuevo.toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={cambio > 0 ? "default" : "secondary"}>
                              {cambio > 0 ? "+" : ""}
                              {cambio.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {h.tipoCambio}
                            {h.loteId && <span className="text-muted-foreground ml-1">(Bulk)</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabla de Historial de Costos */}
      {(tipoHistorial === "costos" || tipoHistorial === "ambos") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de Costos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : historialCostosFiltrado.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cambios de costo registrados
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Repuesto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Anterior</TableHead>
                      <TableHead className="text-right">Nuevo</TableHead>
                      <TableHead className="text-right">Variación</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historialCostosFiltrado.map((h) => {
                      const cambio =
                        h.costoAnteriorArs && h.costoAnteriorArs > 0
                          ? ((h.costoNuevoArs - h.costoAnteriorArs) / h.costoAnteriorArs) * 100
                          : 0;

                      return (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium">{h.repuesto.nombre}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(h.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell className="text-right">
                            ${(h.costoAnteriorArs || 0).toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${h.costoNuevoArs.toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={cambio > 0 ? "destructive" : "default"}>
                              {cambio > 0 ? "+" : ""}
                              {cambio.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {h.motivo || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gráfico de evolución */}
      {repuestoSeleccionado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Evolución de Precio y Costo - {repuestoSeleccionado.nombre}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
              <div className="text-center py-8 text-muted-foreground">Cargando gráfico...</div>
            ) : chartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay suficientes datos históricos para mostrar evolución
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    yAxisId="left"
                    label={{ value: "ARS", angle: -90, position: "insideLeft" }}
                    tickFormatter={(val) => `$${val.toLocaleString("es-AR")}`}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (value === null || value === undefined) return ["-", name];
                      const numValue = Number(value);
                      if (isNaN(numValue)) return ["-", name];
                      if (name === "margen") return [`${numValue.toFixed(1)}%`, "Margen"];
                      return [`$${numValue.toLocaleString("es-AR")}`, name === "precio" ? "Precio" : "Costo"];
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="margen"
                    fill="#22c55e"
                    fillOpacity={0.15}
                    stroke="none"
                    connectNulls
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="precio"
                    stroke="#5CE1E6"
                    strokeWidth={2}
                    dot={{ fill: "#5CE1E6", r: 4 }}
                    name="Precio de venta"
                    connectNulls
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="costo"
                    stroke="#6b7280"
                    strokeWidth={2}
                    dot={{ fill: "#6b7280", r: 4 }}
                    name="Costo promedio"
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {repuestoFiltro && !repuestoSeleccionado && historialPreciosFiltrado.length + historialCostosFiltrado.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución de Precio y Costo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              Múltiples repuestos coinciden con la búsqueda. Refina el filtro para ver la evolución de un repuesto específico.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
