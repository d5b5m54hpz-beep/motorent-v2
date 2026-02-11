"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import {
  mantenimientoSchema,
  tiposMantenimiento,
  estadosMantenimiento,
  type MantenimientoInput,
} from "@/lib/validations";
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
import type { Mantenimiento } from "./types";

const tipoLabels: Record<string, string> = {
  SERVICE_PREVENTIVO: "Service Preventivo",
  REPARACION: "Reparación",
  CAMBIO_ACEITE: "Cambio de Aceite",
  CAMBIO_NEUMATICOS: "Cambio Neumáticos",
  FRENOS: "Frenos",
  ELECTRICA: "Eléctrica",
  CHAPA_PINTURA: "Chapa y Pintura",
  OTRO: "Otro",
};

const estadoLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PROGRAMADO: "Programado",
  EN_PROCESO: "En Proceso",
  ESPERANDO_REPUESTO: "Esperando Repuesto",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

type Moto = { id: string; marca: string; modelo: string; patente: string };
type Proveedor = { id: string; nombre: string };

type Props = {
  mantenimiento?: Mantenimiento | null;
  onSubmit: (data: MantenimientoInput) => Promise<void>;
  isLoading: boolean;
};

export function MantenimientoForm({ mantenimiento, onSubmit, isLoading }: Props) {
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

  const form = useForm<MantenimientoInput>({
    resolver: zodResolver(mantenimientoSchema),
    defaultValues: {
      motoId: mantenimiento?.motoId ?? "",
      tipo: (mantenimiento?.tipo as MantenimientoInput["tipo"]) ?? "SERVICE_PREVENTIVO",
      estado: (mantenimiento?.estado as MantenimientoInput["estado"]) ?? "PENDIENTE",
      descripcion: mantenimiento?.descripcion ?? "",
      diagnostico: mantenimiento?.diagnostico ?? "",
      solucion: mantenimiento?.solucion ?? "",
      costoRepuestos: mantenimiento?.costoRepuestos ?? 0,
      costoManoObra: mantenimiento?.costoManoObra ?? 0,
      proveedorId: mantenimiento?.proveedorId ?? "",
      kmAlMomento: mantenimiento?.kmAlMomento ?? undefined,
      fechaProgramada: mantenimiento?.fechaProgramada
        ? mantenimiento.fechaProgramada.slice(0, 10)
        : "",
      fechaInicio: mantenimiento?.fechaInicio
        ? mantenimiento.fechaInicio.slice(0, 10)
        : "",
      fechaFin: mantenimiento?.fechaFin
        ? mantenimiento.fechaFin.slice(0, 10)
        : "",
      proximoServiceKm: mantenimiento?.proximoServiceKm ?? undefined,
      proximoServiceFecha: mantenimiento?.proximoServiceFecha
        ? mantenimiento.proximoServiceFecha.slice(0, 10)
        : "",
      notas: mantenimiento?.notas ?? "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Información básica */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Información Básica</h3>

          <div className="grid grid-cols-2 gap-4">
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
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tiposMantenimiento.map((t) => (
                        <SelectItem key={t} value={t}>
                          {tipoLabels[t] ?? t}
                        </SelectItem>
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
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {estadosMantenimiento.map((e) => (
                        <SelectItem key={e} value={e}>
                          {estadoLabels[e] ?? e}
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

          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción<span className="text-destructive ml-0.5">*</span></FormLabel>
                <FormControl>
                  <Textarea placeholder="Descripción del trabajo..." rows={3} disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Costos */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Costos</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="costoRepuestos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo Repuestos (ARS)</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costoManoObra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo Mano de Obra (ARS)</FormLabel>
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

        {/* Fechas */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Fechas y Kilometraje</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fechaProgramada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha Programada</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isLoading} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fechaInicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha Inicio</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isLoading} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fechaFin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha Fin</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isLoading} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kmAlMomento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Km al momento</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="12000" disabled={isLoading} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Diagnóstico y solución */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Diagnóstico y Solución</h3>
          <FormField
            control={form.control}
            name="diagnostico"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Diagnóstico</FormLabel>
                <FormControl>
                  <Textarea placeholder="Diagnóstico del problema..." rows={2} disabled={isLoading} {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="solucion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Solución</FormLabel>
                <FormControl>
                  <Textarea placeholder="Solución aplicada..." rows={2} disabled={isLoading} {...field} value={field.value ?? ""} />
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
                  <Textarea placeholder="Notas adicionales..." rows={2} disabled={isLoading} {...field} value={field.value ?? ""} />
                </FormControl>
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
            {mantenimiento ? "Guardar cambios" : "Crear mantenimiento"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
