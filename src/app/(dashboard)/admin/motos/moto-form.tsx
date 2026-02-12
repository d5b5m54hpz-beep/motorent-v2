"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motoSchema, motoEstados, motoTipos, type MotoInput } from "@/lib/validations";
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
import { ImageUpload } from "@/components/image-upload";
import type { Moto } from "./types";

type Props = {
  moto?: Moto | null;
  onSubmit: (data: MotoInput) => Promise<void>;
  isLoading: boolean;
};

export function MotoForm({ moto, onSubmit, isLoading }: Props) {
  const form = useForm<MotoInput>({
    resolver: zodResolver(motoSchema),
    defaultValues: {
      marca: moto?.marca ?? "",
      modelo: moto?.modelo ?? "",
      patente: moto?.patente ?? "",
      anio: moto?.anio ?? new Date().getFullYear(),
      color: moto?.color ?? "",
      kilometraje: moto?.kilometraje ?? 0,
      precioMensual: moto?.precioMensual ?? 0,
      cilindrada: moto?.cilindrada ?? undefined,
      tipo: (moto?.tipo as MotoInput["tipo"]) ?? undefined,
      descripcion: moto?.descripcion ?? "",
      imagen: moto?.imagen ?? "",
      estado: (moto?.estado as MotoInput["estado"]) ?? "disponible",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Información básica */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Información Básica</h3>
            <p className="text-xs text-muted-foreground">Datos principales de la moto</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="marca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Honda" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage className="flex items-center gap-1.5">
                    {form.formState.errors.marca && (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        {form.formState.errors.marca.message}
                      </>
                    )}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="modelo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="CB125F" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage className="flex items-center gap-1.5">
                    {form.formState.errors.modelo && (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        {form.formState.errors.modelo.message}
                      </>
                    )}
                  </FormMessage>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="anio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Año<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage className="flex items-center gap-1.5">
                    {form.formState.errors.anio && (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        {form.formState.errors.anio.message}
                      </>
                    )}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="patente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patente<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="AA123BB"
                      disabled={isLoading}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">Formato argentino</FormDescription>
                  <FormMessage className="flex items-center gap-1.5">
                    {form.formState.errors.patente && (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        {form.formState.errors.patente.message}
                      </>
                    )}
                  </FormMessage>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input placeholder="Negro" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cilindrada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cilindrada (cc)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="250" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="my-6" />

        {/* Detalles técnicos y comerciales */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Detalles Técnicos y Comerciales</h3>
            <p className="text-xs text-muted-foreground">Estado y precio de alquiler</p>
          </div>

          <FormField
            control={form.control}
            name="kilometraje"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kilometraje<span className="text-destructive ml-0.5">*</span></FormLabel>
                <FormControl>
                  <Input type="number" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {motoTipos.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
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
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado<span className="text-destructive ml-0.5">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {motoEstados.map((e) => (
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
          </div>

          <FormField
            control={form.control}
            name="imagen"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imagen (URL)</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." disabled={isLoading} {...field} />
                </FormControl>
                <FormDescription className="text-xs">URL de la imagen de la moto</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imagen"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imagen</FormLabel>
                <FormControl>
                  <ImageUpload
                    value={field.value}
                    onChange={field.onChange}
                    onRemove={() => field.onChange("")}
                    folder="motos"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
            {moto ? "Guardar cambios" : "Crear moto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
