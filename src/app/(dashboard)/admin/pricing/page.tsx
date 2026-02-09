"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { pricingSchema, type PricingInput } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";

type PricingConfig = {
  id: string;
  precioBaseMensual: number;
  descuentoSemanal: number;
  descuentoMeses3: number;
  descuentoMeses6: number;
  descuentoMeses9: number;
  descuentoMeses12: number;
};

export default function PricingPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);

  const isAdmin = session?.user?.role === "ADMIN";

  const form = useForm<PricingInput>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      precioBaseMensual: 50000,
      descuentoSemanal: 0,
      descuentoMeses3: 5,
      descuentoMeses6: 10,
      descuentoMeses9: 15,
      descuentoMeses12: 20,
    },
  });

  // Watch all form values for live preview
  const watchedValues = form.watch();

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pricing");
      if (!res.ok) throw new Error("Error al cargar configuración");

      const data = await res.json();
      setPricingConfig(data);
      form.reset({
        precioBaseMensual: data.precioBaseMensual,
        descuentoSemanal: data.descuentoSemanal,
        descuentoMeses3: data.descuentoMeses3,
        descuentoMeses6: data.descuentoMeses6,
        descuentoMeses9: data.descuentoMeses9,
        descuentoMeses12: data.descuentoMeses12,
      });
    } catch (error) {
      console.error("Error fetching pricing:", error);
      toast.error("Error al cargar configuración de precios");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: PricingInput) => {
    if (!isAdmin) {
      toast.error("Solo administradores pueden modificar la configuración");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al guardar configuración");
      }

      const updatedConfig = await res.json();
      setPricingConfig(updatedConfig);
      toast.success("Configuración de precios actualizada correctamente");
    } catch (error) {
      console.error("Error saving pricing:", error);
      const message = error instanceof Error ? error.message : "Error al guardar configuración";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular precio con descuentos
  const calcularPrecio = (
    precioBase: number,
    frecuencia: "semanal" | "quincenal" | "mensual",
    duracionMeses: 1 | 3 | 6 | 9 | 12
  ) => {
    let precio = precioBase;

    // Aplicar descuento por frecuencia
    if (frecuencia === "semanal") {
      precio = precio - (precio * watchedValues.descuentoSemanal) / 100;
      precio = precio * 4.33; // Aproximadamente 4.33 semanas por mes
    } else if (frecuencia === "quincenal") {
      precio = precio * 2; // 2 quincenas por mes
    }

    // Aplicar descuento por duración (1 mes = sin descuento)
    const descuentoDuracion =
      duracionMeses === 1
        ? 0
        : duracionMeses === 3
        ? watchedValues.descuentoMeses3
        : duracionMeses === 6
        ? watchedValues.descuentoMeses6
        : duracionMeses === 9
        ? watchedValues.descuentoMeses9
        : watchedValues.descuentoMeses12;

    precio = precio - (precio * descuentoDuracion) / 100;

    return precio;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración de Precios</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Configura los precios base y descuentos aplicados a los contratos"
            : "Vista de solo lectura - Solo administradores pueden modificar"}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
            <CardDescription>
              Define precios base y descuentos por frecuencia y duración
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Precio Base */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight">Precio Base</h3>
                  <FormField
                    control={form.control}
                    name="precioBaseMensual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio Mensual Base</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="50000"
                            {...field}
                            disabled={!isAdmin}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Precio base por mes sin descuentos aplicados
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Descuentos por Frecuencia */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight">
                    Descuentos por Frecuencia de Pago
                  </h3>
                  <FormField
                    control={form.control}
                    name="descuentoSemanal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descuento Semanal (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            disabled={!isAdmin}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Descuento aplicado en pagos semanales (0-100%)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Descuentos por Duración */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight">
                    Descuentos por Duración del Contrato
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="descuentoMeses3"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>3 Meses (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="5"
                              {...field}
                              disabled={!isAdmin}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="descuentoMeses6"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>6 Meses (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="10"
                              {...field}
                              disabled={!isAdmin}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="descuentoMeses9"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>9 Meses (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="15"
                              {...field}
                              disabled={!isAdmin}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="descuentoMeses12"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>12 Meses (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="20"
                              {...field}
                              disabled={!isAdmin}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {isAdmin && (
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Guardando..." : "Guardar Configuración"}
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview de Precios</CardTitle>
            <CardDescription>
              Vista previa de precios finales según frecuencia y duración
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Duración</TableHead>
                  <TableHead>Semanal</TableHead>
                  <TableHead>Quincenal</TableHead>
                  <TableHead>Mensual</TableHead>
                  <TableHead>Precio/día</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 3, 6, 9, 12].map((meses) => {
                  const precioMensual = calcularPrecio(watchedValues.precioBaseMensual, "mensual", meses as 1 | 3 | 6 | 9 | 12);
                  const precioDiario = precioMensual / 30;

                  return (
                    <TableRow key={meses}>
                      <TableCell className="font-medium">
                        {meses} {meses === 1 ? "mes" : "meses"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(
                          calcularPrecio(watchedValues.precioBaseMensual, "semanal", meses as 1 | 3 | 6 | 9 | 12)
                        )}
                        <span className="text-xs text-muted-foreground block">/semana</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(
                          calcularPrecio(watchedValues.precioBaseMensual, "quincenal", meses as 1 | 3 | 6 | 9 | 12)
                        )}
                        <span className="text-xs text-muted-foreground block">/quincena</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(precioMensual)}
                        <span className="text-xs text-muted-foreground block">/mes</span>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-primary">
                        {formatCurrency(precioDiario)}
                        <span className="text-xs text-muted-foreground block">/día</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
              <p className="font-medium">Notas:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Precio semanal = (Base - Desc. Frecuencia) × 4.33</li>
                <li>Precio quincenal = Base × 2</li>
                <li>Descuentos por duración se aplican al final</li>
                <li>Los precios son aproximados y pueden variar</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
