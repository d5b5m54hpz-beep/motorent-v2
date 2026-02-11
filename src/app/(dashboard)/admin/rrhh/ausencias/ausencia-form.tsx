"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Ausencia, AusenciaFormData } from "./types";

const formSchema = z.object({
  empleadoId: z.string().min(1, "Empleado requerido"),
  tipo: z.enum([
    "VACACIONES",
    "ENFERMEDAD",
    "ACCIDENTE_LABORAL",
    "LICENCIA_MATERNIDAD",
    "LICENCIA_PATERNIDAD",
    "ESTUDIO",
    "MATRIMONIO",
    "FALLECIMIENTO_FAMILIAR",
    "MUDANZA",
    "DONACION_SANGRE",
  ]),
  fechaInicio: z.string().min(1, "Fecha inicio requerida"),
  fechaFin: z.string().min(1, "Fecha fin requerida"),
  dias: z.coerce.number().min(1),
  justificada: z.boolean().default(false),
  certificado: z.string().optional(),
  notas: z.string().optional(),
  estado: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA"]).default("PENDIENTE"),
});

type FormValues = z.infer<typeof formSchema>;

interface AusenciaFormProps {
  ausencia: Ausencia | null;
  onSubmit: (data: AusenciaFormData) => Promise<void>;
  isLoading: boolean;
}

export function AusenciaForm({ ausencia, onSubmit, isLoading }: AusenciaFormProps) {
  const [empleados, setEmpleados] = useState<Array<{ id: string; nombre: string; apellido: string }>>([]);

  useEffect(() => {
    async function fetchEmpleados() {
      const res = await fetch("/api/rrhh/empleados?limit=1000&estado=ACTIVO");
      if (res.ok) {
        const data = await res.json();
        setEmpleados(data.data || []);
      }
    }
    fetchEmpleados();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: ausencia
      ? {
          empleadoId: ausencia.empleadoId,
          tipo: ausencia.tipo,
          fechaInicio: ausencia.fechaInicio.split("T")[0],
          fechaFin: ausencia.fechaFin.split("T")[0],
          dias: ausencia.dias,
          justificada: ausencia.justificada,
          certificado: ausencia.certificado || "",
          notas: ausencia.notas || "",
          estado: ausencia.estado,
        }
      : {
          empleadoId: "",
          tipo: "VACACIONES",
          fechaInicio: "",
          fechaFin: "",
          dias: 1,
          justificada: false,
          certificado: "",
          notas: "",
          estado: "PENDIENTE",
        },
  });

  // Auto-calculate days
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "fechaInicio" || name === "fechaFin") {
        const inicio = value.fechaInicio;
        const fin = value.fechaFin;
        if (inicio && fin) {
          const days = Math.ceil(
            (new Date(fin).getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;
          if (days > 0) {
            form.setValue("dias", days);
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="empleadoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Empleado <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {empleados.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.apellido}, {emp.nombre}
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
                <FormLabel>
                  Tipo <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="VACACIONES">Vacaciones</SelectItem>
                    <SelectItem value="ENFERMEDAD">Enfermedad</SelectItem>
                    <SelectItem value="ACCIDENTE_LABORAL">Accidente Laboral</SelectItem>
                    <SelectItem value="LICENCIA_MATERNIDAD">Licencia Maternidad</SelectItem>
                    <SelectItem value="LICENCIA_PATERNIDAD">Licencia Paternidad</SelectItem>
                    <SelectItem value="ESTUDIO">Estudio</SelectItem>
                    <SelectItem value="MATRIMONIO">Matrimonio</SelectItem>
                    <SelectItem value="FALLECIMIENTO_FAMILIAR">Fallecimiento Familiar</SelectItem>
                    <SelectItem value="MUDANZA">Mudanza</SelectItem>
                    <SelectItem value="DONACION_SANGRE">Donación de Sangre</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="fechaInicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Fecha Inicio <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isLoading} />
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
                <FormLabel>
                  Fecha Fin <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dias"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Días <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="number" {...field} disabled={isLoading} readOnly />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="justificada"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Justificada</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Estado <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="APROBADA">Aprobada</SelectItem>
                    <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="certificado"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Certificado</FormLabel>
              <FormControl>
                <Input {...field} disabled={isLoading} placeholder="URL o referencia del certificado" />
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
                <Textarea {...field} disabled={isLoading} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : ausencia ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
