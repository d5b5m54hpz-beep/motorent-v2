"use client";

import { useState, useEffect } from "react";
import { PackageCheck, Loader2, Search, Plus, Trash2 } from "lucide-react";
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
import { toast } from "sonner";

type OrdenCompra = {
  id: string;
  numero: string;
  proveedor: { nombre: string };
  items: Array<{
    id: string;
    repuestoId: string;
    cantidad: number;
    cantidadRecibida: number;
    repuesto: { nombre: string; codigo: string | null };
  }>;
};

type Repuesto = { id: string; nombre: string; codigo: string | null; stock: number };
type Ubicacion = { id: string; codigo: string; nombre: string | null };

type ItemRecepcion = {
  repuestoId: string;
  nombre: string;
  cantidadEsperada?: number;
  cantidadRecibida: number;
  cantidadRechazada: number;
  ubicacionAsignada: string;
};

type RegistrarRecepcionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordenCompraId?: string | null;
  onSuccess: () => void;
};

export function RegistrarRecepcionDialog({
  open,
  onOpenChange,
  ordenCompraId,
  onSuccess,
}: RegistrarRecepcionDialogProps) {
  const [modo, setModo] = useState<"oc" | "directo">(ordenCompraId ? "oc" : "directo");
  const [ordenCompra, setOrdenCompra] = useState<OrdenCompra | null>(null);
  const [items, setItems] = useState<ItemRecepcion[]>([]);
  const [notas, setNotas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);

  // Para modo directo
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Repuesto[]>([]);

  useEffect(() => {
    if (open) {
      fetchUbicaciones();
      if (ordenCompraId && modo === "oc") {
        fetchOrdenCompra();
      } else {
        resetForm();
      }
    }
  }, [open, ordenCompraId, modo]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => searchRepuestos(searchQuery), 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchUbicaciones = async () => {
    try {
      const res = await fetch("/api/ubicaciones-deposito?limit=100");
      if (!res.ok) throw new Error("Error");
      const json = await res.json();
      setUbicaciones(json.data);
    } catch (error) {
      console.error("Error fetching ubicaciones:", error);
    }
  };

  const fetchOrdenCompra = async () => {
    if (!ordenCompraId) return;
    try {
      const res = await fetch(`/api/ordenes-compra/${ordenCompraId}`);
      if (!res.ok) throw new Error("Error");
      const json = await res.json();
      setOrdenCompra(json);

      // Pre-cargar items con cantidad pendiente
      const itemsOC = json.items
        .filter((i: OrdenCompra["items"][0]) => i.cantidadRecibida < i.cantidad)
        .map((i: OrdenCompra["items"][0]) => ({
          repuestoId: i.repuestoId,
          nombre: i.repuesto.nombre,
          cantidadEsperada: i.cantidad - i.cantidadRecibida,
          cantidadRecibida: i.cantidad - i.cantidadRecibida,
          cantidadRechazada: 0,
          ubicacionAsignada: "",
        }));
      setItems(itemsOC);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar orden de compra");
    }
  };

  const searchRepuestos = async (query: string) => {
    try {
      const res = await fetch(`/api/repuestos?search=${encodeURIComponent(query)}&limit=10&activo=true`);
      if (!res.ok) throw new Error("Error");
      const json = await res.json();
      setSearchResults(json.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const agregarItemDirecto = (repuesto: Repuesto) => {
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
        cantidadRecibida: 1,
        cantidadRechazada: 0,
        ubicacionAsignada: "",
      },
    ]);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const eliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const actualizarItem = (
    index: number,
    field: "cantidadRecibida" | "cantidadRechazada" | "ubicacionAsignada",
    value: number | string
  ) => {
    const updated = [...items];
    if (field === "ubicacionAsignada") {
      updated[index][field] = value as string;
    } else {
      updated[index][field] = value as number;
    }
    setItems(updated);
  };

  const resetForm = () => {
    setOrdenCompra(null);
    setItems([]);
    setNotas("");
    setSearchQuery("");
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Agrega al menos un item");
      return;
    }

    const sinUbicacion = items.filter((i) => !i.ubicacionAsignada);
    if (sinUbicacion.length > 0) {
      toast.error("Asigna ubicación a todos los items");
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        ordenCompraId: modo === "oc" ? ordenCompraId : null,
        notas,
        items: items.map((i) => ({
          repuestoId: i.repuestoId,
          cantidadRecibida: i.cantidadRecibida,
          cantidadRechazada: i.cantidadRechazada,
          ubicacionAsignada: i.ubicacionAsignada,
        })),
      };

      const res = await fetch("/api/recepciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al registrar recepción");
      }

      const result = await res.json();
      toast.success(`Recepción ${result.numero} registrada exitosamente`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Error al registrar recepción");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Registrar Recepción
            {ordenCompra && <span className="text-muted-foreground">— {ordenCompra.numero}</span>}
          </DialogTitle>
          <DialogDescription>
            {ordenCompra
              ? `Proveedor: ${ordenCompra.proveedor.nombre}`
              : "Recepción directa sin orden de compra"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Items */}
          <div>
            <Label>Items a recibir*</Label>
            <div className="border rounded-lg overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Repuesto</th>
                    {modo === "oc" && <th className="text-right p-2 w-20">Esperado</th>}
                    <th className="text-right p-2 w-24">Recibido</th>
                    <th className="text-right p-2 w-24">Rechazado</th>
                    <th className="text-left p-2 w-40">Ubicación</th>
                    {modo === "directo" && <th className="w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{item.nombre}</td>
                      {modo === "oc" && (
                        <td className="p-2 text-right text-muted-foreground">
                          {item.cantidadEsperada}
                        </td>
                      )}
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          value={item.cantidadRecibida}
                          onChange={(e) =>
                            actualizarItem(idx, "cantidadRecibida", Number(e.target.value))
                          }
                          className="text-right"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          value={item.cantidadRechazada}
                          onChange={(e) =>
                            actualizarItem(idx, "cantidadRechazada", Number(e.target.value))
                          }
                          className="text-right"
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={item.ubicacionAsignada}
                          onValueChange={(v) => actualizarItem(idx, "ubicacionAsignada", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {ubicaciones.map((u) => (
                              <SelectItem key={u.id} value={u.codigo}>
                                {u.codigo}
                                {u.nombre && ` — ${u.nombre}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {modo === "directo" && (
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
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Buscar repuesto (solo modo directo) */}
            {modo === "directo" && (
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
                      {searchResults.length > 0 ? (
                        <CommandGroup>
                          {searchResults.map((r) => (
                            <CommandItem
                              key={r.id}
                              onSelect={() => agregarItemDirecto(r)}
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
            )}
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones sobre la recepción..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || items.length === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Registrando..." : "Confirmar Recepción"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
