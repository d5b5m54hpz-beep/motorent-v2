"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { proveedorSchema, type ProveedorInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Proveedor } from "./types";

type Props = {
  proveedor?: Proveedor | null;
  onSubmit: (data: ProveedorInput) => Promise<void>;
  isLoading: boolean;
};

export function ProveedorForm({ proveedor, onSubmit, isLoading }: Props) {
  const form = useForm<ProveedorInput>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: {
      nombre: proveedor?.nombre ?? "",
      contacto: proveedor?.contacto ?? "",
      telefono: proveedor?.telefono ?? "",
      email: proveedor?.email ?? "",
      direccion: proveedor?.direccion ?? "",
      rubro: proveedor?.rubro ?? "",
      notas: proveedor?.notas ?? "",
      activo: proveedor?.activo ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Datos del Proveedor</h3>

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre<span className="text-destructive ml-0.5">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Taller Mecánico Sur" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contacto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona de Contacto</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rubro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rubro</FormLabel>
                  <FormControl>
                    <Input placeholder="Mecánica general" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="+54 11 1234-5678" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="proveedor@email.com" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="direccion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input placeholder="Av. Rivadavia 1234, CABA" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea placeholder="Notas sobre el proveedor..." rows={3} disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="activo"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormLabel className="font-normal">Proveedor activo</FormLabel>
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
            {proveedor ? "Guardar cambios" : "Crear proveedor"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
