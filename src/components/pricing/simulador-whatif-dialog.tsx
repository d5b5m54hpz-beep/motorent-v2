"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type SimulacionResultado = {
  escenario: string;
  impacto: {
    costoPromedioActual: number;
    costoPromedioNuevo: number;
    margenActualPromedio: number;
    margenNuevoPromedio: number;
    productosAfectados: number;
    productosBajoMinimoActual: number;
    productosBajoMinimo: number;
    ajusteNecesario: string;
  };
  detalle: Array<{
    repuestoId: string;
    repuesto: string;
    categoria: string | null;
    costoActual: number;
    costoSimulado: number;
    precioActual: number;
    precioSimulado: number;
    margenActual: number;
    margenSimulado: number;
    estado: string;
  }>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SimuladorWhatIfDialog({ open, onOpenChange }: Props) {
  const [escenario, setEscenario] = useState("FLETE_CAMBIO");
  const [variacion, setVariacion] = useState("25");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<SimulacionResultado | null>(null);

  const handleSimular = async () => {
    try {
      setLoading(true);
      const variacionDecimal = parseFloat(variacion) / 100;

      const res = await fetch(
        `/api/pricing-repuestos/analisis-whatif?escenario=${escenario}&variacion=${variacionDecimal}`
      );

      if (!res.ok) throw new Error();

      const data = await res.json();
      setResultado(data);
      toast.success("Simulación completada");
    } catch (error) {
      toast.error("Error al simular escenario");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "CRITICO":
        return "destructive";
      case "BAJO":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Simulador What-If
          </DialogTitle>
          <DialogDescription>
            Analiza el impacto de cambios en costos o precios sobre tus márgenes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuración del escenario */}
          <div className="space-y-4">
            <Label>¿Qué pasa si...?</Label>
            <RadioGroup value={escenario} onValueChange={setEscenario}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="TC_CAMBIO" id="tc" />
                <Label htmlFor="tc" className="font-normal cursor-pointer">
                  El tipo de cambio sube
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FLETE_CAMBIO" id="flete" />
                <Label htmlFor="flete" className="font-normal cursor-pointer">
                  El flete internacional sube
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ARANCEL_CAMBIO" id="arancel" />
                <Label htmlFor="arancel" className="font-normal cursor-pointer">
                  Los aranceles cambian a
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MARKUP_CAMBIO" id="markup" />
                <Label htmlFor="markup" className="font-normal cursor-pointer">
                  Aplicamos markup general de
                </Label>
              </div>
            </RadioGroup>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="variacion">
                  {escenario === "ARANCEL_CAMBIO" ? "Nuevo arancel (%)" : "Variación (%)"}
                </Label>
                <Input
                  id="variacion"
                  type="number"
                  value={variacion}
                  onChange={(e) => setVariacion(e.target.value)}
                  placeholder="ej: 25"
                />
              </div>
              <Button onClick={handleSimular} disabled={loading} className="gap-2">
                <Sparkles className="h-4 w-4" />
                {loading ? "Simulando..." : "Simular"}
              </Button>
            </div>
          </div>

          {/* Resultados */}
          {resultado && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-medium mb-3">Resultado: {resultado.escenario}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Costo promedio actual</p>
                    <p className="text-lg font-medium">
                      ARS {resultado.impacto.costoPromedioActual.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Costo promedio nuevo</p>
                    <p className="text-lg font-medium text-orange-600">
                      ARS {resultado.impacto.costoPromedioNuevo.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Margen actual</p>
                    <p className="text-lg font-medium">
                      {(resultado.impacto.margenActualPromedio * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Margen nuevo</p>
                    <p className="text-lg font-medium text-red-600">
                      {(resultado.impacto.margenNuevoPromedio * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bajo mínimo actual</p>
                    <p className="text-lg font-medium">
                      {resultado.impacto.productosBajoMinimoActual} productos
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bajo mínimo nuevo</p>
                    <p className="text-lg font-medium text-red-600">
                      {resultado.impacto.productosBajoMinimo} productos
                      <span className="text-sm ml-2">
                        (+{resultado.impacto.productosBajoMinimo - resultado.impacto.productosBajoMinimoActual})
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-cyan-50 dark:bg-cyan-950 rounded border border-cyan-200 dark:border-cyan-800">
                  <p className="text-sm font-medium">
                    💡 Para mantener el margen actual necesitarías subir precios{" "}
                    <span className="font-bold">{resultado.impacto.ajusteNecesario}</span>
                  </p>
                </div>
              </div>

              {/* Productos más afectados */}
              <div>
                <h3 className="font-medium mb-3">Productos más afectados (Top 10)</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Repuesto</TableHead>
                        <TableHead className="text-right">Costo Actual</TableHead>
                        <TableHead className="text-right">Costo Nuevo</TableHead>
                        <TableHead className="text-right">Margen Actual</TableHead>
                        <TableHead className="text-right">Margen Nuevo</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultado.detalle.slice(0, 10).map((item) => (
                        <TableRow key={item.repuestoId}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="text-sm">{item.repuesto}</div>
                              {item.categoria && (
                                <div className="text-xs text-muted-foreground">{item.categoria}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.costoActual.toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            ${item.costoSimulado.toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right">
                            {(item.margenActual * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            {(item.margenSimulado * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={getEstadoColor(item.estado)}>
                              {item.estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {!resultado && (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Configura un escenario y presiona Simular para ver los resultados</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
