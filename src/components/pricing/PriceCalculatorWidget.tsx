"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { OwnershipProgressBar } from "./OwnershipProgressBar";

const ARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

type PrecioRow = {
  id: string;
  modeloMoto: string;
  precioConDescuento: number | string;
  precioManual?: number | string | null;
  plan: { id: string; nombre: string; codigo: string; esRentToOwn: boolean; duracionMeses: number };
};

type Props = {
  modeloMoto: string;
  /** Cuotas pagadas para mostrar progress bar (Rent-to-Own) */
  cuotasPagadas?: number;
  patente?: string;
  className?: string;
};

type Frecuencia = "mensual" | "quincenal" | "semanal";

const FREQ_LABELS: Record<Frecuencia, string> = {
  mensual: "Mensual",
  quincenal: "Quincenal",
  semanal: "Semanal",
};

// Aproximación para frecuencias sin necesitar la API completa
function calcFrecuencia(precioMensual: number, frecuencia: Frecuencia): number {
  if (frecuencia === "quincenal") return precioMensual / 2;
  if (frecuencia === "semanal") return precioMensual / 4;
  return precioMensual;
}

export function PriceCalculatorWidget({ modeloMoto, cuotasPagadas, patente, className }: Props) {
  const [precios, setPrecios] = useState<PrecioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [frecuencia, setFrecuencia] = useState<Frecuencia>("mensual");

  useEffect(() => {
    fetch(`/api/pricing-engine/precios?modelo=${encodeURIComponent(modeloMoto)}&activo=true`)
      .then((r) => r.json())
      .then((data: PrecioRow[]) => {
        setPrecios(data);
        if (data.length > 0) setSelectedPlanId(data[0].plan.id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [modeloMoto]);

  const selectedPrecio = precios.find((p) => p.plan.id === selectedPlanId);
  const precioMensualBase = Number(selectedPrecio?.precioManual ?? selectedPrecio?.precioConDescuento ?? 0);
  const precioDisplay = calcFrecuencia(precioMensualBase, frecuencia);

  const isRtO = selectedPrecio?.plan.esRentToOwn ?? false;
  const cuotasTotales = selectedPrecio?.plan.duracionMeses ?? 24;

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }

  if (precios.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground py-4 text-center", className)}>
        Precios no disponibles para este modelo
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Plan selector tabs */}
      <div className="flex flex-wrap gap-2">
        {precios.map((p) => (
          <button
            key={p.plan.id}
            onClick={() => setSelectedPlanId(p.plan.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              p.plan.id === selectedPlanId
                ? "border-cyan-400 bg-cyan-400/10 text-cyan-600 dark:text-cyan-400"
                : "border-border text-muted-foreground hover:border-muted-foreground",
            )}
          >
            {p.plan.nombre}
            {p.plan.esRentToOwn && (
              <Badge className="ml-1.5 text-xs bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-0 px-1.5 py-0">
                Tu Moto
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Price display */}
      <Card className={cn(isRtO && "border-cyan-400/30")}>
        <CardContent className="pt-5 pb-4">
          <div className="space-y-3">
            {/* Frequency radio */}
            <RadioGroup
              value={frecuencia}
              onValueChange={(v) => setFrecuencia(v as Frecuencia)}
              className="flex gap-4"
            >
              {(Object.keys(FREQ_LABELS) as Frecuencia[]).map((f) => (
                <div key={f} className="flex items-center gap-1.5">
                  <RadioGroupItem value={f} id={`wfreq-${f}`} className="h-3.5 w-3.5" />
                  <Label htmlFor={`wfreq-${f}`} className="text-xs cursor-pointer">{FREQ_LABELS[f]}</Label>
                </div>
              ))}
            </RadioGroup>

            {/* Price */}
            <div>
              <p className="text-3xl font-bold font-mono">{ARS(precioDisplay)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {FREQ_LABELS[frecuencia].toLowerCase()} · Transferencia bancaria
              </p>
            </div>

            {/* RtO info */}
            {isRtO && (
              <div className="rounded-md bg-cyan-500/10 border border-cyan-400/20 p-2.5 text-xs text-cyan-700 dark:text-cyan-300">
                Al completar {cuotasTotales} cuotas, la moto pasa a ser tuya. Sin valor residual.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ownership progress (only for RtO with cuotasPagadas) */}
      {isRtO && cuotasPagadas !== undefined && cuotasPagadas > 0 && (
        <OwnershipProgressBar
          cuotasPagadas={cuotasPagadas}
          cuotasTotales={cuotasTotales}
          modeloMoto={modeloMoto}
          patente={patente}
        />
      )}
    </div>
  );
}
