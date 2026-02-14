"use client";

import { useState, useEffect } from "react";
import { Package, Plus, RefreshCw, Undo2, TrendingUp, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";

type LoteCambioPrecio = {
  id: string;
  descripcion: string | null;
  aplicado: boolean;
  revertido: boolean;
  cantidadItems: number;
  margenPromedioAntes: number | null;
  margenPromedioDespues: number | null;
  usuarioId: string | null;
  createdAt: string;
};

type ResumenCalculoRetail = {
  total: number;
  suben: number;
  bajan: number;
  sinCambio: number;
  margenPromedioActual: number;
  margenPromedioNuevo: number;
  loteId: string;
};

export function CambiosBulkTab() {
  const [lotes, setLotes] = useState<LoteCambioPrecio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogPorcentaje, setDialogPorcentaje] = useState(false);
  const [dialogRecalcular, setDialogRecalcular] = useState(false);
  const [dialogRollback, setDialogRollback] = useState(false);
  const [loteRollback, setLoteRollback] = useState<LoteCambioPrecio | null>(null);
  const [previsualizacion, setPrevisualizacion] = useState<ResumenCalculoRetail | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingAplicar, setLoadingAplicar] = useState(false);

  const [formPorcentaje, setFormPorcentaje] = useState({
    ajustePorcentaje: "10",
    categoria: "",
    descripcion: "",
  });

  const [formRecalcular, setFormRecalcular] = useState({
    categoria: "",
    descripcion: "Recálculo masivo según reglas de markup",
  });

  useEffect(() => {
    fetchLotes();
  }, []);

  const fetchLotes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pricing-repuestos/lotes?limit=50");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLotes(data.data || []);
    } catch (error) {
      toast.error("Error al cargar historial de lotes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevisualizarRecalculo = async () => {
    try {
      setLoadingPreview(true);
      const query = new URLSearchParams();
      if (formRecalcular.categoria) query.set("categoria", formRecalcular.categoria);

      const res = await fetch(`/api/pricing-repuestos/calcular-retail?${query}`);
      if (!res.ok) throw new Error();

      const data = await res.json();
      setPrevisualizacion({
        total: data.resumen.total,
        suben: data.resumen.suben,
        bajan: data.resumen.bajan,
        sinCambio: data.resumen.sinCambio,
        margenPromedioActual: data.resumen.margenPromedioActual,
        margenPromedioNuevo: data.resumen.margenPromedioNuevo,
        loteId: data.loteId,
      });

      toast.success("Previsualización lista");
    } catch (error) {
      toast.error("Error al calcular previsualización");
      console.error(error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleAplicarRecalculo = async () => {
    if (!previsualizacion) return;

    try {
      setLoadingAplicar(true);
      const res = await fetch("/api/pricing-repuestos/aplicar-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loteId: previsualizacion.loteId,
          descripcion: formRecalcular.descripcion,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success(`Cambio masivo aplicado: ${previsualizacion.total} repuestos actualizados`);
      setDialogRecalcular(false);
      setPrevisualizacion(null);
      setFormRecalcular({ categoria: "", descripcion: "Recálculo masivo según reglas de markup" });
      fetchLotes();
    } catch (error) {
      toast.error("Error al aplicar cambio masivo");
      console.error(error);
    } finally {
      setLoadingAplicar(false);
    }
  };

  const handleAplicarPorcentaje = async () => {
    try {
      setLoadingAplicar(true);
      const ajuste = parseFloat(formPorcentaje.ajustePorcentaje);

      const body: any = {
        ajustePorcentaje: ajuste,
        descripcion: formPorcentaje.descripcion || `Ajuste ${ajuste > 0 ? "+" : ""}${ajuste}%`,
      };

      if (formPorcentaje.categoria) {
        body.categoria = formPorcentaje.categoria;
      }

      const res = await fetch("/api/pricing-repuestos/aplicar-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();

      toast.success(`Ajuste aplicado: ${data.cantidadActualizados} repuestos modificados`);
      setDialogPorcentaje(false);
      setFormPorcentaje({ ajustePorcentaje: "10", categoria: "", descripcion: "" });
      fetchLotes();
    } catch (error) {
      toast.error("Error al aplicar ajuste porcentual");
      console.error(error);
    } finally {
      setLoadingAplicar(false);
    }
  };

  const handleRollback = async () => {
    if (!loteRollback) return;

    try {
      const res = await fetch("/api/pricing-repuestos/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loteId: loteRollback.id }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();

      toast.success(`Rollback completado: ${data.cantidadRevertidos} cambios revertidos`);
      setDialogRollback(false);
      setLoteRollback(null);
      fetchLotes();
    } catch (error) {
      toast.error("Error al realizar rollback");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Cambios Masivos de Precios
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Aplica ajustes porcentuales o recalcula precios según reglas de markup
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchLotes} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Recargar
              </Button>
              <Button onClick={() => setDialogPorcentaje(true)} variant="outline" size="sm">
                <Percent className="mr-2 h-4 w-4" />
                Ajuste %
              </Button>
              <Button onClick={() => setDialogRecalcular(true)} size="sm">
                <TrendingUp className="mr-2 h-4 w-4" />
                Recalcular Retail
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Margen Antes</TableHead>
                    <TableHead className="text-right">Margen Después</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotes.map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell className="text-sm">
                        {format(new Date(lote.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">{lote.descripcion || "Sin descripción"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{lote.cantidadItems}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {lote.margenPromedioAntes !== null
                          ? `${(lote.margenPromedioAntes * 100).toFixed(1)}%`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {lote.margenPromedioDespues !== null
                          ? `${(lote.margenPromedioDespues * 100).toFixed(1)}%`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {lote.revertido ? (
                          <Badge variant="destructive">Revertido</Badge>
                        ) : lote.aplicado ? (
                          <Badge variant="default">Aplicado</Badge>
                        ) : (
                          <Badge variant="secondary">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {lote.aplicado && !lote.revertido && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLoteRollback(lote);
                              setDialogRollback(true);
                            }}
                          >
                            <Undo2 className="mr-2 h-4 w-4" />
                            Rollback
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Ajuste Porcentual */}
      <Dialog open={dialogPorcentaje} onOpenChange={setDialogPorcentaje}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste Porcentual de Precios</DialogTitle>
            <DialogDescription>
              Aplica un incremento o decremento porcentual sobre los precios actuales
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ajuste-porcentaje">Ajuste Porcentual (%)</Label>
              <Input
                id="ajuste-porcentaje"
                type="number"
                step="0.1"
                value={formPorcentaje.ajustePorcentaje}
                onChange={(e) => setFormPorcentaje({ ...formPorcentaje, ajustePorcentaje: e.target.value })}
                placeholder="ej: 10 para +10%, -5 para -5%"
              />
              <p className="text-xs text-muted-foreground">
                Valores positivos aumentan el precio, negativos lo reducen
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="categoria-filtro">Filtrar por Categoría (opcional)</Label>
              <Input
                id="categoria-filtro"
                value={formPorcentaje.categoria}
                onChange={(e) => setFormPorcentaje({ ...formPorcentaje, categoria: e.target.value })}
                placeholder="ej: Filtros"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descripcion-ajuste">Descripción del Cambio</Label>
              <Input
                id="descripcion-ajuste"
                value={formPorcentaje.descripcion}
                onChange={(e) => setFormPorcentaje({ ...formPorcentaje, descripcion: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPorcentaje(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAplicarPorcentaje} disabled={loadingAplicar}>
              {loadingAplicar ? "Aplicando..." : "Aplicar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Recalcular Retail */}
      <Dialog open={dialogRecalcular} onOpenChange={setDialogRecalcular}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recalcular Precios Retail (B2C)</DialogTitle>
            <DialogDescription>
              Calcula precios según reglas de markup activas y muestra previsualización antes de aplicar
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="categoria-recalculo">Filtrar por Categoría (opcional)</Label>
              <Input
                id="categoria-recalculo"
                value={formRecalcular.categoria}
                onChange={(e) => setFormRecalcular({ ...formRecalcular, categoria: e.target.value })}
                placeholder="Dejar vacío para todos los repuestos"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descripcion-recalculo">Descripción del Cambio</Label>
              <Input
                id="descripcion-recalculo"
                value={formRecalcular.descripcion}
                onChange={(e) => setFormRecalcular({ ...formRecalcular, descripcion: e.target.value })}
              />
            </div>

            {!previsualizacion ? (
              <Button onClick={handlePrevisualizarRecalculo} disabled={loadingPreview} className="w-full">
                {loadingPreview ? "Calculando..." : "Calcular Previsualización"}
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3 bg-muted">
                <h3 className="font-medium">Resumen del Cambio</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total repuestos:</p>
                    <p className="text-lg font-medium">{previsualizacion.total}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Suben precio:</p>
                    <p className="text-lg font-medium text-green-600">{previsualizacion.suben}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bajan precio:</p>
                    <p className="text-lg font-medium text-red-600">{previsualizacion.bajan}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sin cambio:</p>
                    <p className="text-lg font-medium">{previsualizacion.sinCambio}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Margen actual:</p>
                    <p className="text-lg font-medium">
                      {(previsualizacion.margenPromedioActual * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Margen nuevo:</p>
                    <p className="text-lg font-medium text-cyan-600">
                      {(previsualizacion.margenPromedioNuevo * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <Button onClick={handleAplicarRecalculo} disabled={loadingAplicar} className="w-full">
                    {loadingAplicar ? "Aplicando..." : "Confirmar y Aplicar Cambios"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogRecalcular(false);
                setPrevisualizacion(null);
              }}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Rollback */}
      <Dialog open={dialogRollback} onOpenChange={setDialogRollback}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Rollback</DialogTitle>
            <DialogDescription>
              Esta acción revertirá todos los cambios de este lote. ¿Estás seguro?
            </DialogDescription>
          </DialogHeader>
          {loteRollback && (
            <div className="py-4 space-y-2">
              <p className="text-sm">
                <strong>Descripción:</strong> {loteRollback.descripcion || "Sin descripción"}
              </p>
              <p className="text-sm">
                <strong>Items afectados:</strong> {loteRollback.cantidadItems}
              </p>
              <p className="text-sm">
                <strong>Fecha:</strong>{" "}
                {format(new Date(loteRollback.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRollback(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRollback}>
              Confirmar Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
