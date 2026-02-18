"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResumenAnomalias } from "@/components/anomalias/ResumenAnomalias";
import { SeveridadBadge } from "@/components/anomalias/SeveridadBadge";
import { EstadoBadge } from "@/components/anomalias/EstadoBadge";
import { AlertTriangle, Play, Loader2, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";

type AnomaliaItem = {
  id: string;
  tipo: string;
  severidad: string;
  titulo: string;
  descripcion: string;
  montoInvolucrado: string | number | null;
  estado: string;
  autoDetectada: boolean;
  createdAt: string;
};

type ResumenData = {
  totalPorSeveridad: Array<{ severidad: string; total: number }>;
  totalPorTipo: Array<{ tipo: string; total: number }>;
  totalPorEstado: Array<{ estado: string; total: number }>;
  tendencia7dias: Record<string, number>;
};

type AnalisisItem = {
  id: string;
  tipo: string;
  fechaAnalisis: string;
  periodo: string;
  metricas: Record<string, unknown>;
  alertasGeneradas: number;
  createdAt: string;
};

const TIPO_OPTIONS = [
  { value: "GASTO_INUSUAL", label: "Gasto Inusual" },
  { value: "PAGO_DUPLICADO", label: "Pago Duplicado" },
  { value: "FACTURA_SIN_PAGO", label: "Factura Sin Pago" },
  { value: "MARGEN_BAJO", label: "Margen Bajo" },
  { value: "STOCK_CRITICO", label: "Stock Critico" },
  { value: "PATRON_SOSPECHOSO", label: "Patron Sospechoso" },
  { value: "DESVIO_PRESUPUESTO", label: "Desvio Presupuesto" },
  { value: "VENCIMIENTO_PROXIMO", label: "Vencimiento Proximo" },
  { value: "FLUJO_CAJA_NEGATIVO", label: "Flujo Caja Negativo" },
  { value: "CONCILIACION_PENDIENTE", label: "Conciliacion Pendiente" },
];

const TIPO_LABELS: Record<string, string> = Object.fromEntries(
  TIPO_OPTIONS.map((o) => [o.value, o.label])
);

function AnomaliasPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data
  const [anomalias, setAnomalias] = useState<AnomaliaItem[]>([]);
  const [resumen, setResumen] = useState<ResumenData | null>(null);
  const [analisis, setAnalisis] = useState<AnalisisItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingResumen, setLoadingResumen] = useState(true);

  // Filters from URL
  const page = parseInt(searchParams.get("page") || "1");
  const tipo = searchParams.get("tipo") || "";
  const severidad = searchParams.get("severidad") || "";
  const estado = searchParams.get("estado") || "";
  const fechaDesde = searchParams.get("desde") || "";
  const fechaHasta = searchParams.get("hasta") || "";

  // Analysis dialog
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisType, setAnalysisType] = useState("DIARIO");
  const [runningAnalysis, setRunningAnalysis] = useState(false);

  // Update URL params
  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key !== "page") params.set("page", "1");
      router.push(`/anomalias?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Fetch anomalias
  const fetchAnomalias = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "15");
      if (tipo) params.set("tipo", tipo);
      if (severidad) params.set("severidad", severidad);
      if (estado) params.set("estado", estado);
      if (fechaDesde) params.set("fechaDesde", fechaDesde);
      if (fechaHasta) params.set("fechaHasta", fechaHasta);

      const res = await fetch(`/api/anomalias?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAnomalias(data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
      }
    } catch {
      toast.error("Error al cargar anomalias");
    } finally {
      setLoading(false);
    }
  }, [page, tipo, severidad, estado, fechaDesde, fechaHasta]);

  // Fetch resumen
  const fetchResumen = useCallback(async () => {
    setLoadingResumen(true);
    try {
      const res = await fetch("/api/anomalias/resumen");
      if (res.ok) {
        setResumen(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoadingResumen(false);
    }
  }, []);

  // Fetch analysis history
  const fetchAnalisis = useCallback(async () => {
    try {
      const res = await fetch("/api/anomalias/analisis?limit=10");
      if (res.ok) {
        const data = await res.json();
        setAnalisis(data.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAnomalias();
  }, [fetchAnomalias]);

  useEffect(() => {
    fetchResumen();
    fetchAnalisis();
  }, [fetchResumen, fetchAnalisis]);

  // Run analysis
  const handleRunAnalysis = async () => {
    setRunningAnalysis(true);
    try {
      const res = await fetch("/api/anomalias/analisis/ejecutar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: analysisType }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Analisis ${analysisType.toLowerCase()} completado: ${data.anomaliasDetectadas} anomalias detectadas`
        );
        setAnalysisOpen(false);
        fetchAnomalias();
        fetchResumen();
        fetchAnalisis();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al ejecutar analisis");
      }
    } catch {
      toast.error("Error al ejecutar analisis");
    } finally {
      setRunningAnalysis(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Anomalias
          </h1>
          <p className="text-muted-foreground">
            Deteccion y gestion de anomalias financieras y operativas
          </p>
        </div>
        <Button onClick={() => setAnalysisOpen(true)}>
          <Play className="h-4 w-4 mr-1" />
          Ejecutar Analisis
        </Button>
      </div>

      {/* Summary Cards */}
      {loadingResumen ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <ResumenAnomalias data={resumen} />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={tipo} onValueChange={(v) => updateFilter("tipo", v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {TIPO_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={severidad}
          onValueChange={(v) => updateFilter("severidad", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="CRITICA">Critica</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="MEDIA">Media</SelectItem>
            <SelectItem value="BAJA">Baja</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={estado}
          onValueChange={(v) => updateFilter("estado", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="NUEVA">Nueva</SelectItem>
            <SelectItem value="EN_REVISION">En Revision</SelectItem>
            <SelectItem value="RESUELTA">Resuelta</SelectItem>
            <SelectItem value="DESCARTADA">Descartada</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-[160px]"
          value={fechaDesde}
          onChange={(e) => updateFilter("desde", e.target.value)}
          placeholder="Desde"
        />
        <Input
          type="date"
          className="w-[160px]"
          value={fechaHasta}
          onChange={(e) => updateFilter("hasta", e.target.value)}
          placeholder="Hasta"
        />

        {(tipo || severidad || estado || fechaDesde || fechaHasta) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/anomalias")}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Anomalias Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <>
          <div className="border rounded-md">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-sm font-medium w-[100px]">Severidad</th>
                  <th className="text-left p-3 text-sm font-medium w-[160px]">Tipo</th>
                  <th className="text-left p-3 text-sm font-medium">Titulo</th>
                  <th className="text-right p-3 text-sm font-medium w-[120px]">Monto</th>
                  <th className="text-left p-3 text-sm font-medium w-[100px]">Estado</th>
                  <th className="text-left p-3 text-sm font-medium w-[140px]">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {anomalias.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/anomalias/${a.id}`)}
                  >
                    <td className="p-3">
                      <SeveridadBadge severidad={a.severidad} />
                    </td>
                    <td className="p-3">
                      <span className="text-sm">
                        {TIPO_LABELS[a.tipo] || a.tipo}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="text-sm font-medium truncate max-w-[300px]">{a.titulo}</p>
                    </td>
                    <td className="p-3 text-right">
                      {a.montoInvolucrado ? (
                        <span className="text-sm font-semibold">
                          {formatMoney(Number(a.montoInvolucrado))}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">&mdash;</span>
                      )}
                    </td>
                    <td className="p-3">
                      <EstadoBadge estado={a.estado} />
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString("es-AR")}
                    </td>
                  </tr>
                ))}
                {anomalias.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No se encontraron anomalias
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {total} anomalias - Pagina {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => updateFilter("page", String(page - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => updateFilter("page", String(page + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Separator />

      {/* Analysis History */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Historial de Analisis
        </h2>
        {analisis.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay analisis ejecutados</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analisis.map((a) => {
              const metricas = a.metricas as Record<string, number>;
              return (
                <Card key={a.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {a.tipo === "DIARIO" ? "Diario" : a.tipo === "SEMANAL" ? "Semanal" : "Mensual"}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {a.alertasGeneradas} alertas
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">
                      {a.periodo} - {new Date(a.fechaAnalisis).toLocaleString("es-AR")}
                    </p>
                    {metricas && (
                      <div className="text-xs space-y-1">
                        {metricas.ingresos !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ingresos</span>
                            <span className="font-medium">{formatMoney(metricas.ingresos)}</span>
                          </div>
                        )}
                        {metricas.egresos !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Egresos</span>
                            <span className="font-medium">{formatMoney(metricas.egresos)}</span>
                          </div>
                        )}
                        {metricas.margenOperativo !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Margen</span>
                            <span className="font-medium">{Number(metricas.margenOperativo).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Analysis Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ejecutar Analisis Financiero</DialogTitle>
            <DialogDescription>
              Ejecuta los 9 detectores de anomalias y genera un informe financiero.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={analysisType} onValueChange={setAnalysisType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DIARIO">Diario — Metricas del dia</SelectItem>
                <SelectItem value="SEMANAL">Semanal — Comparacion vs semana anterior</SelectItem>
                <SelectItem value="MENSUAL">Mensual — Comparacion interanual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnalysisOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRunAnalysis} disabled={runningAnalysis}>
              {runningAnalysis && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Ejecutar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AnomaliasPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      }
    >
      <AnomaliasPageContent />
    </Suspense>
  );
}
