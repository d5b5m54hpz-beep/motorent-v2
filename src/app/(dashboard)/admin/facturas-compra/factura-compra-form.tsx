"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { facturaCompraSchema, categoriasGasto, categoriaGastoLabels } from "@/lib/validations";
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
import { Loader2, Sparkles } from "lucide-react";
import { OCRUploadDialog } from "./ocr-upload-dialog";
import type { FacturaCompra, FacturaCompraFormData, OCRResponse } from "./types";
import { z } from "zod";

type Moto = { id: string; marca: string; modelo: string; patente: string };
type Proveedor = { id: string; nombre: string };

type Props = {
  factura?: FacturaCompra | null;
  onSubmit: (data: FacturaCompraFormData) => Promise<void>;
  isLoading: boolean;
};

export function FacturaCompraForm({ factura, onSubmit, isLoading }: Props) {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);

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

  const form = useForm<z.infer<typeof facturaCompraSchema>>({
    resolver: zodResolver(facturaCompraSchema),
    defaultValues: {
      proveedorId: factura?.proveedorId ?? "",
      razonSocial: factura?.razonSocial ?? "",
      cuit: factura?.cuit ?? "",
      tipo: factura?.tipo ?? "B",
      numero: factura?.numero ?? "",
      puntoVenta: factura?.puntoVenta ?? "",
      fecha: factura?.fecha ? new Date(factura.fecha).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      vencimiento: factura?.vencimiento ? new Date(factura.vencimiento).toISOString().slice(0, 10) : "",
      subtotal: factura?.subtotal ?? 0,
      iva21: factura?.iva21 ?? 0,
      iva105: factura?.iva105 ?? 0,
      iva27: factura?.iva27 ?? 0,
      percepcionIVA: factura?.percepcionIVA ?? 0,
      percepcionIIBB: factura?.percepcionIIBB ?? 0,
      impInterno: factura?.impInterno ?? 0,
      noGravado: factura?.noGravado ?? 0,
      exento: factura?.exento ?? 0,
      categoria: factura?.categoria ?? "OTRO",
      subcategoria: factura?.subcategoria ?? "",
      centroGasto: factura?.centroGasto ?? "",
      motoId: factura?.motoId ?? "",
      estado: factura?.estado ?? "PENDIENTE",
      montoAbonado: factura?.montoAbonado ?? 0,
      archivoUrl: factura?.archivoUrl ?? "",
      archivoNombre: factura?.archivoNombre ?? "",
      notas: factura?.notas ?? "",
    },
  });

  const handleOCRData = (data: OCRResponse["data"]) => {
    form.setValue("razonSocial", data.razonSocial);
    if (data.cuit) form.setValue("cuit", data.cuit);
    form.setValue("tipo", data.tipo);
    form.setValue("numero", data.numero);
    if (data.puntoVenta) form.setValue("puntoVenta", data.puntoVenta);
    form.setValue("fecha", data.fecha);
    if (data.vencimiento) form.setValue("vencimiento", data.vencimiento);
    form.setValue("subtotal", data.subtotal);
    form.setValue("iva21", data.iva21);
    form.setValue("iva105", data.iva105);
    form.setValue("iva27", data.iva27);
    form.setValue("percepcionIVA", data.percepcionIVA);
    form.setValue("percepcionIIBB", data.percepcionIIBB);
    form.setValue("impInterno", data.impInterno);
    form.setValue("noGravado", data.noGravado);
    form.setValue("exento", data.exento);
    if (data.notas) form.setValue("notas", data.notas);
  };

  const watchedValues = form.watch([
    "subtotal", "iva21", "iva105", "iva27",
    "percepcionIVA", "percepcionIIBB", "impInterno",
    "noGravado", "exento"
  ]);

  const totalCalculado =
    (watchedValues[0] || 0) +
    (watchedValues[1] || 0) +
    (watchedValues[2] || 0) +
    (watchedValues[3] || 0) +
    (watchedValues[4] || 0) +
    (watchedValues[5] || 0) +
    (watchedValues[6] || 0) +
    (watchedValues[7] || 0) +
    (watchedValues[8] || 0);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {!factura && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOcrDialogOpen(true)}
                disabled={isLoading}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Cargar con OCR
              </Button>
            </div>
          )}

          {/* Proveedor */}
          <div className="space-y-4">
            <h3 className="font-semibold">Datos del Proveedor</h3>
            <FormField
              control={form.control}
              name="proveedorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                    value={field.value || "none"}
                    disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proveedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin proveedor</SelectItem>
                      {proveedores.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
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
                name="razonSocial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón Social<span className="text-destructive ml-0.5">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="ACME S.A." disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cuit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CUIT</FormLabel>
                    <FormControl>
                      <Input placeholder="20-12345678-9" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Factura */}
          <div className="space-y-4">
            <h3 className="font-semibold">Datos de la Factura</h3>
            <div className="grid grid-cols-3 gap-4">
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
                        <SelectItem value="A">Factura A</SelectItem>
                        <SelectItem value="B">Factura B</SelectItem>
                        <SelectItem value="C">Factura C</SelectItem>
                        <SelectItem value="TICKET">Ticket</SelectItem>
                        <SelectItem value="RECIBO">Recibo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="puntoVenta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Punto Venta</FormLabel>
                    <FormControl>
                      <Input placeholder="0001" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número<span className="text-destructive ml-0.5">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="00012345" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Emisión<span className="text-destructive ml-0.5">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vencimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimiento</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Montos e Impuestos */}
          <div className="space-y-4">
            <h3 className="font-semibold">Montos e Impuestos</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subtotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtotal<span className="text-destructive ml-0.5">*</span></FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="iva21"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IVA 21%</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="iva105"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IVA 10.5%</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="iva27"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IVA 27%</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="percepcionIVA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percepción IVA</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="percepcionIIBB"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percepción IIBB</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="impInterno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imp. Internos</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="noGravado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No Gravado</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exento</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                Total calculado: <span className="text-lg font-bold text-red-600 dark:text-red-400">${totalCalculado.toFixed(2)}</span>
              </p>
            </div>
          </div>

          <Separator />

          {/* Categorización */}
          <div className="space-y-4">
            <h3 className="font-semibold">Categorización</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría<span className="text-destructive ml-0.5">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriasGasto.map((c) => (
                          <SelectItem key={c} value={c}>{categoriaGastoLabels[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subcategoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategoría</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Aceite, Filtros..." disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="centroGasto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de Gasto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Flota, Administración..." disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="motoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moto Asociada</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                      value={field.value || "none"}
                      disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar moto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin moto</SelectItem>
                        {motos.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.marca} {m.modelo} - {m.patente}</SelectItem>
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

          {/* Estado */}
          <div className="space-y-4">
            <h3 className="font-semibold">Estado de Pago</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado<span className="text-destructive ml-0.5">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                        <SelectItem value="PAGADA">Pagada</SelectItem>
                        <SelectItem value="PAGADA_PARCIAL">Pago Parcial</SelectItem>
                        <SelectItem value="VENCIDA">Vencida</SelectItem>
                        <SelectItem value="ANULADA">Anulada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="montoAbonado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Abonado</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Notas */}
          <FormField
            control={form.control}
            name="notas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea placeholder="Observaciones adicionales..." rows={3} disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {factura ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </form>
      </Form>

      <OCRUploadDialog
        open={ocrDialogOpen}
        onOpenChange={setOcrDialogOpen}
        onDataExtracted={handleOCRData}
      />
    </>
  );
}
