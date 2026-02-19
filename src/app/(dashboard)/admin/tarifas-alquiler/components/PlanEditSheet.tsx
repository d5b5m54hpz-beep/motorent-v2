"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { Plan } from "./PlanCard";

const editSchema = z.object({
  descuentoPct: z.coerce.number().min(0).max(100),
  depositoMeses: z.coerce.number().min(0),
  depositoConDescuento: z.boolean(),
  permiteSemanal: z.boolean(),
  permiteQuincenal: z.boolean(),
  recargoSemanalPct: z.coerce.number().min(0),
  recargoQuincenalPct: z.coerce.number().min(0),
  recargoEfectivoPct: z.coerce.number().min(0),
  recargoMercadoPagoPct: z.coerce.number().min(0),
  destacado: z.boolean(),
  activo: z.boolean(),
});

type EditData = z.infer<typeof editSchema>;

type Props = {
  plan: Plan | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

export function PlanEditSheet({ plan, open, onOpenChange, onSaved }: Props) {
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<EditData>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    if (plan) {
      reset({
        descuentoPct: Number(plan.descuentoPct),
        depositoMeses: Number(plan.depositoMeses),
        depositoConDescuento: false,
        permiteSemanal: true,
        permiteQuincenal: true,
        recargoSemanalPct: 10,
        recargoQuincenalPct: 5,
        recargoEfectivoPct: 5,
        recargoMercadoPagoPct: 0,
        destacado: plan.destacado,
        activo: plan.activo,
      });
    }
  }, [plan, reset]);

  const onSubmit = async (data: EditData) => {
    if (!plan) return;
    try {
      const res = await fetch(`/api/pricing-engine/planes/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error");
      }
      toast.success(`Plan ${plan.nombre} actualizado`);
      onOpenChange(false);
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const SwitchRow = ({ label, field }: { label: string; field: keyof EditData }) => {
    const val = watch(field as "activo");
    return (
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <Switch
          checked={Boolean(val)}
          onCheckedChange={(v) => setValue(field as "activo", v as never)}
        />
      </div>
    );
  };

  const NumberRow = ({ label, field, suffix = "" }: { label: string; field: keyof EditData; suffix?: string }) => (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-sm text-muted-foreground flex-1">{label}</Label>
      <div className="relative w-28">
        <Input {...register(field)} className="h-8 text-right pr-6 text-sm" />
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Plan</SheetTitle>
          <SheetDescription>{plan?.nombre} — {plan?.codigo}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Descuentos</p>
            <NumberRow label="Descuento plan" field="descuentoPct" suffix="%" />
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Depósito</p>
            <NumberRow label="Meses de depósito" field="depositoMeses" suffix="m" />
            <SwitchRow label="Depósito con descuento" field="depositoConDescuento" />
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Frecuencias</p>
            <SwitchRow label="Permite semanal" field="permiteSemanal" />
            <SwitchRow label="Permite quincenal" field="permiteQuincenal" />
            <NumberRow label="Recargo semanal" field="recargoSemanalPct" suffix="%" />
            <NumberRow label="Recargo quincenal" field="recargoQuincenalPct" suffix="%" />
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Forma de Pago</p>
            <NumberRow label="Recargo MercadoPago" field="recargoMercadoPagoPct" suffix="%" />
            <NumberRow label="Recargo Efectivo" field="recargoEfectivoPct" suffix="%" />
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visibilidad</p>
            <SwitchRow label="Destacado (⭐ Recomendado)" field="destacado" />
            <SwitchRow label="Activo" field="activo" />
          </div>

          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
