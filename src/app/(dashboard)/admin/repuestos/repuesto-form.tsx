"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { repuestoSchema, type RepuestoInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Repuesto } from "./types";

type Proveedor = { id: string; nombre: string };

type Props = {
  repuesto?: Repuesto | null;
  onSubmit: (data: RepuestoInput) => Promise<void>;
  isLoading: boolean;
};

export function RepuestoForm({ repuesto, onSubmit, isLoading }: Props) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  useEffect(() => {
    fetch("/api/proveedores?limit=100")
      .then((r) => r.json())
      .then((d) => setProveedores(d.data ?? []))
      .catch(() => {});
  }, []);

  const form = useForm<RepuestoInput>({
    resolver: zodResolver(repuestoSchema),
    defaultValues: {
      nombre: repuesto?.nombre ?? "",
      codigo: repuesto?.codigo ?? "",
      categoria: repuesto?.categoria ?? "",
      precioCompra: repuesto?.precioCompra ?? 0,
      precioVenta: repuesto?.precioVenta ?? 0,
      stock: repuesto?.stock ?? 0,
      stockMinimo: repuesto?.stockMinimo ?? 2,
      proveedorId: repuesto?.proveedorId ?? "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Datos del Repuesto</h3>

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre<span className="text-destructive ml-0.5">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Filtro de aceite" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="FA-001" disabled={isLoading} {...field} />
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
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <Input placeholder="Filtros" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Precios</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="precioCompra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Compra (ARS)</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precioVenta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Venta (ARS)</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Stock y Proveedor</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Actual</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stockMinimo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Mínimo</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="proveedorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proveedor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? ""} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Sin proveedor</SelectItem>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-end gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> Campos requeridos
          </p>
          <Button type="submit" disabled={isLoading} className="min-w-[140px]">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {repuesto ? "Guardar cambios" : "Crear repuesto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
