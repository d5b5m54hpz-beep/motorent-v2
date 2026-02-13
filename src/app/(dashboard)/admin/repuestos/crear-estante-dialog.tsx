"use client";

import { useState, useEffect } from "react";
import { Loader2, MapPin } from "lucide-react";
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
import { toast } from "sonner";

type CrearEstanteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function CrearEstanteDialog({ open, onOpenChange, onSuccess }: CrearEstanteDialogProps) {
  const [estante, setEstante] = useState("");
  const [nombre, setNombre] = useState("");
  const [filas, setFilas] = useState(3);
  const [posiciones, setPosiciones] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setEstante("");
    setNombre("");
    setFilas(3);
    setPosiciones(4);
  };

  const totalUbicaciones = filas * posiciones;

  const generarUbicaciones = () => {
    const ubicaciones = [];
    for (let f = 1; f <= filas; f++) {
      for (let p = 1; p <= posiciones; p++) {
        const codigo = `${estante.toUpperCase()}-F${f}-P${p}`;
        ubicaciones.push({
          estante: estante.toUpperCase(),
          fila: `F${f}`,
          posicion: `P${p}`,
          nombre: nombre || null,
        });
      }
    }
    return ubicaciones;
  };

  const handleSubmit = async () => {
    if (!estante.trim()) {
      toast.error("El identificador del estante es requerido");
      return;
    }

    if (filas < 1 || filas > 20) {
      toast.error("El número de filas debe estar entre 1 y 20");
      return;
    }

    if (posiciones < 1 || posiciones > 20) {
      toast.error("El número de posiciones debe estar entre 1 y 20");
      return;
    }

    setIsSubmitting(true);
    try {
      const ubicaciones = generarUbicaciones();
      let creadas = 0;
      let errores = 0;

      // Crear todas las ubicaciones en paralelo
      const promises = ubicaciones.map((ub) =>
        fetch("/api/ubicaciones-deposito", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ub),
        }).then((res) => {
          if (res.ok) {
            creadas++;
          } else {
            errores++;
          }
          return res;
        })
      );

      await Promise.all(promises);

      if (errores > 0) {
        toast.warning(`Estante creado: ${creadas} ubicaciones creadas, ${errores} errores (posiblemente duplicados)`);
      } else {
        toast.success(`Estante creado: ${creadas} ubicaciones generadas`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear estante");
    } finally {
      setIsSubmitting(false);
    }
  };

  const preview = estante.trim()
    ? [
        `${estante.toUpperCase()}-F1-P1`,
        `${estante.toUpperCase()}-F1-P2`,
        "...",
        `${estante.toUpperCase()}-F${filas}-P${posiciones}`,
      ].join(", ")
    : "E1-F1-P1, E1-F1-P2, ..., E1-F3-P4";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Crear Estante
          </DialogTitle>
          <DialogDescription>
            Genera múltiples ubicaciones automáticamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="estante">Identificador del estante*</Label>
            <Input
              id="estante"
              value={estante}
              onChange={(e) => setEstante(e.target.value)}
              placeholder="E1, E2, A, B..."
              className="uppercase"
              maxLength={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Usa 1-2 caracteres (ej: E1, A, B1)
            </p>
          </div>

          <div>
            <Label htmlFor="nombre">Nombre (opcional)</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Frenos y Suspensión"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filas">Cantidad de filas*</Label>
              <Input
                id="filas"
                type="number"
                min="1"
                max="20"
                value={filas}
                onChange={(e) => setFilas(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="posiciones">Posiciones por fila*</Label>
              <Input
                id="posiciones"
                type="number"
                min="1"
                max="20"
                value={posiciones}
                onChange={(e) => setPosiciones(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">
              Se crearán {totalUbicaciones} ubicaciones:
            </p>
            <p className="text-xs text-muted-foreground font-mono break-all">
              {preview}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !estante.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Creando..." : "Crear Estante"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
