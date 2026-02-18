"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Wrench, XCircle } from "lucide-react";
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

type BulkStateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (newState: string) => void;
  isLoading?: boolean;
};

const estados = [
  {
    value: "DISPONIBLE",
    label: "Disponible",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  {
    value: "ALQUILADA",
    label: "Alquilada",
    icon: Clock,
    color: "text-blue-600",
  },
  {
    value: "MANTENIMIENTO",
    label: "Mantenimiento",
    icon: Wrench,
    color: "text-yellow-600",
  },
  {
    value: "BAJA",
    label: "Baja",
    icon: XCircle,
    color: "text-red-600",
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

        <div className="py-4">
          <Label className="mb-3 block">Nuevo estado</Label>
          <RadioGroup value={selectedState} onValueChange={setSelectedState}>
            <div className="space-y-3">
              {estados.map((estado) => {
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
