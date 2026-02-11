"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { gastoSchema, categoriasGasto, categoriaGastoLabels, type GastoInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import type { Gasto } from "./types";

type Moto = { id: string; marca: string; modelo: string; patente: string };
type Proveedor = { id: string; nombre: string };

type Props = {
  gasto?: Gasto | null;
  onSubmit: (data: GastoInput) => Promise<void>;
  isLoading: boolean;
};

export function GastoForm({ gasto, onSubmit, isLoading }: Props) {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  useEffect(() => {
    fetch("/api/motos?limit=100")
      .then((r) => r.json())
      .then((d) => setMotos(d.data ?? []))
      .catch(() => {});
    fetch("/api/proveedores?limit=100")
      .then((r) => r.json())
      .then((d) => setProveedores(d.data ?? []))
      .catch(() => {});
  }, []);

  const form = useForm<GastoInput>({
    resolver: zodResolver(gastoSchema),
    defaultValues: {
      concepto: gasto?.concepto ?? "",
      descripcion: gasto?.descripcion ?? "",
      monto: gasto?.monto ?? 0,
      categoria: (gasto?.categoria as GastoInput["categoria"]) ?? "OTRO",
      subcategoria: gasto?.subcategoria ?? "",
      motoId: gasto?.motoId ?? "",
      proveedorId: gasto?.proveedorId ?? "",
      metodoPago: gasto?.metodoPago ?? "",
      comprobante: gasto?.comprobante ?? "",
      fecha: gasto?.fecha ? gasto.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
      notas: gasto?.notas ?? "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="concepto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Concepto<span className="text-destructive ml-0.5">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Service 10.000 km - Honda CB190" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto (ARS)<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoriasGasto.map((c) => (
                        <SelectItem key={c} value={c}>{categoriaGastoLabels[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isLoading} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subcategoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategoría</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Aceite, Filtros..." disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Asociaciones</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="motoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moto</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    defaultValue={field.value || "__none__"}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar moto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Sin moto</SelectItem>
                      {motos.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.marca} {m.modelo} ({m.patente})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="proveedorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    defaultValue={field.value || "__none__"}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proveedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Sin proveedor</SelectItem>
                      {proveedores.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="metodoPago"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pago</FormLabel>
                  <FormControl>
                    <Input placeholder="Efectivo, Transferencia..." disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comprobante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comprobante</FormLabel>
                  <FormControl>
                    <Input placeholder="Nro factura o ref." disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalle del gasto..." rows={2} disabled={isLoading} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> Campos requeridos
          </p>
          <Button type="submit" disabled={isLoading} className="min-w-[140px]">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {gasto ? "Guardar cambios" : "Registrar gasto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
