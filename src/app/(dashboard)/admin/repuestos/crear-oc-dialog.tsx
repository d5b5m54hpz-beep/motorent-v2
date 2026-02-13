"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Search, Lightbulb } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Proveedor = { id: string; nombre: string };
type Repuesto = { id: string; nombre: string; codigo: string | null; precioCompra: number | null; stock: number; stockMinimo: number };
type ItemOC = { repuestoId: string; nombre: string; cantidad: number; precioUnitario: number };

type CrearOCDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function CrearOCDialog({ open, onOpenChange, onSuccess }: CrearOCDialogProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<ItemOC[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sugeridos, setSugeridos] = useState<Repuesto[]>([]);

  // Repuesto search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Repuesto[]>([]);
  const [searchingRepuestos, setSearchingRepuestos] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProveedores();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (proveedorId) {
      fetchSugeridos(proveedorId);
    } else {
      setSugeridos([]);
    }
  }, [proveedorId]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => searchRepuestos(searchQuery), 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchProveedores = async () => {
    try {
      const res = await fetch("/api/proveedores?limit=100");
      if (!res.ok) throw new Error("Error fetching proveedores");
      const json = await res.json();
      setProveedores(json.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar proveedores");
    }
  };

  const fetchSugeridos = async (provId: string) => {
    try {
      const res = await fetch(`/api/repuestos?proveedorId=${provId}&stockBajo=true&limit=10`);
      if (!res.ok) throw new Error("Error");
      const json = await res.json();
      setSugeridos(json.data);
    } catch (error) {
      console.error("Error fetching sugeridos:", error);
    }
  };

  const searchRepuestos = async (query: string) => {
    setSearchingRepuestos(true);
    try {
      const res = await fetch(`/api/repuestos?search=${encodeURIComponent(query)}&limit=10&activo=true`);
      if (!res.ok) throw new Error("Error");
      const json = await res.json();
      setSearchResults(json.data);
    } catch (error) {
      console.error("Error searching repuestos:", error);
    } finally {
      setSearchingRepuestos(false);
    }
  };

  const agregarItem = (repuesto: Repuesto) => {
    const existe = items.find((i) => i.repuestoId === repuesto.id);
    if (existe) {
      toast.info("Este repuesto ya está en la lista");
      return;
    }

    setItems([
      ...items,
      {
        repuestoId: repuesto.id,
        nombre: repuesto.nombre,
        cantidad: 1,
        precioUnitario: repuesto.precioCompra || 0,
      },
    ]);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const agregarSugeridos = () => {
    const nuevos = sugeridos.filter((s) => !items.find((i) => i.repuestoId === s.id));
    const nuevosItems = nuevos.map((r) => ({
      repuestoId: r.id,
      nombre: r.nombre,
      cantidad: Math.max(1, r.stockMinimo - r.stock),
      precioUnitario: r.precioCompra || 0,
    }));
    setItems([...items, ...nuevosItems]);
    toast.success(`${nuevosItems.length} sugeridos agregados`);
  };

  const eliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const actualizarItem = (index: number, field: "cantidad" | "precioUnitario", value: number) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + item.cantidad * item.precioUnitario, 0);
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  const resetForm = () => {
    setProveedorId("");
    setFechaEntrega("");
    setNotas("");
    setItems([]);
    setSugeridos([]);
    setSearchQuery("");
  };

  const handleSubmit = async (enviar: boolean) => {
    if (!proveedorId) {
      toast.error("Selecciona un proveedor");
      return;
    }
    if (items.length === 0) {
      toast.error("Agrega al menos un item");
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        proveedorId,
        fechaEntregaEstimada: fechaEntrega || null,
        notas,
        items: items.map((i) => ({
          repuestoId: i.repuestoId,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
        })),
      };

      const res = await fetch("/api/ordenes-compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear OC");
      }

      const oc = await res.json();

      // Si enviar=true, cambiar estado a PENDIENTE
      if (enviar) {
        const resEstado = await fetch(`/api/ordenes-compra/${oc.id}/estado`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: "PENDIENTE" }),
        });
        if (!resEstado.ok) throw new Error("Error al enviar OC");
      }

      toast.success(enviar ? "OC creada y enviada a proveedor" : "OC guardada como borrador");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar OC");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Compra</DialogTitle>
          <DialogDescription>Complete los datos para generar la orden</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Proveedor y Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="proveedor">Proveedor*</Label>
              <Select value={proveedorId} onValueChange={setProveedorId}>
                <SelectTrigger id="proveedor">
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fecha">Entrega estimada</Label>
              <Input
                id="fecha"
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <Label>Items*</Label>
            <div className="border rounded-lg overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Repuesto</th>
                    <th className="text-right p-2 w-24">Cantidad</th>
                    <th className="text-right p-2 w-32">P. Unitario</th>
                    <th className="text-right p-2 w-32">Subtotal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{item.nombre}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => actualizarItem(idx, "cantidad", Number(e.target.value))}
                          className="text-right"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precioUnitario}
                          onChange={(e) => actualizarItem(idx, "precioUnitario", Number(e.target.value))}
                          className="text-right"
                        />
                      </td>
                      <td className="p-2 text-right font-medium">
                        {formatCurrency(item.cantidad * item.precioUnitario)}
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarItem(idx)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Buscar repuesto */}
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="mt-2">
                  <Search className="mr-2 h-4 w-4" />
                  Buscar repuesto...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Buscar por nombre o código..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    {searchingRepuestos ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Buscando...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <CommandGroup>
                        {searchResults.map((r) => (
                          <CommandItem
                            key={r.id}
                            onSelect={() => agregarItem(r)}
                            className="cursor-pointer"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{r.nombre}</div>
                              {r.codigo && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  {r.codigo}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Stock: {r.stock}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : searchQuery.length >= 2 ? (
                      <CommandEmpty>No se encontraron repuestos</CommandEmpty>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Escribe al menos 2 caracteres
                      </div>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Sugeridos */}
          {sugeridos.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    Sugeridos (stock bajo):
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {sugeridos.slice(0, 5).map((s) => (
                      <Badge key={s.id} variant="outline" className="text-xs">
                        {s.nombre} (stock: {s.stock}/{s.stockMinimo})
                      </Badge>
                    ))}
                    {sugeridos.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{sugeridos.length - 5} más
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={agregarSugeridos}
                  disabled={sugeridos.every((s) => items.find((i) => i.repuestoId === s.id))}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Agregar sugeridos
                </Button>
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones adicionales..."
            />
          </div>

          {/* Totales */}
          <div className="border-t pt-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (21%):</span>
                <span className="font-medium">{formatCurrency(iva)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-1">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !proveedorId || items.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Borrador
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || !proveedorId || items.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar a Proveedor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
