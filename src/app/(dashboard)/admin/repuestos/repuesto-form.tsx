"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useMemo } from "react";
import { repuestoSchema, type RepuestoInput } from "@/lib/validations";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Loader2, ChevronDown } from "lucide-react";
import type { Repuesto } from "./types";

type Proveedor = { id: string; nombre: string };
type Ubicacion = { id: string; codigo: string; nombre: string | null };

const CATEGORIAS_DEFAULT = [
  "FRENOS",
  "GENERAL",
  "MOTOR",
  "SUSPENSION",
  "ELECTRICO",
  "TRANSMISION",
  "NEUMATICOS",
  "FILTROS",
  "ACEITES",
];

const UNIDADES = ["unidad", "par", "juego", "litro", "metro", "kg", "gramo"];

type Props = {
  repuesto?: Repuesto | null;
  onSubmit: (data: RepuestoInput) => Promise<void>;
  isLoading: boolean;
};

export function RepuestoForm({ repuesto, onSubmit, isLoading }: Props) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_DEFAULT);

  useEffect(() => {
    Promise.all([
      fetch("/api/proveedores?limit=100")
        .then((r) => r.json())
        .then((d) => setProveedores(d.data ?? [])),
      fetch("/api/ubicaciones-deposito")
        .then((r) => r.json())
        .then((d) => setUbicaciones(d ?? [])),
      fetch("/api/repuestos?limit=1000")
        .then((r) => r.json())
        .then((d) => {
          const cats = new Set(CATEGORIAS_DEFAULT);
          (d.data ?? []).forEach((r: Repuesto) => {
            if (r.categoria) cats.add(r.categoria);
          });
          setCategorias(Array.from(cats).sort());
        }),
    ]).catch(() => {});
  }, []);

  const form = useForm<RepuestoInput>({
    resolver: zodResolver(repuestoSchema),
    defaultValues: {
      nombre: repuesto?.nombre ?? "",
      codigo: repuesto?.codigo ?? "",
      categoria: repuesto?.categoria ?? "",
      descripcion: repuesto?.descripcion ?? "",
      marca: repuesto?.marca ?? "",
      modelo: repuesto?.modelo ?? "",
      precioCompra: repuesto?.precioCompra ?? 0,
      precioVenta: repuesto?.precioVenta ?? 0,
      stock: repuesto?.stock ?? 0,
      stockMinimo: repuesto?.stockMinimo ?? 2,
      proveedorId: repuesto?.proveedorId ?? "",
      unidad: repuesto?.unidad ?? "",
      unidadCompra: repuesto?.unidadCompra ?? "",
      factorConversion: repuesto?.factorConversion ?? 1,
      vidaUtilKm: repuesto?.vidaUtilKm ?? undefined,
      ubicacion: repuesto?.ubicacion ?? "",
      codigoBarras: repuesto?.codigoBarras ?? "",
      activo: repuesto?.activo ?? true,
    },
  });

  const precioCompra = form.watch("precioCompra");
  const precioVenta = form.watch("precioVenta");
  const margen = useMemo(() => {
    if (!precioCompra || precioCompra === 0) return 0;
    return Math.round(((precioVenta - precioCompra) / precioCompra) * 100);
  }, [precioCompra, precioVenta]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
        {/* Datos del Repuesto */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Datos del Repuesto</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre<span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Filtro de aceite" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="FA-001" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
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
              name="marca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input placeholder="Honda" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="modelo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo compatible</FormLabel>
                  <FormControl>
                    <Input placeholder="Honda Wave 110" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar unidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UNIDADES.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
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
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descripción detallada del repuesto..."
                    className="resize-none"
                    rows={2}
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Precios */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Precios</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="precioCompra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Compra (ARS)</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precioVenta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Venta (ARS)</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {margen !== 0 && (
            <p className="text-sm text-muted-foreground">
              Margen: <span className={margen > 0 ? "text-green-600" : "text-red-600"}>{margen}%</span>
            </p>
          )}
        </div>

        <Separator />

        {/* Stock y Ubicación */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Stock y Ubicación</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Actual</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stockMinimo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Mínimo</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="ubicacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ubicación en depósito</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                  value={field.value || "__none__"}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin ubicación" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Sin ubicación</SelectItem>
                    {ubicaciones.map((ub) => (
                      <SelectItem key={ub.id} value={ub.codigo}>
                        {ub.codigo} {ub.nombre ? `— ${ub.nombre}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="unidadCompra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad de compra</FormLabel>
                  <FormControl>
                    <Input placeholder="caja, bolsa, unidad" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">Cómo se compra</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="factorConversion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Factor de conversión</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">Unidades por unidad de compra</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Proveedor */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">Proveedor</h3>
          <FormField
            control={form.control}
            name="proveedorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proveedor</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                  value={field.value || "__none__"}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Sin proveedor</SelectItem>
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

        <Separator />

        {/* Avanzado */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-muted-foreground">
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            Avanzado
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="codigoBarras"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de barras</FormLabel>
                  <FormControl>
                    <Input placeholder="7891234567890" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vidaUtilKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vida útil (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5000"
                        disabled={isLoading}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? undefined : Number(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "true")}
                      value={field.value ? "true" : "false"}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Activo</SelectItem>
                        <SelectItem value="false">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        <div className="flex items-center justify-end gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> Campos requeridos
          </p>
          <Button type="submit" disabled={isLoading} className="min-w-[140px]">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {repuesto ? "Guardar cambios" : "Crear repuesto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
