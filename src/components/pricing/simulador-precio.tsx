"use client";

import { useState } from "react";
import { Calculator, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type PrecioResuelto = {
  repuestoId: string;
  listaPrecioCodigo: string;
  precioBaseArs: number;
  precioRetailArs: number;
  precioFinalArs: number;
  descuentoTotalPct: number;
  margenResultante: number;
  alertaMargen: string;
  desglose: {
    paso: number;
    descripcion: string;
    valor: number | string;
  }[];
};

type Repuesto = {
  id: string;
  nombre: string;
  costoPromedioArs: number;
  precioVenta: number;
};

export function SimuladorPrecio() {
  const [repuestoId, setRepuestoId] = useState("");
  const [listaPrecio, setListaPrecio] = useState("B2C");
  const [cantidad, setCantidad] = useState("1");
  const [clienteId, setClienteId] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<PrecioResuelto | null>(null);
  const [repuesto, setRepuesto] = useState<Repuesto | null>(null);

  const handleSimular = async () => {
    if (!repuestoId) {
      toast.error("Debes ingresar un ID de repuesto");
      return;
    }

    try {
      setLoading(true);
      const query = new URLSearchParams({
        repuestoId,
        listaPrecioCodigo: listaPrecio,
        cantidad: cantidad || "1",
      });

      if (clienteId) query.set("clienteId", clienteId);

      const [resResolver, resRepuesto] = await Promise.all([
        fetch(`/api/pricing-repuestos/resolver?${query}`),
        fetch(`/api/repuestos?id=${repuestoId}`),
      ]);

      if (!resResolver.ok) throw new Error("Error al resolver precio");

      const dataResolver = await resResolver.json();
      setResultado(dataResolver);

      if (resRepuesto.ok) {
        const dataRepuesto = await resRepuesto.json();
        const rep = dataRepuesto.data?.[0];
        if (rep) setRepuesto(rep);
      }

      toast.success("Precio calculado exitosamente");
    } catch (error) {
      toast.error("Error al simular precio");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getMargenBadgeVariant = (alerta: string) => {
    switch (alerta) {
      case "CRITICO":
        return "destructive";
      case "BAJO":
        return "secondary";
      case "MODERADO":
        return "default";
      case "OPTIMO":
        return "default";
      default:
        return "outline";
    }
  };

  const getMargenColor = (margen: number) => {
    if (margen >= 0.35) return "text-green-600";
    if (margen >= 0.25) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Simulador de Precios
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Calcula el precio final con desglose detallado de aplicación de reglas
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="repuestoId">ID del Repuesto</Label>
              <Input
                id="repuestoId"
                value={repuestoId}
                onChange={(e) => setRepuestoId(e.target.value)}
                placeholder="ej: clxa1234..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="listaPrecio">Lista de Precios</Label>
              <Select value={listaPrecio} onValueChange={setListaPrecio}>
                <SelectTrigger id="listaPrecio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B2C">B2C Retail</SelectItem>
                  <SelectItem value="RIDER">Rider Activo</SelectItem>
                  <SelectItem value="TALLER">Taller Externo</SelectItem>
                  <SelectItem value="INTERNO">Uso Interno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clienteId">ID del Cliente (opcional)</Label>
              <Input
                id="clienteId"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                placeholder="Para descuentos personalizados"
              />
            </div>
          </div>

          <Button onClick={handleSimular} disabled={loading} className="w-full">
            {loading ? "Calculando..." : "Simular Precio"}
          </Button>

          {resultado && (
            <div className="mt-6 space-y-4">
              <div className="border rounded-lg p-4 bg-muted">
                <h3 className="font-medium mb-3">Resultado del Cálculo</h3>
                {repuesto && (
                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground">Repuesto</p>
                    <p className="font-medium">{repuesto.nombre}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Lista de Precios</p>
                    <Badge variant="outline">{resultado.listaPrecioCodigo}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Precio Base (costo)</p>
                    <p className="text-lg font-medium">
                      ${resultado.precioBaseArs.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Precio Retail (antes desc.)</p>
                    <p className="text-lg font-medium">
                      ${resultado.precioRetailArs.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Descuento Total</p>
                    <p className="text-lg font-medium text-cyan-600">
                      {resultado.descuentoTotalPct.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Precio Final</p>
                      <p className="text-3xl font-bold">
                        ${resultado.precioFinalArs.toLocaleString("es-AR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Margen Resultante</p>
                      <p className={`text-2xl font-bold ${getMargenColor(resultado.margenResultante)}`}>
                        {(resultado.margenResultante * 100).toFixed(1)}%
                      </p>
                      <Badge variant={getMargenBadgeVariant(resultado.alertaMargen)} className="mt-1">
                        {resultado.alertaMargen}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {resultado.desglose && resultado.desglose.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Desglose Detallado (8 Pasos)
                  </h3>
                  <div className="space-y-2">
                    {resultado.desglose.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-sm font-medium">
                          {item.paso}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.descripcion}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {typeof item.valor === "number"
                              ? `$${item.valor.toLocaleString("es-AR")}`
                              : item.valor}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
