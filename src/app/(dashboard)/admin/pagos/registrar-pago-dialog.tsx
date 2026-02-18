"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Pago } from "./types";

const registrarPagoFormSchema = z.object({
  metodo: z.enum(["EFECTIVO", "TRANSFERENCIA", "MERCADOPAGO"], {
    required_error: "Selecciona un método de pago",
  }),
  mpPaymentId: z.string().optional(),
  comprobante: z.string().optional(),
  notas: z.string().optional(),
});

type RegistrarPagoFormData = z.infer<typeof registrarPagoFormSchema>;

type Props = {
  pago: Pago | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: RegistrarPagoFormData) => Promise<void>;
  isLoading: boolean;
};

export function RegistrarPagoDialog({
  pago,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: Props) {
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<string>("");

  const form = useForm<RegistrarPagoFormData>({
    resolver: zodResolver(registrarPagoFormSchema),
    defaultValues: {
      metodo: "EFECTIVO",
      mpPaymentId: "",
      comprobante: "",
      notas: "",
    },
  });

  const onSubmit = async (data: RegistrarPagoFormData) => {
    await onConfirm(data);
    form.reset();
    setMetodoSeleccionado("");
  };

  if (!pago) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Registra el pago recibido y actualiza el estado del contrato
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info del pago */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <p className="font-medium">
                  {pago.contrato.cliente.nombre ||
                    pago.contrato.cliente.user.name ||
                    pago.contrato.cliente.email}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Moto:</span>
                <p className="font-medium">
                  {pago.contrato.moto.marca} {pago.contrato.moto.modelo}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {pago.contrato.moto.patente}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Monto:</span>
                <p className="text-lg font-bold">{formatCurrency(pago.monto)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Vencimiento:</span>
                <p className="font-medium">
                  {pago.vencimientoAt
                    ? formatDate(new Date(pago.vencimientoAt))
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="metodo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pago *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setMetodoSeleccionado(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona método" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        <SelectItem value="TRANSFERENCIA">
                          Transferencia
                        </SelectItem>
                        <SelectItem value="MERCADOPAGO">MercadoPago</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {metodoSeleccionado === "MERCADOPAGO" && (
                <FormField
                  control={form.control}
                  name="mpPaymentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID de Transacción MercadoPago</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ej: 123456789"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="comprobante"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comprobante (URL o Referencia)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="URL de imagen o número de comprobante"
                        {...field}
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
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas adicionales sobre el pago..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Registrando..." : "Registrar Pago"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
