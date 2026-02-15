"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calculator, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CalcularCostosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embarqueId: string;
  embarqueReferencia: string;
  onSuccess?: () => void;
}

export function CalcularCostosDialog({
  open,
  onOpenChange,
  embarqueId,
  embarqueReferencia,
  onSuccess,
}: CalcularCostosDialogProps) {
  const [calculando, setCalculando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [costosCalculados, setCostosCalculados] = useState<any>(null);

  // Form state
  const [tipoCambio, setTipoCambio] = useState(1200);
  const [tasaEstPct, setTasaEstPct] = useState(3);
  const [ivaPct, setIvaPct] = useState(21);
  const [ivaAdicPct, setIvaAdicPct] = useState(20);
  const [gananciasPct, setGananciasPct] = useState(6);
  const [iibbPct, setIibbPct] = useState(3);
  const [despachanteFee, setDespachanteFee] = useState(0);
  const [gastosPuerto, setGastosPuerto] = useState(0);
  const [transporteInterno, setTransporteInterno] = useState(0);
  const [otrosGastos, setOtrosGastos] = useState(0);
  const [metodoAsignacion, setMetodoAsignacion] = useState("POR_VALOR");

  const calcularCostos = async () => {
    setCalculando(true);
    try {
      const res = await fetch(`/api/embarques/${embarqueId}/calcular-costos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoCambioArsUsd: tipoCambio,
          tasaEstadisticaPct: tasaEstPct / 100,
          ivaPct: ivaPct / 100,
          ivaAdicionalPct: ivaAdicPct / 100,
          gananciasPct: gananciasPct / 100,
          iibbPct: iibbPct / 100,
          despachanteFee,
          gastosPuerto,
          transporteInterno,
          otrosGastos,
          metodoAsignacion,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al calcular costos");
      }

      const data = await res.json();
      setCostosCalculados(data);
      toast.success(`Costos calculados: ${data.items.length} items procesados`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al calcular costos");
      console.error(error);
    } finally {
      setCalculando(false);
    }
  };

  const confirmarCostos = async () => {
    if (!costosCalculados) return;

    setConfirmando(true);
    try {
      const res = await fetch(`/api/embarques/${embarqueId}/confirmar-costos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costos: costosCalculados }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al confirmar costos");
      }

      const data = await res.json();
      toast.success(
        `✅ Costos aplicados: ${data.cambios?.length || 0} repuestos actualizados. Estado → COSTO_FINALIZADO`
      );
      onSuccess?.();
      onOpenChange(false);
      setCostosCalculados(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al confirmar costos");
      console.error(error);
    } finally {
      setConfirmando(false);
    }
  };

  const getMargenBadge = (alerta: string) => {
    switch (alerta) {
      case "VERDE":
        return (
          <Badge className="bg-teal-500 hover:bg-teal-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            OK
          </Badge>
        );
      case "AMARILLO":
        return (
          <Badge variant="secondary">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Bajo
          </Badge>
        );
      case "ROJO":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Crítico
          </Badge>
        );
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-teal-500" />
            Calcular Costos de Nacionalización
          </DialogTitle>
          <DialogDescription>
            {embarqueReferencia} - Prorrateado de costos y márgenes por item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!costosCalculados ? (
            <>
              {/* Formulario de parámetros */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Parámetros de Cálculo</h3>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo de Cambio ARS/USD *</Label>
                    <Input
                      type="number"
                      value={tipoCambio}
                      onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 0)}
                      placeholder="1200"
                    />
                  </div>
                  <div>
                    <Label>Método de Asignación *</Label>
                    <Select value={metodoAsignacion} onValueChange={setMetodoAsignacion}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POR_VALOR">Por Valor FOB</SelectItem>
                        <SelectItem value="POR_PESO">Por Peso</SelectItem>
                        <SelectItem value="POR_VOLUMEN">Por Volumen</SelectItem>
                        <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Tasa Estadística %</Label>
                    <Input
                      type="number"
                      value={tasaEstPct}
                      onChange={(e) => setTasaEstPct(parseFloat(e.target.value) || 0)}
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <Label>IVA %</Label>
                    <Input
                      type="number"
                      value={ivaPct}
                      onChange={(e) => setIvaPct(parseFloat(e.target.value) || 0)}
                      placeholder="21"
                    />
                  </div>
                  <div>
                    <Label>IVA Adicional %</Label>
                    <Input
                      type="number"
                      value={ivaAdicPct}
                      onChange={(e) => setIvaAdicPct(parseFloat(e.target.value) || 0)}
                      placeholder="20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Ganancias %</Label>
                    <Input
                      type="number"
                      value={gananciasPct}
                      onChange={(e) => setGananciasPct(parseFloat(e.target.value) || 0)}
                      placeholder="6"
                    />
                  </div>
                  <div>
                    <Label>IIBB %</Label>
                    <Input
                      type="number"
                      value={iibbPct}
                      onChange={(e) => setIibbPct(parseFloat(e.target.value) || 0)}
                      placeholder="3"
                    />
                  </div>
                </div>

                <h3 className="font-medium text-sm pt-4">Gastos Logísticos (USD)</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Despachante</Label>
                    <Input
                      type="number"
                      value={despachanteFee}
                      onChange={(e) => setDespachanteFee(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Gastos de Puerto</Label>
                    <Input
                      type="number"
                      value={gastosPuerto}
                      onChange={(e) => setGastosPuerto(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Transporte Interno</Label>
                    <Input
                      type="number"
                      value={transporteInterno}
                      onChange={(e) => setTransporteInterno(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Otros Gastos</Label>
                    <Input
                      type="number"
                      value={otrosGastos}
                      onChange={(e) => setOtrosGastos(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Resultados */}
              <div className="space-y-4">
                {/* Resumen general */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">CIF Total</p>
                    <p className="text-lg font-bold">USD {costosCalculados.cifUsd.toFixed(2)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Costo No Recuperable</p>
                    <p className="text-lg font-bold text-teal-600">
                      USD {costosCalculados.costoTotalNoRecuperable.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Impuestos Recuperables</p>
                    <p className="text-lg font-bold text-blue-600">
                      USD {costosCalculados.costoTotalRecuperable.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Desembolso Total</p>
                    <p className="text-lg font-bold">USD {costosCalculados.desembolsoTotal.toFixed(2)}</p>
                  </div>
                </div>

                {/* Tabla de items */}
                <div>
                  <h3 className="font-medium text-sm mb-2">Desglose por Item</h3>
                  <ScrollArea className="h-[400px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky top-0 bg-background">Repuesto</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead className="text-right">FOB Unit.</TableHead>
                          <TableHead className="text-right">Flete</TableHead>
                          <TableHead className="text-right">Seguro</TableHead>
                          <TableHead className="text-right">Derechos</TableHead>
                          <TableHead className="text-right">Tasas</TableHead>
                          <TableHead className="text-right">Logística</TableHead>
                          <TableHead className="text-right">Landed Cost USD</TableHead>
                          <TableHead className="text-right">Landed Cost ARS</TableHead>
                          <TableHead className="text-right">Margen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costosCalculados.items.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-sm max-w-[200px] truncate">
                              {item.nombre}
                            </TableCell>
                            <TableCell className="text-right">{item.cantidad}</TableCell>
                            <TableCell className="text-right text-sm">
                              ${item.desglose.fob.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              ${item.desglose.flete.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              ${item.desglose.seguro.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              ${item.desglose.derechos.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              ${item.desglose.tasaEstadistica.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              ${item.desglose.logistica.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-teal-600">
                              ${item.costoLandedUnitarioUsd.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              ${item.costoLandedUnitarioArs.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-xs">
                                  {(item.margenActual * 100).toFixed(1)}%
                                </span>
                                {getMargenBadge(item.alertaMargen)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* Resumen por categoría */}
                {costosCalculados.resumen?.porCategoria && (
                  <div>
                    <h3 className="font-medium text-sm mb-2">Resumen por Categoría</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {costosCalculados.resumen.porCategoria.map((cat: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-3 text-sm">
                          <p className="font-medium">{cat.categoria}</p>
                          <p className="text-xs text-muted-foreground">{cat.items} items</p>
                          <p className="text-sm font-bold text-teal-600">
                            USD {cat.costoTotal.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">{cat.porcentaje}% del total</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {!costosCalculados ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={calcularCostos}
                disabled={calculando}
                className="bg-teal-500 hover:bg-teal-600"
              >
                {calculando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Calcular
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setCostosCalculados(null)}>
                Recalcular
              </Button>
              <Button
                onClick={confirmarCostos}
                disabled={confirmando}
                className="bg-teal-500 hover:bg-teal-600"
              >
                {confirmando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar y Aplicar Costos
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
