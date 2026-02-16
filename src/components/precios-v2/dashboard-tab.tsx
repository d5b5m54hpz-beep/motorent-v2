"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, DollarSign, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

type DashboardData = {
  kpis: {
    margenPromedio: number;
    itemsBajoMargen: number;
    valorInventarioCosto: number;
    valorInventarioPrecio: number;
  };
  distribucion: {
    critico: number;
    bajo: number;
    aceptable: number;
    optimo: number;
    alto: number;
  };
  margenPorCategoria: Array<{
    categoria: string;
    totalProductos: number;
    margenPromedio: number;
    margenObjetivo: number;
  }>;
};

type Sugerencia = {
  repuestoId: string;
  codigo: string | null;
  nombre: string;
  categoria: string | null;
  tipo: string;
  severidad: string;
  costoLanded: number;
  precioActual: number;
  margenActual: number;
  precioSugerido: number;
  margenSugerido: number;
  motivo: string;
};

export function DashboardTab() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isLoadingSugerencias, setIsLoadingSugerencias] = useState(false);
  const [isApplying, setIsApplying] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
    fetchSugerencias();
  }, []);

  const fetchDashboard = async () => {
    setIsLoadingDashboard(true);
    try {
      const res = await fetch("/api/precios-repuestos/dashboard");
      if (!res.ok) throw new Error("Error al cargar dashboard");
      const data = await res.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar dashboard");
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const fetchSugerencias = async () => {
    setIsLoadingSugerencias(true);
    try {
      const res = await fetch("/api/precios-repuestos/generar-sugerencias", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Error al generar sugerencias");
      const data = await res.json();
      setSugerencias(data.sugerencias || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar sugerencias");
    } finally {
      setIsLoadingSugerencias(false);
    }
  };

  const aplicarSugerencia = async (sugerencia: Sugerencia) => {
    setIsApplying(sugerencia.repuestoId);
    try {
      const res = await fetch("/api/precios-repuestos/aplicar-sugerencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repuestoId: sugerencia.repuestoId,
          nuevoPrecio: sugerencia.precioSugerido,
          motivo: sugerencia.motivo,
        }),
      });

      if (!res.ok) throw new Error("Error al aplicar sugerencia");

      const result = await res.json();
      toast.success(
        `Precio actualizado: ${result.repuesto} - ${result.precioAnterior.toLocaleString("es-AR", { style: "currency", currency: "ARS" })} → ${result.precioNuevo.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}`
      );

      // Eliminar sugerencia aplicada
      setSugerencias((prev) => prev.filter((s) => s.repuestoId !== sugerencia.repuestoId));

      // Recargar dashboard
      fetchDashboard();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al aplicar sugerencia");
    } finally {
      setIsApplying(null);
    }
  };

  const ignorarSugerencia = (repuestoId: string) => {
    setSugerencias((prev) => prev.filter((s) => s.repuestoId !== repuestoId));
    toast.info("Sugerencia ignorada");
  };

  if (isLoadingDashboard || !dashboardData) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { kpis, distribucion, margenPorCategoria } = dashboardData;

  // Datos para gráfico de distribución
  const distribucionData = [
    { rango: "Crítico\n<10%", cantidad: distribucion.critico, fill: "#ef4444" },
    { rango: "Bajo\n10-25%", cantidad: distribucion.bajo, fill: "#f59e0b" },
    { rango: "Aceptable\n25-45%", cantidad: distribucion.aceptable, fill: "#10b981" },
    { rango: "Óptimo\n45-60%", cantidad: distribucion.optimo, fill: "#059669" },
    { rango: "Alto\n>60%", cantidad: distribucion.alto, fill: "#3b82f6" },
  ];

  // Datos para gráfico de categorías
  const categoriaData = margenPorCategoria.slice(0, 8).map((cat) => ({
    categoria: cat.categoria || "Sin categoría",
    margen: cat.margenPromedio * 100,
    fill:
      cat.margenPromedio < 0.25
        ? "#ef4444"
        : cat.margenPromedio < cat.margenObjetivo
        ? "#f59e0b"
        : "#10b981",
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(kpis.margenPromedio * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {kpis.margenPromedio >= 0.40 ? "✓" : "⚠"} Objetivo: 45%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Bajo Margen</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.itemsBajoMargen}</div>
            <p className="text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sugerencias IA</CardTitle>
            <Lightbulb className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{sugerencias.length}</div>
            <p className="text-xs text-muted-foreground">cambios sugeridos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
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

      {/* Sugerencias IA */}
      {sugerencias.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Sugerencias de Precio — {sugerencias.length} cambios sugeridos
            </CardTitle>
            <CardDescription>
              El sistema detectó precios que podrían optimizarse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingSugerencias ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : (
              <>
                {sugerencias.slice(0, 5).map((sug) => (
                  <div
                    key={sug.repuestoId}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {sug.severidad === "CRITICO" && (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="font-medium">
                            {sug.codigo || "SIN-COD"} — {sug.nombre}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Margen actual:{" "}
                          <span
                            className={
                              sug.margenActual < 0.10
                                ? "text-red-600 font-semibold"
                                : sug.margenActual < 0.25
                                ? "text-yellow-600 font-semibold"
                                : ""
                            }
                          >
                            {(sug.margenActual * 100).toFixed(1)}%
                          </span>{" "}
                          {sug.severidad === "CRITICO" && "(CRÍTICO)"}
                        </div>
                        <div className="text-sm mt-1">
                          Costo landed: ${sug.costoLanded.toLocaleString("es-AR")} | Precio
                          actual: ${sug.precioActual.toLocaleString("es-AR")} | Margen:{" "}
                          {(sug.margenActual * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm mt-2 font-medium text-primary">
                          💡 Sugerencia: {sug.tipo === "SUBIR" ? "Subir" : "Bajar"} a $
                          {sug.precioSugerido.toLocaleString("es-AR")} → Margen:{" "}
                          {(sug.margenSugerido * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Motivo: "{sug.motivo}"
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => aplicarSugerencia(sug)}
                          disabled={isApplying === sug.repuestoId}
                        >
                          {isApplying === sug.repuestoId ? "Aplicando..." : "Aplicar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => ignorarSugerencia(sug.repuestoId)}
                          disabled={isApplying === sug.repuestoId}
                        >
                          Ignorar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Márgenes</CardTitle>
            <CardDescription>Cantidad de repuestos por rango de margen</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribucionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rango" style={{ fontSize: "12px" }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad">
                  {distribucionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Margen por Categoría</CardTitle>
            <CardDescription>Margen promedio de cada categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoriaData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="categoria" type="category" width={120} style={{ fontSize: "11px" }} />
                <Tooltip />
                <Bar dataKey="margen">
                  {categoriaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
