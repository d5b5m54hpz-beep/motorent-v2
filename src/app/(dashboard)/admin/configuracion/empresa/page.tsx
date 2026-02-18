"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CUIT_REGEX } from "@/lib/validations";
import { toast } from "sonner";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Building2, Save } from "lucide-react";

const configuracionSchema = z.object({
  razonSocial: z.string().min(1, "Razón social requerida"),
  cuit: z.string().regex(CUIT_REGEX, "CUIT inválido (formato: XX-XXXXXXXX-X)").optional().or(z.literal("")),
  condicionIva: z.enum(["RESPONSABLE_INSCRIPTO", "MONOTRIBUTISTA", "EXENTO", "NO_RESPONSABLE", "CONSUMIDOR_FINAL"]),
  domicilioComercial: z.string().optional(),
  domicilioFiscal: z.string().optional(),
  inicioActividades: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  actividadPrincipal: z.string().optional(),
  puntoVentaAfip: z.string().optional(),
});

type ConfiguracionFormData = z.infer<typeof configuracionSchema>;

const condicionIvaLabels: Record<string, string> = {
  RESPONSABLE_INSCRIPTO: "Responsable Inscripto",
  MONOTRIBUTISTA: "Monotributista",
  EXENTO: "Exento",
  NO_RESPONSABLE: "No Responsable",
  CONSUMIDOR_FINAL: "Consumidor Final",
};

export default function ConfiguracionEmpresaPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ConfiguracionFormData>({
    resolver: zodResolver(configuracionSchema),
    defaultValues: {
      razonSocial: "MotoLibre S.A.S",
      cuit: "",
      condicionIva: "RESPONSABLE_INSCRIPTO",
      domicilioComercial: "",
      domicilioFiscal: "",
      inicioActividades: "",
      telefono: "",
      email: "",
      actividadPrincipal: "",
      puntoVentaAfip: "",
    },
  });

  useEffect(() => {
    fetchConfiguracion();
  }, []);

  const fetchConfiguracion = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/configuracion/empresa");
      if (!res.ok) throw new Error("Error al cargar configuración");
      const json = await res.json();
      const config = json.data;

      form.reset({
        razonSocial: config.razonSocial || "MotoLibre S.A.S",
        cuit: config.cuit || "",
        condicionIva: config.condicionIva || "RESPONSABLE_INSCRIPTO",
        domicilioComercial: config.domicilioComercial || "",
        domicilioFiscal: config.domicilioFiscal || "",
        inicioActividades: config.inicioActividades ? config.inicioActividades.slice(0, 10) : "",
        telefono: config.telefono || "",
        email: config.email || "",
        actividadPrincipal: config.actividadPrincipal || "",
        puntoVentaAfip: config.puntoVentaAfip || "",
      });
    } catch (error) {
      toast.error("Error al cargar la configuración de la empresa");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ConfiguracionFormData) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/configuracion/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");

      toast.success("Configuración guardada correctamente");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al guardar configuración");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración de la Empresa</h1>
          <p className="text-muted-foreground">Datos fiscales y comerciales</p>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración de la Empresa</h1>
          <p className="text-muted-foreground">Datos fiscales y comerciales de MotoLibre</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="text-sm font-semibold tracking-tight">Datos Generales</h3>

            <FormField
              control={form.control}
              name="razonSocial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón Social<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="MotoLibre S.A.S" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cuit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CUIT</FormLabel>
                    <FormControl>
                      <Input placeholder="30-12345678-9" {...field} />
                    </FormControl>
                    <FormDescription>Formato: XX-XXXXXXXX-X</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="condicionIva"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condición IVA<span className="text-destructive ml-0.5">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(condicionIvaLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="text-sm font-semibold tracking-tight">Domicilios</h3>

            <FormField
              control={form.control}
              name="domicilioComercial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domicilio Comercial</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Corrientes 1234, CABA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domicilioFiscal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domicilio Fiscal</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Corrientes 1234, CABA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="text-sm font-semibold tracking-tight">Contacto y AFIP</h3>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="+54 11 1234-5678" {...field} />
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
                      <Input type="email" placeholder="info@motolibre.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="inicioActividades"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inicio de Actividades</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="puntoVentaAfip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Punto de Venta AFIP</FormLabel>
                    <FormControl>
                      <Input placeholder="0001" {...field} />
                    </FormControl>
                    <FormDescription>Para facturación electrónica</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="actividadPrincipal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actividad Principal</FormLabel>
                  <FormControl>
                    <Input placeholder="Alquiler de motocicletas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-destructive">*</span> Campos requeridos
            </p>
            <Button type="submit" disabled={isSaving} className="min-w-[160px]">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isSaving && <Save className="mr-2 h-4 w-4" />}
              Guardar Configuración
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
