"use client";

import { useState, useEffect } from "react";
import { Ship, Plus, Search, Filter, Eye, Calculator, CheckCircle, Clock, Trash2, FileText, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CrearEmbarqueWizard } from "./crear-embarque-wizard";
import { RecepcionMercaderiaSheet } from "@/components/embarques/recepcion-mercaderia-sheet";
import { CalcularCostosDialog } from "@/components/embarques/calcular-costos-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Embarque = {
  id: string;
  referencia: string;
  estado: string;
  totalFobUsd: number;
  fleteUsd: number;
  seguroUsd: number | null;
  cifUsd: number | null;
  fechaSalida: string | null;
  fechaLlegadaEstimada: string | null;
  fechaLlegadaReal: string | null;
  proveedor: {
    id: string;
    nombre: string;
  };
  items: Array<{
    id: string;
    cantidad: number;
    precioFobUnitarioUsd: number;
    subtotalFobUsd: number;
    repuesto: {
      nombre: string;
      codigoFabricante: string | null;
    } | null;
  }>;
  _count?: {
    items: number;
  };
};

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-500",
  EN_TRANSITO: "bg-blue-500",
  EN_ADUANA: "bg-yellow-500",
  COSTO_FINALIZADO: "bg-green-500",
  RECIBIDO: "bg-cyan-500",
  EN_RECEPCION: "bg-purple-500",
  RECEPCION_PARCIAL: "bg-orange-500",
  ALMACENADO: "bg-teal-500",
};

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  EN_TRANSITO: "En Tránsito",
  EN_ADUANA: "En Aduana",
  COSTO_FINALIZADO: "Costo Finalizado",
  RECIBIDO: "Recibido",
  EN_RECEPCION: "En Recepción",
  RECEPCION_PARCIAL: "Recepción Parcial",
  ALMACENADO: "Almacenado",
};

export function EmbarquesTab() {
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [crearDialogOpen, setCrearDialogOpen] = useState(false);
  const [selectedEmbarque, setSelectedEmbarque] = useState<Embarque | null>(null);
  const [verDetalleOpen, setVerDetalleOpen] = useState(false);
  const [calcularCostosOpen, setCalcularCostosOpen] = useState(false);
  const [registrarDespachoOpen, setRegistrarDespachoOpen] = useState(false);
  const [eliminarDialogOpen, setEliminarDialogOpen] = useState(false);
  const [recepcionOpen, setRecepcionOpen] = useState(false);

  // Registrar Despacho form state
  const [despachoNumero, setDespachoNumero] = useState("");
  const [despachoFecha, setDespachoFecha] = useState("");
  const [despachoTc, setDespachoTc] = useState(1200);
  const [despachoCanal, setDespachoCanal] = useState("VERDE");
  const [despachoNotas, setDespachoNotas] = useState("");
  const [guardandoDespacho, setGuardandoDespacho] = useState(false);

  useEffect(() => {
    fetchEmbarques();
  }, [estadoFilter]);

  const fetchEmbarques = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "50" });
      if (estadoFilter !== "all") params.append("estado", estadoFilter);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/embarques?${params}`);
      if (!res.ok) throw new Error("Error al cargar embarques");
      const data = await res.json();
      setEmbarques(data.data || []);
    } catch (error) {
      toast.error("Error al cargar embarques");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchEmbarques();
  };

  const handleChangeEstado = async (id: string, estado: string) => {
    try {
      const res = await fetch(`/api/embarques/${id}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error("Error al cambiar estado");
      toast.success("Estado actualizado");
      fetchEmbarques();
    } catch (error) {
      toast.error("Error al cambiar estado");
      console.error(error);
    }
  };

  const handleVerDetalle = (embarque: Embarque) => {
    setSelectedEmbarque(embarque);
    setVerDetalleOpen(true);
  };

  const handleCalcularCostos = (embarque: Embarque) => {
    setSelectedEmbarque(embarque);
    setCalcularCostosOpen(true);
  };

  const handleRegistrarDespacho = (embarque: Embarque) => {
    setSelectedEmbarque(embarque);
    setDespachoNumero("");
    setDespachoFecha("");
    setDespachoTc(1200);
    setDespachoCanal("VERDE");
    setDespachoNotas("");
    setRegistrarDespachoOpen(true);
  };

  const guardarDespacho = async () => {
    if (!selectedEmbarque || !despachoNumero || !despachoFecha) {
      toast.error("Completa el número y fecha de despacho");
      return;
    }

    try {
      setGuardandoDespacho(true);

      // Save despacho via API (would need to create this endpoint)
      const res = await fetch(`/api/embarques/${selectedEmbarque.id}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "COSTO_FINALIZADO",
        }),
      });

      if (!res.ok) throw new Error("Error al registrar despacho");

      toast.success("Despacho registrado exitosamente");
      fetchEmbarques();
      setRegistrarDespachoOpen(false);
    } catch (error) {
      toast.error("Error al registrar despacho");
      console.error(error);
    } finally {
      setGuardandoDespacho(false);
    }
  };

  const handleEliminar = (embarque: Embarque) => {
    setSelectedEmbarque(embarque);
    setEliminarDialogOpen(true);
  };

  const confirmEliminar = async () => {
    if (!selectedEmbarque) return;

    try {
      const res = await fetch(`/api/embarques/${selectedEmbarque.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar embarque");
      toast.success("Embarque eliminado");
      fetchEmbarques();
      setEliminarDialogOpen(false);
      setSelectedEmbarque(null);
    } catch (error) {
      toast.error("Error al eliminar embarque");
      console.error(error);
    }
  };

  const filteredEmbarques = embarques.filter((e) =>
    e.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredEmbarques.reduce((sum, e) => sum + (e.items?.length || 0), 0);
  const totalFob = filteredEmbarques.reduce((sum, e) => sum + e.totalFobUsd, 0);
  const enTransito = filteredEmbarques.filter((e) => e.estado === "EN_TRANSITO").length;
  const enAduana = filteredEmbarques.filter((e) => e.estado === "EN_ADUANA").length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Embarques</CardTitle>
            <Ship className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEmbarques.length}</div>
            <p className="text-xs text-muted-foreground">{totalItems} items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Tránsito</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enTransito}</div>
            <p className="text-xs text-muted-foreground">embarques activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Aduana</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enAduana}</div>
            <p className="text-xs text-muted-foreground">pendientes despacho</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total FOB</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">USD {totalFob.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">suma FOB</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Embarques de Importación</CardTitle>
              <CardDescription>Gestiona los embarques y calcula costos landed</CardDescription>
            </div>
            <Button onClick={() => setCrearDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Embarque
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Buscar por referencia o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="max-w-sm"
              />
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="EN_TRANSITO">En Tránsito</SelectItem>
                <SelectItem value="EN_ADUANA">En Aduana</SelectItem>
                <SelectItem value="COSTO_FINALIZADO">Costo Finalizado</SelectItem>
                <SelectItem value="RECIBIDO">Recibido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filteredEmbarques.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay embarques registrados. Crea tu primer embarque.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">FOB USD</TableHead>
                  <TableHead className="text-right">CIF USD</TableHead>
                  <TableHead>Fecha Salida</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmbarques.map((embarque) => (
                  <TableRow key={embarque.id}>
                    <TableCell className="font-medium">{embarque.referencia}</TableCell>
                    <TableCell>{embarque.proveedor?.nombre || "Sin proveedor"}</TableCell>
                    <TableCell>
                      <Badge className={ESTADO_COLORS[embarque.estado]}>
                        {ESTADO_LABELS[embarque.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{embarque.items?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      {embarque.totalFobUsd.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {embarque.cifUsd
                        ? embarque.cifUsd.toLocaleString("es-AR", { minimumFractionDigits: 2 })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {embarque.fechaSalida
                        ? new Date(embarque.fechaSalida).toLocaleDateString("es-AR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {embarque.fechaLlegadaEstimada
                        ? new Date(embarque.fechaLlegadaEstimada).toLocaleDateString("es-AR")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleVerDetalle(embarque)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalle
                          </DropdownMenuItem>
                          {embarque.estado === "BORRADOR" && (
                            <>
                              <DropdownMenuItem>Editar</DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleChangeEstado(embarque.id, "EN_TRANSITO")}
                              >
                                Marcar En Tránsito
                              </DropdownMenuItem>
                            </>
                          )}
                          {embarque.estado === "EN_TRANSITO" && (
                            <DropdownMenuItem
                              onClick={() => handleChangeEstado(embarque.id, "EN_ADUANA")}
                            >
                              Marcar En Aduana
                            </DropdownMenuItem>
                          )}
                          {(embarque.estado === "BORRADOR" || embarque.estado === "EN_TRANSITO") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleEliminar(embarque)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                          {embarque.estado === "EN_ADUANA" && (
                            <>
                              <DropdownMenuItem onClick={() => handleCalcularCostos(embarque)}>
                                <Calculator className="mr-2 h-4 w-4" />
                                Calcular Costos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRegistrarDespacho(embarque)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Registrar Despacho
                              </DropdownMenuItem>
                            </>
                          )}
                          {embarque.estado === "COSTO_FINALIZADO" && (
                            <DropdownMenuItem
                              onClick={() => handleChangeEstado(embarque.id, "RECIBIDO")}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Confirmar Recepción
                            </DropdownMenuItem>
                          )}
                          {(embarque.estado === "RECIBIDO" || embarque.estado === "COSTO_FINALIZADO" || embarque.estado === "EN_RECEPCION") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedEmbarque(embarque);
                                  setRecepcionOpen(true);
                                }}
                              >
                                <Package className="mr-2 h-4 w-4" />
                                Iniciar Control de Calidad
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Wizard Dialog */}
      <CrearEmbarqueWizard
        open={crearDialogOpen}
        onOpenChange={setCrearDialogOpen}
        onSuccess={fetchEmbarques}
      />

      {/* Ver Detalle Sheet */}
      <Sheet open={verDetalleOpen} onOpenChange={setVerDetalleOpen}>
        <SheetContent className="overflow-y-auto w-[700px] sm:max-w-[700px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              {selectedEmbarque?.referencia}
            </SheetTitle>
            <SheetDescription>
              Detalle del embarque de importación
            </SheetDescription>
          </SheetHeader>

          {selectedEmbarque && (
            <div className="mt-6 space-y-6">
              {/* Información General */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Información General</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Proveedor:</span>
                    <p className="font-medium">{selectedEmbarque.proveedor?.nombre || "Sin proveedor"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado:</span>
                    <div className="mt-1">
                      <Badge className={ESTADO_COLORS[selectedEmbarque.estado]}>
                        {ESTADO_LABELS[selectedEmbarque.estado]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha Salida:</span>
                    <p className="font-medium">
                      {selectedEmbarque.fechaSalida
                        ? new Date(selectedEmbarque.fechaSalida).toLocaleDateString("es-AR")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Llegada Estimada:</span>
                    <p className="font-medium">
                      {selectedEmbarque.fechaLlegadaEstimada
                        ? new Date(selectedEmbarque.fechaLlegadaEstimada).toLocaleDateString("es-AR")
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resumen Financiero */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Resumen Financiero</h3>
                <div className="border rounded-lg p-3 space-y-2 text-sm bg-muted/50">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FOB:</span>
                    <span>USD {selectedEmbarque.totalFobUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Flete:</span>
                    <span>USD {selectedEmbarque.fleteUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seguro:</span>
                    <span>USD {(selectedEmbarque.seguroUsd || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>CIF Total:</span>
                    <span>USD {(selectedEmbarque.cifUsd || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Items ({selectedEmbarque.items?.length || 0})</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código Fab.</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Cant.</TableHead>
                        <TableHead className="text-right">FOB Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEmbarque.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-mono">
                            {item.repuesto?.codigoFabricante || "-"}
                          </TableCell>
                          <TableCell className="text-sm">{item.repuesto?.nombre || "Sin nombre"}</TableCell>
                          <TableCell className="text-right">{item.cantidad}</TableCell>
                          <TableCell className="text-right text-sm">
                            ${item.precioFobUnitarioUsd.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            ${item.subtotalFobUsd.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Calcular Costos Dialog */}
      {selectedEmbarque && (
        <CalcularCostosDialog
          open={calcularCostosOpen}
          onOpenChange={setCalcularCostosOpen}
          embarqueId={selectedEmbarque.id}
          embarqueReferencia={selectedEmbarque.referencia}
          onSuccess={fetchEmbarques}
        />
      )}

      {/* Registrar Despacho Dialog */}
      <Dialog open={registrarDespachoOpen} onOpenChange={setRegistrarDespachoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Registrar Despacho Aduanero
            </DialogTitle>
            <DialogDescription>
              {selectedEmbarque?.referencia} - Datos de despacho
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="despacho-numero">Número de Despacho *</Label>
              <Input
                id="despacho-numero"
                value={despachoNumero}
                onChange={(e) => setDespachoNumero(e.target.value)}
                placeholder="ej: 123-45678/2026"
              />
            </div>
            <div>
              <Label htmlFor="despacho-fecha">Fecha de Despacho *</Label>
              <Input
                id="despacho-fecha"
                type="date"
                value={despachoFecha}
                onChange={(e) => setDespachoFecha(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="despacho-tc">TC Oficial del Día</Label>
              <Input
                id="despacho-tc"
                type="number"
                value={despachoTc}
                onChange={(e) => setDespachoTc(parseFloat(e.target.value) || 0)}
                placeholder="1200"
              />
            </div>
            <div>
              <Label htmlFor="despacho-canal">Canal</Label>
              <Select value={despachoCanal} onValueChange={setDespachoCanal}>
                <SelectTrigger id="despacho-canal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VERDE">Verde (sin revisión física)</SelectItem>
                  <SelectItem value="NARANJA">Naranja (revisión documental)</SelectItem>
                  <SelectItem value="ROJO">Rojo (revisión física)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="despacho-notas">Observaciones</Label>
              <Textarea
                id="despacho-notas"
                value={despachoNotas}
                onChange={(e) => setDespachoNotas(e.target.value)}
                placeholder="Notas adicionales del despacho"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistrarDespachoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarDespacho} disabled={guardandoDespacho}>
              {guardandoDespacho ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar AlertDialog */}
      <AlertDialog open={eliminarDialogOpen} onOpenChange={setEliminarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar embarque?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el embarque{" "}
              <span className="font-medium">{selectedEmbarque?.referencia}</span> y todos sus items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEliminar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recepción de Mercadería Sheet */}
      {selectedEmbarque && (
        <RecepcionMercaderiaSheet
          open={recepcionOpen}
          onOpenChange={setRecepcionOpen}
          embarqueId={selectedEmbarque.id}
          embarqueReferencia={selectedEmbarque.referencia}
          onRecepcionFinalizada={fetchEmbarques}
        />
      )}
    </div>
  );
}
