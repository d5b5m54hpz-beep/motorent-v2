"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useMemo } from "react";
import { asientoContableSchema } from "@/lib/validations";
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
import { Loader2, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { AsientoContable, AsientoContableFormData } from "./types";
import type { CuentaContable } from "../cuentas-contables/types";
import { z } from "zod";

type Props = {
  asiento?: AsientoContable | null;
  onSubmit: (data: AsientoContableFormData) => Promise<void>;
  isLoading: boolean;
};

export function AsientoForm({ asiento, onSubmit, isLoading }: Props) {
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);

  useEffect(() => {
    // Fetch only imputable and active accounts
    fetch("/api/cuentas-contables?limit=200&imputable=true")
      .then((r) => r.json())
      .then((d) => setCuentas(d.data ?? []))
      .catch(() => {});
  }, []);

  const form = useForm<z.infer<typeof asientoContableSchema>>({
    resolver: zodResolver(asientoContableSchema),
    defaultValues: {
      fecha: asiento?.fecha ? new Date(asiento.fecha).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      tipo: asiento?.tipo ?? "COMPRA",
      descripcion: asiento?.descripcion ?? "",
      notas: asiento?.notas ?? "",
      lineas: asiento?.lineas.length ? asiento.lineas.map(l => ({
        cuentaId: l.cuentaId,
        debe: l.debe,
        haber: l.haber,
        descripcion: l.descripcion ?? "",
      })) : [
        { cuentaId: "", debe: 0, haber: 0, descripcion: "" },
        { cuentaId: "", debe: 0, haber: 0, descripcion: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineas",
  });

  const watchedLineas = form.watch("lineas");

  const { totalDebe, totalHaber, isBalanced } = useMemo(() => {
    const totalDebe = watchedLineas.reduce((sum, l) => sum + (Number(l.debe) || 0), 0);
    const totalHaber = watchedLineas.reduce((sum, l) => sum + (Number(l.haber) || 0), 0);
    const isBalanced = Math.abs(totalDebe - totalHaber) < 0.01;
    return { totalDebe, totalHaber, isBalanced };
  }, [watchedLineas]);

  const handleAddLinea = () => {
    append({ cuentaId: "", debe: 0, haber: 0, descripcion: "" });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="APERTURA">Apertura</SelectItem>
                      <SelectItem value="COMPRA">Compra</SelectItem>
                      <SelectItem value="VENTA">Venta</SelectItem>
                      <SelectItem value="PAGO">Pago</SelectItem>
                      <SelectItem value="COBRO">Cobro</SelectItem>
                      <SelectItem value="AJUSTE">Ajuste</SelectItem>
                      <SelectItem value="CIERRE">Cierre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción<span className="text-destructive ml-0.5">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Descripción del asiento..." disabled={isLoading} {...field} />
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
                  <Textarea placeholder="Notas adicionales..." rows={2} disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Líneas del asiento */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Líneas del Asiento</h3>
            <Button type="button" size="sm" variant="outline" onClick={handleAddLinea} disabled={isLoading}>
              <Plus className="mr-1 h-3 w-3" />
              Agregar línea
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg bg-muted/30">
                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name={`lineas.${index}.cuentaId`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel className="text-xs">Cuenta<span className="text-destructive ml-0.5">*</span></FormLabel>}
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Seleccionar cuenta" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cuentas.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.codigo} - {c.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`lineas.${index}.debe`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel className="text-xs">Debe</FormLabel>}
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-9 font-mono"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`lineas.${index}.haber`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel className="text-xs">Haber</FormLabel>}
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-9 font-mono"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-1 flex items-end">
                  {index === 0 && <div className="h-4" />}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    onClick={() => remove(index)}
                    disabled={isLoading || fields.length <= 2}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {watchedLineas[index]?.descripcion !== undefined && (
                  <div className="col-span-12">
                    <FormField
                      control={form.control}
                      name={`lineas.${index}.descripcion`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Detalle de la línea (opcional)"
                              className="h-8 text-xs"
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Balance summary */}
          <div className={`p-4 rounded-lg border-2 ${isBalanced ? "border-teal-500 bg-teal-50 dark:bg-teal-950" : "border-orange-500 bg-orange-50 dark:bg-orange-950"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-teal-600" />
                    <span className="font-semibold text-teal-800 dark:text-teal-200">Balance OK</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <span className="font-semibold text-orange-800 dark:text-orange-200">Desbalanceado</span>
                  </>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Diferencia: <span className={`font-mono ${!isBalanced ? "text-orange-600 font-bold" : ""}`}>
                  {formatCurrency(Math.abs(totalDebe - totalHaber))}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Debe:</span>
                <span className="ml-2 font-mono font-semibold">{formatCurrency(totalDebe)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Haber:</span>
                <span className="ml-2 font-mono font-semibold">{formatCurrency(totalHaber)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading || !isBalanced}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {asiento ? "Actualizar" : "Guardar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
