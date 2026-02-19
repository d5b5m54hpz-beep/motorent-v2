"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ARS = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const schema = z.object({
  seguroRC: z.coerce.number().min(0),
  seguroRoboIncendio: z.coerce.number().min(0),
  patenteAnual: z.coerce.number().min(0),
  vtvAnual: z.coerce.number().min(0),
  otrosImpuestosAnuales: z.coerce.number().min(0),
  costoIoTMensual: z.coerce.number().min(0),
  mantenimientoManoObra: z.coerce.number().min(0),
  mantenimientoRepuestos: z.coerce.number().min(0),
  reservaContingenciaPct: z.coerce.number().min(0).max(100),
  diasParadaEstimadoMes: z.coerce.number().min(0),
  comisionCobranzaPct: z.coerce.number().min(0).max(100),
  costoAdminPorMoto: z.coerce.number().min(0),
  morosidadEstimadaPct: z.coerce.number().min(0).max(100),
  costoAlmacenamientoPorMoto: z.coerce.number().min(0),
  tasaInflacionMensualEst: z.coerce.number().min(0),
  costoCapitalAnualPct: z.coerce.number().min(0).max(100),
  tipoCambioUSD: z.coerce.number().positive(),
  notas: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function FieldRow({ label, name, register, suffix = "" }: {
  label: string; name: keyof FormData;
  register: ReturnType<typeof useForm<FormData>>["register"];
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <Label className="text-sm text-muted-foreground flex-1">{label}</Label>
      <div className="relative w-36">
        <Input {...register(name)} className="h-8 text-right pr-8 text-sm" />
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function Section({ title, open, onOpenChange, children }: {
  title: string; open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors">
        {title}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-2 pt-1 border border-t-0 rounded-b-lg">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CostosTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingTC, setUpdatingTC] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    seguros: true, impuestos: false, iot: false, mto: false, contingencias: false, admin: false, financiero: false,
  });
  const [showRecalcDialog, setShowRecalcDialog] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const seguroRC = watch("seguroRC") ?? 0;
  const seguroRobo = watch("seguroRoboIncendio") ?? 0;
  const seguroTotal = (Number(seguroRC) || 0) + (Number(seguroRobo) || 0);
  const manoObra = watch("mantenimientoManoObra") ?? 0;
  const repuestos = watch("mantenimientoRepuestos") ?? 0;
  const mtoTotal = (Number(manoObra) || 0) + (Number(repuestos) || 0);
  const patenteAnual = watch("patenteAnual") ?? 0;
  const vtvAnual = watch("vtvAnual") ?? 0;
  const impuestosMensual = ((Number(patenteAnual) || 0) + (Number(vtvAnual) || 0)) / 12;

  useEffect(() => {
    fetch("/api/pricing-engine/config").then((r) => r.json()).then((data) => {
      Object.keys(schema.shape).forEach((key) => {
        if (key in data) setValue(key as keyof FormData, Number(data[key]) || 0);
      });
      setValue("notas", data.notas ?? "");
    }).finally(() => setLoading(false));
  }, [setValue]);

  const toggle = (key: string) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/pricing-engine/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          seguroTotal,
          mantenimientoTotal: mtoTotal,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Costos operativos actualizados");
      setShowRecalcDialog(true);
    } catch {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTC = async () => {
    setUpdatingTC(true);
    try {
      const res = await fetch("/api/pricing-engine/tipo-cambio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fuente: "BLUELYTICS" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setValue("tipoCambioUSD", data.tipoCambioUSD);
      toast.success(`TC actualizado: ${ARS(data.tipoCambioUSD)} (var. ${data.variacionPct > 0 ? "+" : ""}${data.variacionPct}%)`);
    } catch (e) {
      toast.error("No se pudo obtener TC de Bluelytics");
    } finally {
      setUpdatingTC(false);
    }
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* 1. Seguros */}
        <Section title="1. Seguros" open={openSections.seguros} onOpenChange={() => toggle("seguros")}>
          <FieldRow label="Seguro RC (mensual)" name="seguroRC" register={register} suffix="$" />
          <FieldRow label="Seguro Robo + Incendio (mensual)" name="seguroRoboIncendio" register={register} suffix="$" />
          <div className="flex justify-between py-1.5 text-sm font-medium border-t mt-2">
            <span>Total Seguro Mensual</span>
            <span className="font-mono text-teal-500">{ARS(seguroTotal)}</span>
          </div>
        </Section>

        {/* 2. Impuestos */}
        <Section title="2. Impuestos y Habilitaciones" open={openSections.impuestos} onOpenChange={() => toggle("impuestos")}>
          <FieldRow label="Patente Anual" name="patenteAnual" register={register} suffix="$" />
          <FieldRow label="VTV Anual" name="vtvAnual" register={register} suffix="$" />
          <FieldRow label="Otros Impuestos Anuales" name="otrosImpuestosAnuales" register={register} suffix="$" />
          <div className="flex justify-between py-1.5 text-sm font-medium border-t mt-2">
            <span>Prorrateado Mensual</span>
            <span className="font-mono text-teal-500">{ARS(impuestosMensual)}</span>
          </div>
        </Section>

        {/* 3. IoT */}
        <Section title="3. IoT / Telemetría" open={openSections.iot} onOpenChange={() => toggle("iot")}>
          <FieldRow label="Costo IoT Mensual" name="costoIoTMensual" register={register} suffix="$" />
        </Section>

        {/* 4. Mantenimiento */}
        <Section title="4. Mantenimiento" open={openSections.mto} onOpenChange={() => toggle("mto")}>
          <FieldRow label="Mano de Obra (mensual)" name="mantenimientoManoObra" register={register} suffix="$" />
          <FieldRow label="Repuestos (mensual)" name="mantenimientoRepuestos" register={register} suffix="$" />
          <div className="flex justify-between py-1.5 text-sm font-medium border-t mt-2">
            <span>Total Mantenimiento</span>
            <span className="font-mono text-teal-500">{ARS(mtoTotal)}</span>
          </div>
        </Section>

        {/* 5. Contingencias */}
        <Section title="5. Contingencias y Moto Parada" open={openSections.contingencias} onOpenChange={() => toggle("contingencias")}>
          <FieldRow label="Reserva Contingencia" name="reservaContingenciaPct" register={register} suffix="%" />
          <FieldRow label="Días Parada Estimados/Mes" name="diasParadaEstimadoMes" register={register} />
          <FieldRow label="Almacenamiento por Moto" name="costoAlmacenamientoPorMoto" register={register} suffix="$" />
        </Section>

        {/* 6. Administración */}
        <Section title="6. Administración y Cobranza" open={openSections.admin} onOpenChange={() => toggle("admin")}>
          <FieldRow label="Comisión Cobranza" name="comisionCobranzaPct" register={register} suffix="%" />
          <FieldRow label="Costo Admin por Moto" name="costoAdminPorMoto" register={register} suffix="$" />
          <FieldRow label="Morosidad Estimada" name="morosidadEstimadaPct" register={register} suffix="%" />
        </Section>

        {/* 7. Financiero + TC */}
        <Section title="7. Financiero y Tipo de Cambio" open={openSections.financiero} onOpenChange={() => toggle("financiero")}>
          <FieldRow label="Tasa Inflación Mensual Est." name="tasaInflacionMensualEst" register={register} suffix="%" />
          <FieldRow label="Costo Capital Anual" name="costoCapitalAnualPct" register={register} suffix="%" />
          <div className="flex items-center gap-2 py-2">
            <Label className="text-sm text-muted-foreground flex-1">USD Blue</Label>
            <div className="relative w-36">
              <Input {...register("tipoCambioUSD")} className="h-8 text-right pr-8 text-sm" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleUpdateTC} disabled={updatingTC}>
              {updatingTC ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="ml-1 text-xs">Bluelytics</span>
            </Button>
          </div>
          {errors.tipoCambioUSD && <p className="text-xs text-red-500">{errors.tipoCambioUSD.message}</p>}
        </Section>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </div>
      </form>

      <Dialog open={showRecalcDialog} onOpenChange={setShowRecalcDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Recalcular Precios?</DialogTitle>
            <DialogDescription>
              Los costos operativos cambiaron. Podés recalcular todos los precios en la pestaña Planes o hacerlo manualmente por modelo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowRecalcDialog(false)}>Después</Button>
            <Button onClick={() => setShowRecalcDialog(false)}>Ir a Planes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
