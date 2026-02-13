"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import type { Repuesto } from "./types";

type AjustarStockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repuesto: Repuesto | null;
  onSuccess: () => void;
};

export function AjustarStockDialog({
  open,
  onOpenChange,
  repuesto,
  onSuccess,
}: AjustarStockDialogProps) {
  const [tipo, setTipo] = useState<"ENTRADA_AJUSTE" | "SALIDA_AJUSTE">("SALIDA_AJUSTE");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTipo("SALIDA_AJUSTE");
      setCantidad("");
      setMotivo("");
    }
  }, [open]);

  const stockResultante = repuesto
    ? tipo === "ENTRADA_AJUSTE"
      ? repuesto.stock + Number(cantidad || 0)
      : repuesto.stock - Number(cantidad || 0)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!repuesto) return;

    const cantidadNum = Number(cantidad);
    if (cantidadNum <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    if (tipo === "SALIDA_AJUSTE" && cantidadNum > repuesto.stock) {
      toast.error("No hay suficiente stock disponible");
      return;
    }

    if (!motivo.trim()) {
      toast.error("El motivo es requerido");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/repuestos/ajuste-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repuestoId: repuesto.id,
          tipo,
          cantidad: cantidadNum,
          motivo: motivo.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al ajustar stock");
      }

      toast.success("Stock ajustado correctamente");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error(error instanceof Error ? error.message : "Error al ajustar stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!repuesto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajustar Stock — {repuesto.nombre}</DialogTitle>
            <DialogDescription>
              Stock actual: <span className="font-semibold">{repuesto.stock}</span> unidades
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Tipo de ajuste</Label>
              <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ENTRADA_AJUSTE" id="entrada" />
                  <Label htmlFor="entrada" className="font-normal cursor-pointer">
                    Entrada (encontré stock extra / devolución)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SALIDA_AJUSTE" id="salida" />
                  <Label htmlFor="salida" className="font-normal cursor-pointer">
                    Salida (rotura / pérdida / corrección)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="cantidad">Cantidad*</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="Ej: 5"
                required
              />
            </div>

            <div>
              <Label htmlFor="motivo">Motivo*</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Inventario físico - diferencia encontrada"
                rows={3}
                required
              />
            </div>

            {cantidad && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">
                  Stock resultante:{" "}
                  <span className={stockResultante < 0 ? "text-destructive" : ""}>
                    {repuesto.stock} → {stockResultante}
                  </span>
                </p>
                {stockResultante < 0 && (
                  <p className="text-xs text-destructive mt-1">
                    El stock no puede quedar negativo
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || stockResultante < 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Ajustando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
