"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clienteSchema, clienteEstados, type ClienteInput } from "@/lib/validations";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle } from "lucide-react";
import type { Cliente } from "./types";

type Props = {
  cliente?: Cliente | null;
  onSubmit: (data: ClienteInput) => Promise<void>;
  isLoading: boolean;
};

function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

export function ClienteForm({ cliente, onSubmit, isLoading }: Props) {
  const form = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre: cliente?.nombre ?? "",
      email: cliente?.email ?? "",
      telefono: cliente?.telefono ?? "",
      dni: cliente?.dni ?? "",
      dniVerificado: cliente?.dniVerificado ?? false,
      licencia: cliente?.licencia ?? "",
      licenciaVencimiento: formatDateForInput(cliente?.licenciaVencimiento ?? null),
      licenciaVerificada: cliente?.licenciaVerificada ?? false,
      direccion: cliente?.direccion ?? "",
      ciudad: cliente?.ciudad ?? "",
      provincia: cliente?.provincia ?? "",
      codigoPostal: cliente?.codigoPostal ?? "",
      fechaNacimiento: formatDateForInput(cliente?.fechaNacimiento ?? null),
      notas: cliente?.notas ?? "",
      estado: (cliente?.estado as ClienteInput["estado"]) ?? "pendiente",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Datos personales */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Datos Personales</h3>
            <p className="text-xs text-muted-foreground">Información básica del cliente</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Perez" disabled={isLoading} {...field} />
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
                  <FormLabel>Email<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="juan@email.com" disabled={isLoading} {...field} />
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
                  <FormLabel>Teléfono<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="+54 11 1234-5678" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fechaNacimiento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de nacimiento</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">Debe ser mayor de 18 años</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="my-6" />

        {/* Documento y licencia */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Documento y Licencia</h3>
            <p className="text-xs text-muted-foreground">Verificación de identidad y habilitación</p>
          </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dni"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DNI</FormLabel>
                <FormControl>
                  <Input placeholder="12345678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dniVerificado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DNI verificado</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "true")}
                  defaultValue={field.value ? "true" : "false"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="false">No verificado</SelectItem>
                    <SelectItem value="true">Verificado</SelectItem>
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
            name="licencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Licencia de conducir</FormLabel>
                <FormControl>
                  <Input placeholder="Nro de licencia" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="licenciaVencimiento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vencimiento licencia</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

          <FormField
            control={form.control}
            name="licenciaVerificada"
            render={({ field }) => (
              <FormItem className="max-w-[50%]">
                <FormLabel>Licencia verificada</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "true")}
                  defaultValue={field.value ? "true" : "false"}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="false">No verificada</SelectItem>
                    <SelectItem value="true">Verificada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator className="my-6" />

        {/* Dirección */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Dirección</h3>
            <p className="text-xs text-muted-foreground">Domicilio del cliente</p>
          </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="direccion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Direccion</FormLabel>
                <FormControl>
                  <Input placeholder="Av. Corrientes 1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ciudad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad</FormLabel>
                <FormControl>
                  <Input placeholder="Buenos Aires" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="provincia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provincia</FormLabel>
                  <FormControl>
                    <Input placeholder="CABA" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigoPostal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código postal</FormLabel>
                  <FormControl>
                    <Input placeholder="C1043" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="my-6" />

        {/* Estado y notas */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Estado y Notas</h3>
            <p className="text-xs text-muted-foreground">Estado del cliente y observaciones internas</p>
          </div>

          <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
              <FormItem className="max-w-[50%]">
                <FormLabel>Estado<span className="text-destructive ml-0.5">*</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clienteEstados.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e.charAt(0).toUpperCase() + e.slice(1)}
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
            name="notas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notas internas sobre el cliente..."
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
          <Button type="submit" disabled={isLoading} className="min-w-[140px]">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {cliente ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
