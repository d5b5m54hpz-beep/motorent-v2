"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { PlanCard, type Plan } from "./PlanCard";
import { PlanEditSheet } from "./PlanEditSheet";
import { PrecioMatriz, type PrecioRow } from "./PrecioMatriz";

type CalcResultPlan = {
  planId: string;
  planCodigo: string;
  planNombre: string;
  esRentToOwn: boolean;
  precios: { mensual: { conDescuento: number; deposito: number } };
  margen: { pct: number; objetivo: number };
};

export function PlanesTab() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [precios, setPrecios] = useState<PrecioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, number | null>>({});

  const loadData = useCallback(async () => {
    try {
      const [planesRes, preciosRes] = await Promise.all([
        fetch("/api/pricing-engine/planes?all=true").then((r) => r.json()),
        fetch("/api/pricing-engine/precios").then((r) => r.json()),
      ]);
      setPlanes(planesRes);
      setPrecios(preciosRes);
    } catch {
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRecalcularTodos = async () => {
    setRecalculating(true);
    try {
      // Get unique modelos from existing precios
      const modelos = [...new Set(precios.map((p) => p.modeloMoto))];
      if (modelos.length === 0) {
        toast.info("No hay modelos con precios guardados. Calculá desde el Simulador.");
        return;
      }

      let savedCount = 0;
      for (const modeloMoto of modelos) {
        const calcRes = await fetch("/api/pricing-engine/calcular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modeloMoto }),
        });
        if (!calcRes.ok) continue;
        const calcData = await calcRes.json();

        const upserts = (calcData.planes as CalcResultPlan[]).map((plan) => ({
          modeloMoto,
          planId: plan.planId,
          precioBase: plan.precios.mensual.conDescuento,
          precioConDescuento: plan.precios.mensual.conDescuento,
          deposito: plan.precios.mensual.deposito,
          margenPct: plan.margen.pct,
          margenObjetivoPct: plan.margen.objetivo,
          activo: true,
        }));

        const saveRes = await fetch("/api/pricing-engine/precios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ precios: upserts }),
        });
        if (saveRes.ok) savedCount++;
      }

      toast.success(`Recalculados ${savedCount} modelos`);
      await loadData();
    } catch {
      toast.error("Error al recalcular");
    } finally {
      setRecalculating(false);
    }
  };

  const handleMatrizChange = (id: string, newPrecio: number | null) => {
    setPendingChanges((prev) => ({ ...prev, [id]: newPrecio }));
  };

  const handleGuardarCambios = async () => {
    const entries = Object.entries(pendingChanges);
    if (entries.length === 0) {
      toast.info("Sin cambios pendientes");
      return;
    }
    setSaving(true);
    try {
      const updates = entries.map(([id, precioManual]) => ({ id, precioManual }));
      const res = await fetch("/api/pricing-engine/precios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precios: updates }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success(`${entries.length} precio(s) actualizados`);
      setPendingChanges({});
      await loadData();
    } catch {
      toast.error("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditPlan(plan);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const pendingCount = Object.keys(pendingChanges).length;

  return (
    <div className="space-y-6">
      {/* Plan Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {planes.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onEdit={handleEdit} />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleRecalcularTodos}
          disabled={recalculating || saving}
        >
          {recalculating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {recalculating ? "Recalculando..." : "Recalcular Todos"}
        </Button>
        <Button
          onClick={handleGuardarCambios}
          disabled={saving || pendingCount === 0}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Guardando..." : pendingCount > 0 ? `Guardar ${pendingCount} cambio(s)` : "Sin cambios"}
        </Button>
      </div>

      {/* Matriz editable */}
      <PrecioMatriz precios={precios} onChange={handleMatrizChange} />

      {/* Sheet editor */}
      <PlanEditSheet
        plan={editPlan}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={loadData}
      />
    </div>
  );
}
