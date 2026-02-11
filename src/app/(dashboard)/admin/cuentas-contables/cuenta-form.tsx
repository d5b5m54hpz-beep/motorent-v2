"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { cuentaContableSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import type { CuentaContable, CuentaContableFormData } from "./types";
import { z } from "zod";

type Props = {
  cuenta?: CuentaContable | null;
  onSubmit: (data: CuentaContableFormData) => Promise<void>;
  isLoading: boolean;
};

export function CuentaForm({ cuenta, onSubmit, isLoading }: Props) {
  const [cuentasPadre, setCuentasPadre] = useState<CuentaContable[]>([]);

  useEffect(() => {
    // Fetch cuentas that can be parents (nivel < 4, not imputable)
    fetch("/api/cuentas-contables?limit=200")
      .then((r) => r.json())
      .then((d) => {
        const todasCuentas = d.data ?? [];
        // Only show accounts that are not imputable (they can have children)
        const padres = todasCuentas.filter((c: CuentaContable) => c.nivel < 4);
        setCuentasPadre(padres);
      })
      .catch(() => {});
  }, []);

  const form = useForm<z.infer<typeof cuentaContableSchema>>({
    resolver: zodResolver(cuentaContableSchema),
    defaultValues: {
      codigo: cuenta?.codigo ?? "",
      nombre: cuenta?.nombre ?? "",
      tipo: cuenta?.tipo ?? "ACTIVO",
      padre: cuenta?.padre ?? "",
      nivel: cuenta?.nivel ?? 1,
      imputable: cuenta?.imputable ?? true,
      activa: cuenta?.activa ?? true,
      descripcion: cuenta?.descripcion ?? "",
    },
  });

  const watchedPadre = form.watch("padre");

  // Auto-calculate nivel based on padre
  useEffect(() => {
    if (watchedPadre) {
      const padre = cuentasPadre.find((c) => c.codigo === watchedPadre);
      if (padre) {
        form.setValue("nivel", padre.nivel + 1);
        form.setValue("tipo", padre.tipo); // Inherit tipo from parent
      }
    }
  }, [watchedPadre, cuentasPadre, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="1.1.01.001" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormDescription>Formato: nivel1.nivel2.nivel3.nivel4</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Caja en Pesos" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !!watchedPadre}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVO">Activo</SelectItem>
                      <SelectItem value="PASIVO">Pasivo</SelectItem>
                      <SelectItem value="PATRIMONIO">Patrimonio</SelectItem>
                      <SelectItem value="INGRESO">Ingreso</SelectItem>
                      <SelectItem value="EGRESO">Egreso</SelectItem>
                    </SelectContent>
                  </Select>
                  {watchedPadre && (
                    <FormDescription>Heredado de cuenta padre</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="padre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta Padre</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin padre (nivel 1)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Sin padre (nivel 1)</SelectItem>
                      {cuentasPadre.map((c) => (
                        <SelectItem key={c.codigo} value={c.codigo}>
                          {c.codigo} - {c.nombre}
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
              name="nivel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={5} disabled {...field} />
                  </FormControl>
                  <FormDescription>Auto-calculado</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <div className="flex gap-6">
            <FormField
              control={form.control}
              name="imputable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Imputable</FormLabel>
                    <FormDescription>
                      Puede recibir asientos contables
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activa"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Activa</FormLabel>
                    <FormDescription>
                      Visible en listados
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea placeholder="Descripción adicional..." rows={2} disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {cuenta ? "Actualizar" : "Guardar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
