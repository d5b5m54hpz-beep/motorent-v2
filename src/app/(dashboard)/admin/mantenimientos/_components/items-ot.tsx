"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ItemOT = {
  id: string;
  tipo: "REPUESTO" | "MANO_OBRA" | "INSUMO";
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  repuesto?: { nombre: string; codigo: string | null } | null;
};

type Props = {
  otId: string;
  otCerrada: boolean;
};

const TIPO_LABELS: Record<string, { label: string; className: string }> = {
  REPUESTO: { label: "Repuesto", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  MANO_OBRA: { label: "Mano de obra", className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  INSUMO: { label: "Insumo", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

export function ItemsOT({ otId, otCerrada }: Props) {
  const [items, setItems] = useState<ItemOT[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [tipo, setTipo] = useState<"REPUESTO" | "MANO_OBRA" | "INSUMO">("REPUESTO");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mantenimientos/${otId}/items`);
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [otId]);

  const handleAdd = async () => {
    if (!descripcion || !cantidad || !precioUnitario) {
      toast.error("Completá todos los campos");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/mantenimientos/${otId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          descripcion,
          cantidad: parseFloat(cantidad),
          precioUnitario: parseFloat(precioUnitario),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al agregar ítem");
      }
      toast.success("Ítem agregado");
      setDescripcion("");
      setCantidad("");
      setPrecioUnitario("");
      setShowForm(false);
      fetchItems();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al agregar ítem");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const res = await fetch(`/api/mantenimientos/${otId}/items?itemId=${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      toast.success("Ítem eliminado");
      fetchItems();
    } catch {
      toast.error("Error al eliminar ítem");
    }
  };

  const total = items.reduce((acc, item) => acc + Number(item.subtotal), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Ítems de costo</h3>
        {!otCerrada && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Agregar ítem
          </Button>
        )}
      </div>

      {showForm && !otCerrada && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as typeof tipo)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPUESTO">Repuesto</SelectItem>
                  <SelectItem value="MANO_OBRA">Mano de obra</SelectItem>
                  <SelectItem value="INSUMO">Insumo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Input
                className="h-9"
                placeholder="Ej: Filtro de aceite Honda"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cantidad</Label>
              <Input
                className="h-9"
                type="number"
                step="0.001"
                placeholder="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Precio unitario ($)</Label>
              <Input
                className="h-9"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(e.target.value)}
              />
            </div>
          </div>
          {cantidad && precioUnitario && (
            <p className="text-xs text-muted-foreground">
              Subtotal:{" "}
              <span className="font-semibold text-foreground">
                $
                {(parseFloat(cantidad) * parseFloat(precioUnitario)).toLocaleString(
                  "es-AR",
                  { minimumFractionDigits: 2 }
                )}
              </span>
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving}>
              {saving ? "Guardando..." : "Confirmar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Cargando...
        </p>
      ) : items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Descripción</TableHead>
              <TableHead className="text-right text-xs">Cant.</TableHead>
              <TableHead className="text-right text-xs">P. Unit.</TableHead>
              <TableHead className="text-right text-xs">Subtotal</TableHead>
              {!otCerrada && <TableHead className="w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      TIPO_LABELS[item.tipo]?.className
                    )}
                  >
                    {TIPO_LABELS[item.tipo]?.label}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {item.descripcion}
                  {item.repuesto && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({item.repuesto.codigo})
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {Number(item.cantidad).toLocaleString("es-AR")}
                </TableCell>
                <TableCell className="text-right text-sm">
                  $
                  {Number(item.precioUnitario).toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  $
                  {Number(item.subtotal).toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                  })}
                </TableCell>
                {!otCerrada && (
                  <TableCell>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            <TableRow className="border-t-2">
              <TableCell
                colSpan={otCerrada ? 4 : 4}
                className="text-right text-sm font-semibold"
              >
                Total OT
              </TableCell>
              <TableCell className="text-right text-sm font-bold text-foreground">
                $
                {total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </TableCell>
              {!otCerrada && <TableCell />}
            </TableRow>
          </TableBody>
        </Table>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sin ítems cargados aún
        </p>
      )}

      {items.length > 0 && (
        <>
          <Separator />
          <p className="text-right text-xs text-muted-foreground">
            {items.length} ítem{items.length !== 1 ? "s" : ""}
          </p>
        </>
      )}
    </div>
  );
}
