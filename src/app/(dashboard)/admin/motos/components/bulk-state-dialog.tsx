"use client";

import { useState } from "react";
import {
  CheckCircle2, Clock, Wrench, XCircle, Package,
  FileText, MapPin, AlertTriangle, Shield, Activity
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

type BulkStateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (newState: string) => void;
  isLoading?: boolean;
};

const estadosPorFase = [
  {
    fase: "Ingreso",
    estados: [
      { value: "EN_DEPOSITO", label: "En Depósito", icon: Package, color: "text-gray-600" },
      { value: "EN_PATENTAMIENTO", label: "Patentando", icon: FileText, color: "text-amber-600" },
    ],
  },
  {
    fase: "Operativa",
    estados: [
      { value: "DISPONIBLE", label: "Disponible", icon: CheckCircle2, color: "text-green-600" },
      { value: "RESERVADA", label: "Reservada", icon: MapPin, color: "text-blue-600" },
      { value: "ALQUILADA", label: "Alquilada", icon: Clock, color: "text-cyan-600" },
    ],
  },
  {
    fase: "Mantenimiento",
    estados: [
      { value: "EN_SERVICE", label: "En Service", icon: Wrench, color: "text-orange-600" },
      { value: "EN_REPARACION", label: "En Reparación", icon: AlertTriangle, color: "text-red-600" },
    ],
  },
  {
    fase: "Incidencias",
    estados: [
      { value: "INMOVILIZADA", label: "Inmovilizada", icon: Shield, color: "text-purple-600" },
      { value: "RECUPERACION", label: "Recuperación", icon: Activity, color: "text-sky-600" },
    ],
  },
  {
    fase: "Salida",
    estados: [
      { value: "BAJA_TEMP", label: "Baja Temporal", icon: XCircle, color: "text-rose-600" },
      { value: "BAJA_DEFINITIVA", label: "Baja Definitiva", icon: XCircle, color: "text-slate-600" },
      { value: "TRANSFERIDA", label: "Transferida", icon: CheckCircle2, color: "text-teal-600" },
    ],
  },
];

export function BulkStateDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isLoading,
}: BulkStateDialogProps) {
  const [selectedState, setSelectedState] = useState<string>("DISPONIBLE");

  const handleConfirm = () => {
    onConfirm(selectedState);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar estado masivo</DialogTitle>
          <DialogDescription>
            Cambiar el estado de {selectedCount} moto{selectedCount !== 1 ? "s" : ""} seleccionada{selectedCount !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto py-4">
          <Label className="mb-3 block">Nuevo estado (12 estados del ciclo de vida)</Label>
          <RadioGroup value={selectedState} onValueChange={setSelectedState}>
            <div className="space-y-4">
              {estadosPorFase.map((grupo, index) => (
                <div key={grupo.fase}>
                  {index > 0 && <Separator className="my-3" />}
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {grupo.fase}
                  </p>
                  <div className="space-y-2">
                    {grupo.estados.map((estado) => {
                      const Icon = estado.icon;
                      return (
                        <div key={estado.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={estado.value} id={estado.value} />
                          <Label
                            htmlFor={estado.value}
                            className="flex flex-1 cursor-pointer items-center gap-2 font-normal"
                          >
                            <Icon className={`h-4 w-4 ${estado.color}`} />
                            {estado.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Actualizando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
