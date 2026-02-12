"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { motoSchema, motoEstados, type MotoInput } from "@/lib/validations";
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
  const [marcas, setMarcas] = useState<string[]>([]);
  const [colores, setColores] = useState<string[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);

  useEffect(() => {
    // Fetch unique marcas, colores, tipos from API
    fetch('/api/motos/marcas').then(r => r.json()).then(data => setMarcas(data.marcas || [])).catch(() => {});
    fetch('/api/motos/colores').then(r => r.json()).then(data => setColores(data.colores || [])).catch(() => {});
    fetch('/api/motos/tipos').then(r => r.json()).then(data => setTipos(data.tipos || [])).catch(() => {});
  }, []);

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
      tipo: moto?.tipo ?? undefined,
      descripcion: moto?.descripcion ?? "",
      numeroMotor: moto?.numeroMotor ?? "",
      numeroCuadro: moto?.numeroCuadro ?? "",
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
                    <>
                      <Input placeholder="Honda, Yamaha, etc." disabled={isLoading} {...field} list="marcas-list" />
                      <datalist id="marcas-list">
                        {marcas.map((m) => <option key={m} value={m} />)}
                      </datalist>
                    </>
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
                    <>
                      <Input placeholder="Negro, Rojo, Azul, etc." disabled={isLoading} {...field} list="colores-list" />
                      <datalist id="colores-list">
                        {colores.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </>
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

          <div className="grid grid-cols-2 gap-4">
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
            <FormField
              control={form.control}
              name="precioMensual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Mensual (ARS)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50000" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <FormControl>
                    <>
                      <Input placeholder="Naked, Cub, Enduro, etc." disabled={isLoading} {...field} list="tipos-list" />
                      <datalist id="tipos-list">
                        {tipos.map((t) => <option key={t} value={t} />)}
                      </datalist>
                    </>
                  </FormControl>
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

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="numeroMotor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Motor</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC123456" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">Opcional - identificación del motor</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numeroCuadro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Cuadro/Chasis</FormLabel>
                  <FormControl>
                    <Input placeholder="XYZ789012" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">Opcional - identificación del chasis</FormDescription>
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
                <FormLabel>Observaciones</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Detalles adicionales, estado general, accesorios..."
                    className="min-h-[100px] resize-none"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">Máximo 500 caracteres</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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
