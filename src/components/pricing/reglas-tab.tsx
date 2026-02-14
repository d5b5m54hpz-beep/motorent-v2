"use client";

import { useState, useEffect } from "react";
import { Settings, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type ReglaMarkup = {
  id: string;
  nombre: string;
  multiplicador: number;
  costoBandaDesde: number | null;
  costoBandaHasta: number | null;
  categoria: string | null;
  esOEM: boolean | null;
  redondeo: string | null;
  prioridad: number;
  activa: boolean;
};

type ReglaDescuento = {
  id: string;
  nombre: string;
  listaPrecioId: string | null;
  tipoCondicion: string;
  tipoDescuento: string;
  valorDescuento: number;
  cantidadMinima: number | null;
  antiguedadMinimaMeses: number | null;
  planAlquiler: string | null;
  grupoCliente: string | null;
  esAcumulable: boolean;
  prioridad: number;
  activa: boolean;
  listaPrecio?: { nombre: string };
};

export function ReglasTab() {
  const [reglasMarkup, setReglasMarkup] = useState<ReglaMarkup[]>([]);
  const [reglasDescuento, setReglasDescuento] = useState<ReglaDescuento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogMarkup, setDialogMarkup] = useState(false);
  const [dialogDescuento, setDialogDescuento] = useState(false);
  const [editingMarkup, setEditingMarkup] = useState<ReglaMarkup | null>(null);
  const [editingDescuento, setEditingDescuento] = useState<ReglaDescuento | null>(null);

  const [formMarkup, setFormMarkup] = useState({
    nombre: "",
    multiplicador: "2.0",
    costoBandaDesde: "",
    costoBandaHasta: "",
    categoria: "",
    esOEM: "null",
    redondeo: "NEAREST_50",
    prioridad: "100",
    activa: true,
  });

  const [formDescuento, setFormDescuento] = useState({
    nombre: "",
    listaPrecioId: "",
    tipoCondicion: "CANTIDAD",
    tipoDescuento: "PORCENTAJE",
    valorDescuento: "10",
    cantidadMinima: "",
    antiguedadMinimaMeses: "",
    planAlquiler: "",
    grupoCliente: "",
    esAcumulable: false,
    prioridad: "100",
    activa: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resMarkup, resDescuento] = await Promise.all([
        fetch("/api/pricing-repuestos/reglas-markup"),
        fetch("/api/pricing-repuestos/reglas-descuento"),
      ]);

      if (resMarkup.ok) {
        const dataMarkup = await resMarkup.json();
        setReglasMarkup(dataMarkup);
      }

      if (resDescuento.ok) {
        const dataDescuento = await resDescuento.json();
        setReglasDescuento(dataDescuento);
      }
    } catch (error) {
      toast.error("Error al cargar reglas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMarkup = async () => {
    try {
      const payload = {
        nombre: formMarkup.nombre,
        multiplicador: parseFloat(formMarkup.multiplicador),
        costoBandaDesde: formMarkup.costoBandaDesde ? parseFloat(formMarkup.costoBandaDesde) : null,
        costoBandaHasta: formMarkup.costoBandaHasta ? parseFloat(formMarkup.costoBandaHasta) : null,
        categoria: formMarkup.categoria || null,
        esOEM: formMarkup.esOEM === "true" ? true : formMarkup.esOEM === "false" ? false : null,
        redondeo: formMarkup.redondeo || null,
        prioridad: parseInt(formMarkup.prioridad),
        activa: formMarkup.activa,
      };

      const res = await fetch("/api/pricing-repuestos/reglas-markup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      toast.success("Regla de markup creada");
      setDialogMarkup(false);
      fetchData();
      resetFormMarkup();
    } catch (error) {
      toast.error("Error al crear regla");
      console.error(error);
    }
  };

  const handleCreateDescuento = async () => {
    try {
      const payload = {
        nombre: formDescuento.nombre,
        listaPrecioId: formDescuento.listaPrecioId || null,
        tipoCondicion: formDescuento.tipoCondicion,
        tipoDescuento: formDescuento.tipoDescuento,
        valorDescuento: parseFloat(formDescuento.valorDescuento),
        cantidadMinima: formDescuento.cantidadMinima ? parseInt(formDescuento.cantidadMinima) : null,
        antiguedadMinimaMeses: formDescuento.antiguedadMinimaMeses ? parseInt(formDescuento.antiguedadMinimaMeses) : null,
        planAlquiler: formDescuento.planAlquiler || null,
        grupoCliente: formDescuento.grupoCliente || null,
        esAcumulable: formDescuento.esAcumulable,
        prioridad: parseInt(formDescuento.prioridad),
        activa: formDescuento.activa,
      };

      const res = await fetch("/api/pricing-repuestos/reglas-descuento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      toast.success("Regla de descuento creada");
      setDialogDescuento(false);
      fetchData();
      resetFormDescuento();
    } catch (error) {
      toast.error("Error al crear regla");
      console.error(error);
    }
  };

  const resetFormMarkup = () => {
    setFormMarkup({
      nombre: "",
      multiplicador: "2.0",
      costoBandaDesde: "",
      costoBandaHasta: "",
      categoria: "",
      esOEM: "null",
      redondeo: "NEAREST_50",
      prioridad: "100",
      activa: true,
    });
    setEditingMarkup(null);
  };

  const resetFormDescuento = () => {
    setFormDescuento({
      nombre: "",
      listaPrecioId: "",
      tipoCondicion: "CANTIDAD",
      tipoDescuento: "PORCENTAJE",
      valorDescuento: "10",
      cantidadMinima: "",
      antiguedadMinimaMeses: "",
      planAlquiler: "",
      grupoCliente: "",
      esAcumulable: false,
      prioridad: "100",
      activa: true,
    });
    setEditingDescuento(null);
  };

  return (
    <div className="space-y-6">
      {/* Reglas de Markup */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Reglas de Markup (Márgenes)
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Define multiplicadores por banda de costo, categoría o tipo OEM
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Recargar
              </Button>
              <Button onClick={() => setDialogMarkup(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Regla
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Multiplicador</TableHead>
                    <TableHead>Banda Costo</TableHead>
                    <TableHead>Filtros</TableHead>
                    <TableHead>Redondeo</TableHead>
                    <TableHead className="text-center">Prioridad</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reglasMarkup.map((regla) => (
                    <TableRow key={regla.id}>
                      <TableCell className="font-medium">{regla.nombre}</TableCell>
                      <TableCell className="text-right font-mono">
                        {regla.multiplicador.toFixed(2)}x
                      </TableCell>
                      <TableCell className="text-sm">
                        {regla.costoBandaDesde !== null || regla.costoBandaHasta !== null ? (
                          <span>
                            ${regla.costoBandaDesde?.toLocaleString("es-AR") || "0"} - $
                            {regla.costoBandaHasta?.toLocaleString("es-AR") || "∞"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Todos</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {regla.categoria && (
                            <Badge variant="outline" className="text-xs">
                              {regla.categoria}
                            </Badge>
                          )}
                          {regla.esOEM !== null && (
                            <Badge variant="outline" className="text-xs">
                              {regla.esOEM ? "OEM" : "Genérico"}
                            </Badge>
                          )}
                          {!regla.categoria && regla.esOEM === null && (
                            <span className="text-xs text-muted-foreground">Sin filtros</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {regla.redondeo || <span className="text-muted-foreground">Sin redondeo</span>}
                      </TableCell>
                      <TableCell className="text-center">{regla.prioridad}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={regla.activa ? "default" : "secondary"}>
                          {regla.activa ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reglas de Descuento */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Reglas de Descuento
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Descuentos por cantidad, antigüedad, plan o grupo de cliente
              </p>
            </div>
            <Button onClick={() => setDialogDescuento(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Regla
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Condición</TableHead>
                    <TableHead className="text-right">Descuento</TableHead>
                    <TableHead>Lista</TableHead>
                    <TableHead className="text-center">Acumulable</TableHead>
                    <TableHead className="text-center">Prioridad</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reglasDescuento.map((regla) => (
                    <TableRow key={regla.id}>
                      <TableCell className="font-medium">{regla.nombre}</TableCell>
                      <TableCell className="text-sm">
                        {regla.tipoCondicion === "CANTIDAD" && regla.cantidadMinima && (
                          <span>≥ {regla.cantidadMinima} unidades</span>
                        )}
                        {regla.tipoCondicion === "ANTIGUEDAD" && regla.antiguedadMinimaMeses && (
                          <span>≥ {regla.antiguedadMinimaMeses} meses</span>
                        )}
                        {regla.tipoCondicion === "PLAN" && regla.planAlquiler && (
                          <span>Plan {regla.planAlquiler}</span>
                        )}
                        {regla.tipoCondicion === "GRUPO_CLIENTE" && regla.grupoCliente && (
                          <span>Grupo {regla.grupoCliente}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {regla.tipoDescuento === "PORCENTAJE"
                          ? `${regla.valorDescuento}%`
                          : `$${regla.valorDescuento.toLocaleString("es-AR")}`}
                      </TableCell>
                      <TableCell className="text-sm">
                        {regla.listaPrecio?.nombre || (
                          <span className="text-muted-foreground">Todas</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={regla.esAcumulable ? "default" : "secondary"}>
                          {regla.esAcumulable ? "Sí" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{regla.prioridad}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={regla.activa ? "default" : "secondary"}>
                          {regla.activa ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Markup */}
      <Dialog open={dialogMarkup} onOpenChange={(open) => { setDialogMarkup(open); if (!open) resetFormMarkup(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Regla de Markup</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre-markup">Nombre</Label>
              <Input
                id="nombre-markup"
                value={formMarkup.nombre}
                onChange={(e) => setFormMarkup({ ...formMarkup, nombre: e.target.value })}
                placeholder="ej: Markup Premium Filtros 40%"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="multiplicador">Multiplicador</Label>
                <Input
                  id="multiplicador"
                  type="number"
                  step="0.1"
                  value={formMarkup.multiplicador}
                  onChange={(e) => setFormMarkup({ ...formMarkup, multiplicador: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prioridad-markup">Prioridad</Label>
                <Input
                  id="prioridad-markup"
                  type="number"
                  value={formMarkup.prioridad}
                  onChange={(e) => setFormMarkup({ ...formMarkup, prioridad: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="banda-desde">Banda Costo Desde ($)</Label>
                <Input
                  id="banda-desde"
                  type="number"
                  value={formMarkup.costoBandaDesde}
                  onChange={(e) => setFormMarkup({ ...formMarkup, costoBandaDesde: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="banda-hasta">Banda Costo Hasta ($)</Label>
                <Input
                  id="banda-hasta"
                  type="number"
                  value={formMarkup.costoBandaHasta}
                  onChange={(e) => setFormMarkup({ ...formMarkup, costoBandaHasta: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="categoria-markup">Categoría (filtro)</Label>
                <Input
                  id="categoria-markup"
                  value={formMarkup.categoria}
                  onChange={(e) => setFormMarkup({ ...formMarkup, categoria: e.target.value })}
                  placeholder="ej: Filtros"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="esOEM">Tipo OEM</Label>
                <Select
                  value={formMarkup.esOEM}
                  onValueChange={(val) => setFormMarkup({ ...formMarkup, esOEM: val })}
                >
                  <SelectTrigger id="esOEM">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Todos</SelectItem>
                    <SelectItem value="true">Solo OEM</SelectItem>
                    <SelectItem value="false">Solo Genéricos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="redondeo">Redondeo</Label>
              <Select
                value={formMarkup.redondeo || undefined}
                onValueChange={(val) => setFormMarkup({ ...formMarkup, redondeo: val || "" })}
              >
                <SelectTrigger id="redondeo">
                  <SelectValue placeholder="Sin redondeo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEAREST_50">Múltiplo de $50</SelectItem>
                  <SelectItem value="NEAREST_99">Terminar en .99</SelectItem>
                  <SelectItem value="NEAREST_10">Múltiplo de $10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="activa-markup"
                checked={formMarkup.activa}
                onCheckedChange={(checked) => setFormMarkup({ ...formMarkup, activa: checked })}
              />
              <Label htmlFor="activa-markup">Regla activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMarkup(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateMarkup}>Crear Regla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Descuento */}
      <Dialog open={dialogDescuento} onOpenChange={(open) => { setDialogDescuento(open); if (!open) resetFormDescuento(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Regla de Descuento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre-descuento">Nombre</Label>
              <Input
                id="nombre-descuento"
                value={formDescuento.nombre}
                onChange={(e) => setFormDescuento({ ...formDescuento, nombre: e.target.value })}
                placeholder="ej: Descuento por cantidad +10 unidades"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tipoCondicion">Tipo de Condición</Label>
                <Select
                  value={formDescuento.tipoCondicion}
                  onValueChange={(val) => setFormDescuento({ ...formDescuento, tipoCondicion: val })}
                >
                  <SelectTrigger id="tipoCondicion">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CANTIDAD">Cantidad</SelectItem>
                    <SelectItem value="ANTIGUEDAD">Antigüedad</SelectItem>
                    <SelectItem value="PLAN">Plan Alquiler</SelectItem>
                    <SelectItem value="GRUPO_CLIENTE">Grupo Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipoDescuento">Tipo de Descuento</Label>
                <Select
                  value={formDescuento.tipoDescuento}
                  onValueChange={(val) => setFormDescuento({ ...formDescuento, tipoDescuento: val })}
                >
                  <SelectTrigger id="tipoDescuento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PORCENTAJE">Porcentaje</SelectItem>
                    <SelectItem value="MONTO_FIJO">Monto Fijo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="valorDescuento">
                  {formDescuento.tipoDescuento === "PORCENTAJE" ? "% Descuento" : "Monto Fijo ($)"}
                </Label>
                <Input
                  id="valorDescuento"
                  type="number"
                  step="0.1"
                  value={formDescuento.valorDescuento}
                  onChange={(e) => setFormDescuento({ ...formDescuento, valorDescuento: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prioridad-descuento">Prioridad</Label>
                <Input
                  id="prioridad-descuento"
                  type="number"
                  value={formDescuento.prioridad}
                  onChange={(e) => setFormDescuento({ ...formDescuento, prioridad: e.target.value })}
                />
              </div>
            </div>
            {formDescuento.tipoCondicion === "CANTIDAD" && (
              <div className="grid gap-2">
                <Label htmlFor="cantidadMinima">Cantidad Mínima</Label>
                <Input
                  id="cantidadMinima"
                  type="number"
                  value={formDescuento.cantidadMinima}
                  onChange={(e) => setFormDescuento({ ...formDescuento, cantidadMinima: e.target.value })}
                />
              </div>
            )}
            {formDescuento.tipoCondicion === "ANTIGUEDAD" && (
              <div className="grid gap-2">
                <Label htmlFor="antiguedadMinima">Antigüedad Mínima (meses)</Label>
                <Input
                  id="antiguedadMinima"
                  type="number"
                  value={formDescuento.antiguedadMinimaMeses}
                  onChange={(e) => setFormDescuento({ ...formDescuento, antiguedadMinimaMeses: e.target.value })}
                />
              </div>
            )}
            {formDescuento.tipoCondicion === "PLAN" && (
              <div className="grid gap-2">
                <Label htmlFor="planAlquiler">Plan Alquiler</Label>
                <Input
                  id="planAlquiler"
                  value={formDescuento.planAlquiler}
                  onChange={(e) => setFormDescuento({ ...formDescuento, planAlquiler: e.target.value })}
                  placeholder="ej: PREMIUM, VIP"
                />
              </div>
            )}
            {formDescuento.tipoCondicion === "GRUPO_CLIENTE" && (
              <div className="grid gap-2">
                <Label htmlFor="grupoCliente">Grupo Cliente</Label>
                <Input
                  id="grupoCliente"
                  value={formDescuento.grupoCliente}
                  onChange={(e) => setFormDescuento({ ...formDescuento, grupoCliente: e.target.value })}
                  placeholder="ej: CORPORATIVO, GOBIERNO"
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="esAcumulable"
                checked={formDescuento.esAcumulable}
                onCheckedChange={(checked) => setFormDescuento({ ...formDescuento, esAcumulable: checked })}
              />
              <Label htmlFor="esAcumulable">Acumulable con otros descuentos</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="activa-descuento"
                checked={formDescuento.activa}
                onCheckedChange={(checked) => setFormDescuento({ ...formDescuento, activa: checked })}
              />
              <Label htmlFor="activa-descuento">Regla activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDescuento(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateDescuento}>Crear Regla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
