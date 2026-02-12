"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, FileText, ShieldAlert, DollarSign } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { bajaMotoSchema, type BajaMotoInput } from "@/lib/validations";

interface BajaMotoDialogProps {
  motoId: string;
  motoPatente: string;
  motoMarca: string;
  motoModelo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BajaMotoDialog({
  motoId,
  motoPatente,
  motoMarca,
  motoModelo,
  open,
  onOpenChange,
}: BajaMotoDialogProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<BajaMotoInput>({
    resolver: zodResolver(bajaMotoSchema),
    defaultValues: {
      motoId,
      tipoBaja: "ROBO",
      fechaBaja: new Date().toISOString().split("T")[0],
      motivo: "",
      numeroDenuncia: "",
      comisaria: "",
      fechaDenuncia: "",
      numeroSiniestro: "",
      aseguradora: "",
      montoIndemnizacion: 0,
      fechaSiniestro: "",
      compradorNombre: "",
      compradorDNI: "",
      compradorTelefono: "",
      precioVenta: 0,
      formaPago: "TRANSFERENCIA",
      archivoUrl: "",
      notas: "",
    },
  });

  const tipoBaja = form.watch("tipoBaja");

  async function onSubmit(data: BajaMotoInput) {
    setLoading(true);
    try {
      const res = await fetch(`/api/motos/${motoId}/baja`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Error al registrar la baja");
        return;
      }

      toast.success(`Moto dada de baja exitosamente (${data.tipoBaja})`);
      onOpenChange(false);
      form.reset();
      router.refresh();
    } catch (error) {
      console.error("Error registrando baja:", error);
      toast.error("Error al registrar la baja");
    } finally {
      setLoading(false);
    }
  }

  const getTipoIcon = () => {
    switch (tipoBaja) {
      case "ROBO":
        return <ShieldAlert className="h-5 w-5 text-red-600" />;
      case "SINIESTRO":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "VENTA":
        return <DollarSign className="h-5 w-5 text-teal-600" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTipoIcon()}
            Dar de Baja Moto
          </DialogTitle>
          <DialogDescription>
            Registrar baja definitiva de{" "}
            <span className="font-semibold">
              {motoMarca} {motoModelo} ({motoPatente})
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo y Fecha */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipoBaja"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tipo de Baja <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ROBO">Robo</SelectItem>
                        <SelectItem value="SINIESTRO">Siniestro Total</SelectItem>
                        <SelectItem value="VENTA">Venta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fechaBaja"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Fecha de Baja <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo / Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descripción breve del motivo de la baja"
                      disabled={loading}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* ROBO Fields */}
            {tipoBaja === "ROBO" && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 text-red-600">
                  <ShieldAlert className="h-4 w-4" />
                  Datos de Denuncia por Robo
                </h3>

                <FormField
                  control={form.control}
                  name="numeroDenuncia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Número de Denuncia <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: 12345/2026" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="comisaria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comisaría</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ej: Comisaría 15" disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fechaDenuncia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Denuncia</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* SINIESTRO Fields */}
            {tipoBaja === "SINIESTRO" && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  Datos de Siniestro Total
                </h3>

                <FormField
                  control={form.control}
                  name="numeroSiniestro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Número de Siniestro <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: SIN-2026-00123" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="aseguradora"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aseguradora</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ej: La Caja" disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fechaSiniestro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha del Siniestro</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="montoIndemnizacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto de Indemnización</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          placeholder="0.00"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* VENTA Fields */}
            {tipoBaja === "VENTA" && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 text-teal-600">
                  <DollarSign className="h-4 w-4" />
                  Datos de Venta
                </h3>

                <FormField
                  control={form.control}
                  name="compradorNombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nombre del Comprador <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nombre completo" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="compradorDNI"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DNI del Comprador</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="12345678" disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="compradorTelefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+54 9 11 1234-5678" disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="precioVenta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Precio de Venta <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            placeholder="0.00"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="formaPago"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma de Pago</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={loading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                            <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                            <SelectItem value="CHEQUE">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <Separator />

            {/* Documentación */}
            <div className="space-y-4">
              <h3 className="font-semibold">Documentación</h3>

              <FormField
                control={form.control}
                name="archivoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de Archivo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://..."
                        disabled={loading}
                      />
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
                    <FormLabel>Notas Adicionales</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Notas adicionales sobre la baja"
                        disabled={loading}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading ? "Registrando..." : "Confirmar Baja"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
