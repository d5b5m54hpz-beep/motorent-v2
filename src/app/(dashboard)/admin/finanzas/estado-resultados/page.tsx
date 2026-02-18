"use client";

import { useState, useEffect } from "react";
import {
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ChevronDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type EstadoResultadosData = {
  periodo: { desde: string; hasta: string };
  ingresos: {
    alquileres: number;
    repuestos: number;
    total: number;
    porcentaje: number;
  };
  costosDirectos: {
    mantenimiento: number;
    depreciacion: number;
    total: number;
    porcentaje: number;
  };
  margenBruto: {
    valor: number;
    porcentaje: number;
  };
  gastosOperativos: {
    sueldos: number;
    otros: number;
    total: number;
    porcentaje: number;
  };
  ebitda: {
    valor: number;
    porcentaje: number;
  };
  ebit: {
    valor: number;
    porcentaje: number;
  };
  impuestos: {
    valor: number;
    porcentaje: number;
  };
  resultadoNeto: {
    valor: number;
    porcentaje: number;
  };
  comparacion?: {
    ingresos: { anterior: number; variacion: number };
    margenBruto: { anterior: number; variacion: number };
    ebitda: { anterior: number; variacion: number };
    resultadoNeto: { anterior: number; variacion: number };
  } | null;
};

const PERIODOS = [
  { value: "mes_actual", label: "Mes Actual" },
  { value: "trimestre", label: "Último Trimestre" },
  { value: "semestre", label: "Último Semestre" },
  { value: "anio", label: "Último Año" },
  { value: "custom", label: "Personalizado" },
];

function calcularFechas(periodo: string): { desde: string; hasta: string } {
  const hoy = new Date();
  let desde = new Date();
  const hasta = hoy.toISOString().split("T")[0];

  switch (periodo) {
    case "mes_actual":
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      break;
    case "trimestre":
      desde = new Date(hoy);
      desde.setMonth(hoy.getMonth() - 3);
      break;
    case "semestre":
      desde = new Date(hoy);
      desde.setMonth(hoy.getMonth() - 6);
      break;
    case "anio":
      desde = new Date(hoy);
      desde.setFullYear(hoy.getFullYear() - 1);
      break;
    default:
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }

  return {
    desde: desde.toISOString().split("T")[0],
    hasta,
  };
}

export default function EstadoResultadosPage() {
  const [data, setData] = useState<EstadoResultadosData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodo, setPeriodo] = useState("mes_actual");
  const [customDesde, setCustomDesde] = useState("");
  const [customHasta, setCustomHasta] = useState("");
  const [comparar, setComparar] = useState(true);

  useEffect(() => {
    const { desde, hasta } =
      periodo === "custom" && customDesde && customHasta
        ? { desde: customDesde, hasta: customHasta }
        : calcularFechas(periodo);

    setIsLoading(true);
    fetch(
      `/api/finanzas/estado-resultados?desde=${desde}&hasta=${hasta}&comparar=${comparar}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [periodo, customDesde, customHasta, comparar]);

  const handleExportExcel = () => {
    if (!data) return;
    const rows = [
      ["Estado de Resultados - MotoLibre"],
      [`Período: ${data.periodo.desde} al ${data.periodo.hasta}`],
      [],
      ["Concepto", "Monto", "% Ingresos"],
      ["INGRESOS OPERATIVOS", "", ""],
      ["  Alquileres de Motos", data.ingresos.alquileres.toString(), ((data.ingresos.alquileres / data.ingresos.total) * 100).toFixed(1) + "%"],
      ["  Venta de Repuestos", data.ingresos.repuestos.toString(), ((data.ingresos.repuestos / data.ingresos.total) * 100).toFixed(1) + "%"],
      ["TOTAL INGRESOS", data.ingresos.total.toString(), "100.0%"],
      [],
      ["COSTOS DIRECTOS", "", ""],
      ["  Mantenimiento y Operación", (-data.costosDirectos.mantenimiento).toString(), (data.costosDirectos.mantenimiento / data.ingresos.total * 100).toFixed(1) + "%"],
      ["  Depreciación Flota", (-data.costosDirectos.depreciacion).toString(), (data.costosDirectos.depreciacion / data.ingresos.total * 100).toFixed(1) + "%"],
      ["TOTAL COSTOS DIRECTOS", (-data.costosDirectos.total).toString(), data.costosDirectos.porcentaje.toFixed(1) + "%"],
      [],
      ["MARGEN BRUTO", data.margenBruto.valor.toString(), data.margenBruto.porcentaje.toFixed(1) + "%"],
      [],
      ["GASTOS OPERATIVOS", "", ""],
      ["  Sueldos y Cargas Sociales", (-data.gastosOperativos.sueldos).toString(), (data.gastosOperativos.sueldos / data.ingresos.total * 100).toFixed(1) + "%"],
      ["  Otros Gastos", (-data.gastosOperativos.otros).toString(), (data.gastosOperativos.otros / data.ingresos.total * 100).toFixed(1) + "%"],
      ["TOTAL GASTOS OPERATIVOS", (-data.gastosOperativos.total).toString(), data.gastosOperativos.porcentaje.toFixed(1) + "%"],
      [],
      ["EBITDA", data.ebitda.valor.toString(), data.ebitda.porcentaje.toFixed(1) + "%"],
      ["EBIT", data.ebit.valor.toString(), data.ebit.porcentaje.toFixed(1) + "%"],
      ["Impuestos", (-data.impuestos.valor).toString(), data.impuestos.porcentaje.toFixed(1) + "%"],
      [],
      ["RESULTADO NETO", data.resultadoNeto.valor.toString(), data.resultadoNeto.porcentaje.toFixed(1) + "%"],
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estado-resultados-${data.periodo.desde}-${data.periodo.hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Estado de Resultados (P&amp;L)</h1>
        </div>
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Estado de Resultados (P&amp;L)</h1>
        <p className="text-muted-foreground">Error al cargar datos.</p>
      </div>
    );
  }

  const renderLineaConVariacion = (
    label: string,
    valor: number,
    porcentaje: number,
    variacion?: number,
    isBold = false,
    isNegative = false,
    nivel = 0
  ) => {
    const valorDisplay = isNegative ? -Math.abs(valor) : valor;
    const textClass = isBold ? "font-bold" : "font-medium";
    const colorClass =
      nivel === 0
        ? valorDisplay >= 0
          ? "text-teal-600 dark:text-teal-400"
          : "text-red-600 dark:text-red-400"
        : "";

    return (
      <div
        className={`flex items-center justify-between py-3 border-b last:border-b-0 ${
          nivel > 0 ? "pl-8" : ""
        }`}
      >
        <span className={textClass}>{label}</span>
        <div className="flex items-center gap-6">
          <span className={`${textClass} ${colorClass} min-w-[120px] text-right`}>
            {formatCurrency(valorDisplay)}
          </span>
          <span className="text-sm text-muted-foreground min-w-[60px] text-right">
            {porcentaje.toFixed(1)}%
          </span>
          {variacion !== undefined && (
            <div className="flex items-center gap-1 min-w-[80px] justify-end">
              {variacion > 0 ? (
                <TrendingUp className="h-4 w-4 text-teal-500" />
              ) : variacion < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : null}
              <span
                className={`text-sm font-medium ${
                  variacion > 0
                    ? "text-teal-600 dark:text-teal-400"
                    : variacion < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                }`}
              >
                {variacion > 0 ? "+" : ""}
                {variacion.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Estado de Resultados (P&amp;L)
          </h1>
          <p className="text-muted-foreground">
            Análisis de ingresos, costos y rentabilidad
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {periodo === "custom" && (
            <>
              <div className="space-y-2">
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={customDesde}
                  onChange={(e) => setCustomDesde(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={customHasta}
                  onChange={(e) => setCustomHasta(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="comparar"
              checked={comparar}
              onCheckedChange={setComparar}
            />
            <Label htmlFor="comparar" className="cursor-pointer">
              Comparar con período anterior
            </Label>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Período: {data.periodo.desde} al {data.periodo.hasta}
        </div>
      </div>

      {/* P&L Statement */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Estado de Resultados</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Monto</span>
              <span className="min-w-[60px] text-right">% Ingresos</span>
              {comparar && data.comparacion && (
                <span className="min-w-[80px] text-right">Variación</span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-2">
          {/* INGRESOS OPERATIVOS */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              INGRESOS OPERATIVOS
            </h3>
            {renderLineaConVariacion(
              "Alquileres de Motos",
              data.ingresos.alquileres,
              (data.ingresos.alquileres / data.ingresos.total) * 100,
              undefined,
              false,
              false,
              1
            )}
            {data.ingresos.repuestos > 0 &&
              renderLineaConVariacion(
                "Venta de Repuestos",
                data.ingresos.repuestos,
                (data.ingresos.repuestos / data.ingresos.total) * 100,
                undefined,
                false,
                false,
                1
              )}
            {renderLineaConVariacion(
              "TOTAL INGRESOS",
              data.ingresos.total,
              data.ingresos.porcentaje,
              data.comparacion?.ingresos.variacion,
              true
            )}
          </div>

          {/* COSTOS DIRECTOS */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              COSTOS DIRECTOS
            </h3>
            {renderLineaConVariacion(
              "Mantenimiento y Operación",
              data.costosDirectos.mantenimiento,
              (data.costosDirectos.mantenimiento / data.ingresos.total) * 100,
              undefined,
              false,
              true,
              1
            )}
            {data.costosDirectos.depreciacion > 0 &&
              renderLineaConVariacion(
                "Depreciación Flota",
                data.costosDirectos.depreciacion,
                (data.costosDirectos.depreciacion / data.ingresos.total) * 100,
                undefined,
                false,
                true,
                1
              )}
            {renderLineaConVariacion(
              "TOTAL COSTOS DIRECTOS",
              data.costosDirectos.total,
              data.costosDirectos.porcentaje,
              undefined,
              true,
              true
            )}
          </div>

          {/* MARGEN BRUTO */}
          <div className="bg-muted/30 -mx-6 px-6 py-2 my-4">
            {renderLineaConVariacion(
              "MARGEN BRUTO",
              data.margenBruto.valor,
              data.margenBruto.porcentaje,
              data.comparacion?.margenBruto.variacion,
              true
            )}
          </div>

          {/* GASTOS OPERATIVOS */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              GASTOS OPERATIVOS
            </h3>
            {renderLineaConVariacion(
              "Sueldos y Cargas Sociales",
              data.gastosOperativos.sueldos,
              (data.gastosOperativos.sueldos / data.ingresos.total) * 100,
              undefined,
              false,
              true,
              1
            )}
            {renderLineaConVariacion(
              "Otros Gastos Operativos",
              data.gastosOperativos.otros,
              (data.gastosOperativos.otros / data.ingresos.total) * 100,
              undefined,
              false,
              true,
              1
            )}
            {renderLineaConVariacion(
              "TOTAL GASTOS OPERATIVOS",
              data.gastosOperativos.total,
              data.gastosOperativos.porcentaje,
              undefined,
              true,
              true
            )}
          </div>

          {/* EBITDA */}
          <div className="bg-muted/30 -mx-6 px-6 py-2 my-4">
            {renderLineaConVariacion(
              "EBITDA",
              data.ebitda.valor,
              data.ebitda.porcentaje,
              data.comparacion?.ebitda.variacion,
              true
            )}
          </div>

          {/* EBIT */}
          <div className="mb-4">
            {data.costosDirectos.depreciacion > 0 &&
              renderLineaConVariacion(
                "Depreciación",
                data.costosDirectos.depreciacion,
                (data.costosDirectos.depreciacion / data.ingresos.total) * 100,
                undefined,
                false,
                true,
                1
              )}
            {renderLineaConVariacion(
              "RESULTADO OPERATIVO (EBIT)",
              data.ebit.valor,
              data.ebit.porcentaje,
              undefined,
              true
            )}
          </div>

          {/* IMPUESTOS */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              IMPUESTOS
            </h3>
            {renderLineaConVariacion(
              "Impuestos y Tasas",
              data.impuestos.valor,
              data.impuestos.porcentaje,
              undefined,
              false,
              true,
              1
            )}
          </div>

          {/* RESULTADO NETO */}
          <div className="bg-primary/10 -mx-6 px-6 py-3 mt-6 border-t-2 border-primary">
            {renderLineaConVariacion(
              "RESULTADO NETO",
              data.resultadoNeto.valor,
              data.resultadoNeto.porcentaje,
              data.comparacion?.resultadoNeto.variacion,
              true
            )}
          </div>
        </div>
      </div>

      {/* Comparison Summary (if enabled) */}
      {comparar && data.comparacion && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Resumen Comparativo</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Ingresos</p>
              <div className="flex items-center gap-2">
                {data.comparacion.ingresos.variacion > 0 ? (
                  <TrendingUp className="h-4 w-4 text-teal-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <Badge
                  variant={
                    data.comparacion.ingresos.variacion > 0
                      ? "default"
                      : "destructive"
                  }
                >
                  {data.comparacion.ingresos.variacion > 0 ? "+" : ""}
                  {data.comparacion.ingresos.variacion.toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Margen Bruto</p>
              <div className="flex items-center gap-2">
                {data.comparacion.margenBruto.variacion > 0 ? (
                  <TrendingUp className="h-4 w-4 text-teal-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <Badge
                  variant={
                    data.comparacion.margenBruto.variacion > 0
                      ? "default"
                      : "destructive"
                  }
                >
                  {data.comparacion.margenBruto.variacion > 0 ? "+" : ""}
                  {data.comparacion.margenBruto.variacion.toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">EBITDA</p>
              <div className="flex items-center gap-2">
                {data.comparacion.ebitda.variacion > 0 ? (
                  <TrendingUp className="h-4 w-4 text-teal-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <Badge
                  variant={
                    data.comparacion.ebitda.variacion > 0
                      ? "default"
                      : "destructive"
                  }
                >
                  {data.comparacion.ebitda.variacion > 0 ? "+" : ""}
                  {data.comparacion.ebitda.variacion.toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Resultado Neto</p>
              <div className="flex items-center gap-2">
                {data.comparacion.resultadoNeto.variacion > 0 ? (
                  <TrendingUp className="h-4 w-4 text-teal-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <Badge
                  variant={
                    data.comparacion.resultadoNeto.variacion > 0
                      ? "default"
                      : "destructive"
                  }
                >
                  {data.comparacion.resultadoNeto.variacion > 0 ? "+" : ""}
                  {data.comparacion.resultadoNeto.variacion.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
