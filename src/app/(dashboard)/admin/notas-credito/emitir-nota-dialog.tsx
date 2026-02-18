"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Cliente = { id: string; nombre: string | null; email: string };

const TIPOS = [
  { value: "DEVOLUCION_TOTAL", label: "Devolución Total" },
  { value: "DEVOLUCION_PARCIAL", label: "Devolución Parcial" },
  { value: "DESCUENTO", label: "Descuento" },
  { value: "AJUSTE_PRECIO", label: "Ajuste de Precio" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function EmitirNotaDialog({ open, onOpenChange, onSuccess }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSearch, setClienteSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [tipo, setTipo] = useState("DEVOLUCION_PARCIAL");
  const [clienteId, setClienteId] = useState("");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clientes?limit=20&search=${clienteSearch}`);
        if (res.ok) {
          const data = await res.json();
          setClientes(data.data || []);
        }
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [clienteSearch, open]);

  const handleSubmit = async () => {
    if (!clienteId || !monto || !motivo) {
      toast.error("Completá todos los campos obligatorios");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/notas-credito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          clienteId,
          monto: parseFloat(monto),
          motivo,
          estado: "EMITIDA",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error al emitir nota de crédito");
        return;
      }

      toast.success("Nota de crédito emitida exitosamente");
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Error al emitir nota de crédito");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTipo("DEVOLUCION_PARCIAL");
    setClienteId("");
    setMonto("");
    setMotivo("");
    setClienteSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir Nota de Crédito</DialogTitle>
          <DialogDescription>
            Completá los datos para emitir una nueva nota de crédito
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input
              placeholder="Buscar cliente..."
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
            />
            {clientes.length > 0 && !clienteId && (
              <div className="max-h-32 overflow-y-auto rounded-md border">
                {clientes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setClienteId(c.id);
                      setClienteSearch(c.nombre || c.email);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    {c.nombre || c.email}
                  </button>
                ))}
              </div>
            )}
            {clienteId && (
              <button
                onClick={() => { setClienteId(""); setClienteSearch(""); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cambiar cliente
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Monto ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              placeholder="Describí el motivo de la nota de crédito..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !clienteId || !monto || !motivo}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Emitiendo..." : "Emitir Nota de Crédito"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
