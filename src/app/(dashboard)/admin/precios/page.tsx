"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Pencil, Save, X, DollarSign } from "lucide-react";

type Moto = {
  id: string;
  marca: string;
  modelo: string;
  patente: string;
  precioMensual: number;
  estado: string;
};

type PricingConfig = {
  precioBaseMensual: number;
  descuentoSemanal: number;
  descuentoMeses3: number;
  descuentoMeses6: number;
  descuentoMeses9: number;
  descuentoMeses12: number;
};

export default function PreciosPage() {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [motosRes, configRes] = await Promise.all([
        fetch("/api/motos?limit=1000"),
        fetch("/api/pricing"),
      ]);

      if (motosRes.ok) {
        const motosData = await motosRes.json();
        setMotos(motosData?.data ?? []);
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        setPricingConfig(configData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(motoId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/motos/${motoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precioMensual: editPrice }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar");
      }

      toast.success("Precio actualizado correctamente");
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(moto: Moto) {
    setEditingId(moto.id);
    setEditPrice(moto.precioMensual);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPrice(0);
  }

  function calcularPrecioDiario(precioMensual: number): number {
    return precioMensual / 30;
  }

  function calcularPrecioSemanal(precioMensual: number): number {
    const descuentoSemanal = pricingConfig?.descuentoSemanal ?? 0;
    const precioSinDescuento = (precioMensual / 4);
    return precioSinDescuento * (1 - descuentoSemanal / 100);
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const estadoColors: Record<string, string> = {
    disponible: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    alquilada: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    mantenimiento: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    baja: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración de Precios</h1>
          <p className="text-muted-foreground">
            Define los precios de alquiler para cada moto
          </p>
        </div>
        <DollarSign className="h-10 w-10 text-muted-foreground" />
      </div>

      {/* Pricing Config Info */}
      {pricingConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Configuración de Descuentos</CardTitle>
            <CardDescription>
              Los precios diarios y semanales se calculan automáticamente desde el precio mensual
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Descuento semanal:</span>
              <span className="font-medium">{pricingConfig.descuentoSemanal}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precio diario:</span>
              <span className="font-medium">Precio mensual ÷ 30</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precio semanal:</span>
              <span className="font-medium">(Precio mensual ÷ 4) - {pricingConfig.descuentoSemanal}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Motos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Precios por Moto</CardTitle>
          <CardDescription>
            Haz clic en el ícono de editar para modificar el precio mensual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Moto</TableHead>
                  <TableHead className="text-right">Precio Diario</TableHead>
                  <TableHead className="text-right">Precio Semanal</TableHead>
                  <TableHead className="text-right">Precio Mensual</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : motos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No hay motos registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  motos.map((moto) => {
                    const isEditing = editingId === moto.id;
                    const precioMensual = isEditing ? editPrice : moto.precioMensual;

                    return (
                      <TableRow key={moto.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {moto.marca} {moto.modelo}
                            </p>
                            <p className="text-xs text-muted-foreground">{moto.patente}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(calcularPrecioDiario(precioMensual))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(calcularPrecioSemanal(precioMensual))}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                              className="w-32 text-right"
                              disabled={saving}
                              autoFocus
                            />
                          ) : (
                            <span className="font-semibold text-primary">
                              {formatCurrency(precioMensual)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={estadoColors[moto.estado] ?? "bg-gray-100 text-gray-800"}
                          >
                            {moto.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleSave(moto.id)}
                                disabled={saving}
                              >
                                <Save className="h-4 w-4 text-teal-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={cancelEdit}
                                disabled={saving}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEdit(moto)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
