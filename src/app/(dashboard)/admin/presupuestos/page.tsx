"use client";

import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { categoriaGastoLabels } from "@/lib/validations";
import { Save, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type PresupuestoRow = {
  categoria: string;
  montoPresupuestado: number;
  gastoReal: number;
  porcentaje: number;
};

export default function PresupuestosPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [rows, setRows] = useState<PresupuestoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async (m: number, a: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/presupuestos?mes=${m}&anio=${a}`);
      if (res.ok) {
        const d = await res.json();
        setRows(d.data ?? []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(mes, anio);
  }, [mes, anio, fetchData]);

  const handleMontoChange = (categoria: string, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.categoria === categoria
          ? { ...r, montoPresupuestado: parseFloat(value) || 0 }
          : r
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const promises = rows
        .filter((r) => r.montoPresupuestado > 0)
        .map((r) =>
          fetch("/api/presupuestos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mes,
              anio,
              categoria: r.categoria,
              montoPresupuestado: r.montoPresupuestado,
            }),
          })
        );
      await Promise.all(promises);
      toast.success("Presupuestos guardados");
      fetchData(mes, anio);
    } catch {
      toast.error("Error al guardar presupuestos");
    } finally {
      setIsSaving(false);
    }
  };

  const goPrev = () => {
    if (mes === 1) {
      setMes(12);
      setAnio(anio - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const goNext = () => {
    if (mes === 12) {
      setMes(1);
      setAnio(anio + 1);
    } else {
      setMes(mes + 1);
    }
  };

  const mesNombre = new Date(anio, mes - 1).toLocaleString("es-AR", { month: "long" });
  const totalPresupuestado = rows.reduce((s, r) => s + r.montoPresupuestado, 0);
  const totalGastado = rows.reduce((s, r) => s + r.gastoReal, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Presupuestos Mensuales</h1>
          <p className="text-muted-foreground">Definí presupuestos por categoría de gasto</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar
        </Button>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={goPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold capitalize min-w-[200px] text-center">
          {mesNombre} {anio}
        </span>
        <Button variant="outline" size="icon" onClick={goNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Presupuestado</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{formatCurrency(totalPresupuestado)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Gastado</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{formatCurrency(totalGastado)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Saldo</p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${totalPresupuestado - totalGastado >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {formatCurrency(totalPresupuestado - totalGastado)}
          </p>
        </div>
      </div>

      {/* Category Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const label = categoriaGastoLabels[row.categoria] ?? row.categoria;
            const pct = row.montoPresupuestado > 0
              ? Math.min(100, Math.round((row.gastoReal / row.montoPresupuestado) * 100))
              : 0;
            const isOver = row.gastoReal > row.montoPresupuestado && row.montoPresupuestado > 0;

            return (
              <div key={row.categoria} className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{label}</p>
                  <span className={`text-xs font-medium ${isOver ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                    {pct}%
                  </span>
                </div>
                <Input
                  type="number"
                  placeholder="0"
                  value={row.montoPresupuestado || ""}
                  onChange={(e) => handleMontoChange(row.categoria, e.target.value)}
                  className="h-9"
                />
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : pct > 75 ? "bg-yellow-500" : "bg-[#23e0ff]"}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Gastado: {formatCurrency(row.gastoReal)}</span>
                    <span>de {formatCurrency(row.montoPresupuestado)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
