"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contratoSchema, frecuenciasPago, type ContratoInput } from "@/lib/validations";
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
  FormDescription,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calculator, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import type { Contrato } from "./types";

type Props = {
  contrato?: Contrato | null;
  onSubmit: (data: ContratoInput) => Promise<void>;
  isLoading: boolean;
};

type Cliente = { id: string; nombre: string | null; email: string; dni: string | null };
type Moto = { id: string; marca: string; modelo: string; patente: string; precioMensual: number };
type PricingPreview = {
  periodos: number;
  meses: number;
  descuentoTotal: number;
  montoPeriodo: number;
  montoTotal: number;
};

function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

export function ContratoForm({ contrato, onSubmit, isLoading }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [motos, setMotos] = useState<Moto[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [preview, setPreview] = useState<PricingPreview | null>(null);

  const form = useForm<ContratoInput>({
    resolver: zodResolver(contratoSchema),
    defaultValues: {
      clienteId: contrato?.clienteId ?? "",
      motoId: contrato?.motoId ?? "",
      fechaInicio: formatDateForInput(contrato?.fechaInicio ?? null),
      fechaFin: formatDateForInput(contrato?.fechaFin ?? null),
      frecuenciaPago: (contrato?.frecuenciaPago as ContratoInput["frecuenciaPago"]) ?? "MENSUAL",
      deposito: contrato?.deposito ?? 0,
      notas: contrato?.notas ?? "",
      renovacionAuto: contrato?.renovacionAuto ?? false,
      esOpcionCompra: contrato?.esOpcionCompra ?? false,
      mesesParaCompra: contrato?.mesesParaCompra ?? 24,
      valorCompraFinal: contrato?.valorCompraFinal ?? 0,
    },
  });

  // Fetch clientes y motos
  useEffect(() => {
    async function fetchData() {
      try {
        const [clientesRes, motosRes] = await Promise.all([
          fetch("/api/clientes?limit=100"),
          fetch("/api/motos?limit=100&estado=DISPONIBLE"),
        ]);

        if (clientesRes.ok) {
          const data = await clientesRes.json();
          setClientes(data.data);
        }

        if (motosRes.ok) {
          const data = await motosRes.json();
          setMotos(data.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, []);

  // Calcular preview cuando cambian los campos relevantes
  useEffect(() => {
    const subscription = form.watch((values) => {
      const { motoId, fechaInicio, fechaFin, frecuenciaPago } = values;

      if (motoId && fechaInicio && fechaFin && frecuenciaPago) {
        const moto = motos.find((m) => m.id === motoId);
        if (!moto) return;

        // Llamar API de cálculo de preview
        fetch("/api/contratos/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            precioBaseMensual: moto.precioMensual,
            fechaInicio,
            fechaFin,
            frecuenciaPago,
          }),
        })
          .then((res) => res.json())
          .then((data) => setPreview(data))
          .catch(() => setPreview(null));
      } else {
        setPreview(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, motos]);

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando clientes y motos...</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Cliente y Moto */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Cliente y Moto</h3>
            <p className="text-xs text-muted-foreground">Selecciona el cliente y la moto para el contrato</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="clienteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre || c.email}
                          {c.dni && ` (DNI: ${c.dni})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {clientes.length === 0 && "No hay clientes disponibles"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moto<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar moto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {motos.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.marca} {m.modelo} - {m.patente} ({formatCurrency(m.precioMensual)}/mes)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {motos.length === 0 && "No hay motos disponibles"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="my-6" />

        {/* Fechas y frecuencia */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Período y Frecuencia</h3>
            <p className="text-xs text-muted-foreground">Define las fechas y frecuencia de pago</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fechaInicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha inicio<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fechaFin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha fin<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="frecuenciaPago"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frecuencia de pago<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {frecuenciasPago.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f.charAt(0) + f.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">Semanal, quincenal o mensual</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deposito"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Depósito<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">Monto inicial de garantía</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Preview de cálculo */}
        {preview && (
          <>
            <Separator className="my-6" />
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                <Calculator className="h-4 w-4 text-primary" />
                Resumen del Contrato
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Períodos:</span>
                  <span className="font-semibold">{preview.periodos}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Duración:</span>
                  <span className="font-semibold">{preview.meses} mes{preview.meses !== 1 ? "es" : ""}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Descuento:</span>
                  <span className="font-semibold text-teal-600 dark:text-teal-400">{preview.descuentoTotal}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Por período:</span>
                  <span className="font-semibold text-primary">{formatCurrency(preview.montoPeriodo)}</span>
                </div>
                <div className="col-span-2 mt-2 flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-medium text-muted-foreground">Total del contrato:</span>
                  <span className="text-xl font-bold tracking-tight text-primary">{formatCurrency(preview.montoTotal)}</span>
                </div>
              </div>
            </div>
            <Separator className="my-6" />
          </>
        )}

        {/* Opciones adicionales */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Opciones Adicionales</h3>
            <p className="text-xs text-muted-foreground">Configuración y notas del contrato</p>
          </div>

          <FormField
            control={form.control}
            name="esOpcionCompra"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel className="font-medium">Opción a Compra</FormLabel>
                  <FormDescription className="text-xs text-muted-foreground">
                    El cliente podrá comprar la moto al finalizar el período acordado
                  </FormDescription>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={isLoading}
                    className="h-4 w-4 rounded border-input accent-primary disabled:opacity-50"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch("esOpcionCompra") && (
            <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/30">
              <FormField
                control={form.control}
                name="mesesParaCompra"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meses para ejercer</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="24" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Tiempo mínimo antes de ejercer opción
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valorCompraFinal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de compra final</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Precio al ejercer la opción
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control}
            name="renovacionAuto"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel className="font-medium">Renovación automática</FormLabel>
                  <FormDescription className="text-xs text-muted-foreground">
                    El contrato se renovará automáticamente al vencer
                  </FormDescription>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={isLoading}
                    className="h-4 w-4 rounded border-input accent-primary disabled:opacity-50"
                  />
                </FormControl>
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
                  <Textarea
                    placeholder="Notas internas sobre el contrato..."
                    rows={3}
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator className="my-6" />

        <div className="flex items-center justify-end gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> Campos requeridos
          </p>
          <Button type="submit" disabled={isLoading || !preview} className="min-w-[140px]">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {contrato ? "Guardar cambios" : "Crear contrato"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
