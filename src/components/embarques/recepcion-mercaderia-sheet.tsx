"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  MapPin,
  Package,
  Search,
} from "lucide-react";

type EstadoRecepcionItem =
  | "PENDIENTE"
  | "RECIBIDO_OK"
  | "RECIBIDO_PARCIAL"
  | "RECHAZADO_TOTAL"
  | "FALTANTE";

interface RecepcionItem {
  id: string;
  cantidadEsperada: number;
  cantidadRecibida: number;
  cantidadRechazada: number;
  cantidadFaltante: number;
  estadoItem: EstadoRecepcionItem;
  ubicacionAsignada: string | null;
  motivoRechazo: string | null;
  observaciones: string | null;
  procesadoPor: string | null;
  fechaProcesado: string | null;
  repuesto: {
    id: string;
    nombre: string;
    codigo: string | null;
    codigoFabricante: string | null;
    ubicacion: string | null;
  };
  itemEmbarque: {
    cantidad: number;
    precioFobUnitarioUsd: number;
  };
}

interface Recepcion {
  id: string;
  fechaInicio: string;
  fechaFinalizada: string | null;
  totalItemsEsperados: number;
  totalItemsRecibidos: number;
  totalItemsRechazados: number;
  observaciones: string | null;
  items: RecepcionItem[];
  usuario: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface RecepcionMercaderiaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embarqueId: string;
  embarqueReferencia: string;
  onRecepcionFinalizada?: () => void;
}

export function RecepcionMercaderiaSheet({
  open,
  onOpenChange,
  embarqueId,
  embarqueReferencia,
  onRecepcionFinalizada,
}: RecepcionMercaderiaSheetProps) {
  const [recepcion, setRecepcion] = useState<Recepcion | null>(null);
  const [loading, setLoading] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Estado del formulario para procesar item
  const [itemSeleccionado, setItemSeleccionado] = useState<string | null>(null);
  const [cantidadRecibida, setCantidadRecibida] = useState(0);
  const [cantidadRechazada, setCantidadRechazada] = useState(0);
  const [cantidadFaltante, setCantidadFaltante] = useState(0);
  const [ubicacion, setUbicacion] = useState("");
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Cargar recepción al abrir
  useEffect(() => {
    if (open) {
      cargarRecepcion();
    }
  }, [open, embarqueId]);

  const cargarRecepcion = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/embarques/${embarqueId}/recepcion`);
      if (res.ok) {
        const data = await res.json();
        setRecepcion(data);
      } else if (res.status === 404) {
        // No existe recepción, está OK
        setRecepcion(null);
      } else {
        toast.error("Error al cargar recepción");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar recepción");
    } finally {
      setLoading(false);
    }
  };

  const iniciarRecepcion = async () => {
    setIniciando(true);
    try {
      const res = await fetch(`/api/embarques/${embarqueId}/recepcion`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setRecepcion(data);
        toast.success("Recepción iniciada correctamente");
      } else {
        const error = await res.json();
        toast.error(error.error || "Error al iniciar recepción");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al iniciar recepción");
    } finally {
      setIniciando(false);
    }
  };

  const seleccionarItem = (item: RecepcionItem) => {
    setItemSeleccionado(item.id);
    setCantidadRecibida(item.cantidadRecibida);
    setCantidadRechazada(item.cantidadRechazada);
    setCantidadFaltante(item.cantidadFaltante);
    setUbicacion(item.ubicacionAsignada || item.repuesto.ubicacion || "");
    setMotivoRechazo(item.motivoRechazo || "");
    setObservaciones(item.observaciones || "");
  };

  const procesarItem = async () => {
    if (!itemSeleccionado) return;

    const item = recepcion?.items.find((i) => i.id === itemSeleccionado);
    if (!item) return;

    // Validar cantidades
    const total = cantidadRecibida + cantidadRechazada + cantidadFaltante;
    if (total !== item.cantidadEsperada) {
      toast.error(
        `Las cantidades deben sumar ${item.cantidadEsperada}. Suma actual: ${total}`
      );
      return;
    }

    setProcesando(itemSeleccionado);
    try {
      const res = await fetch(
        `/api/embarques/${embarqueId}/recepcion/procesar-item`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemRecepcionId: itemSeleccionado,
            cantidadRecibida,
            cantidadRechazada,
            cantidadFaltante,
            ubicacionAsignada: ubicacion || null,
            motivoRechazo: motivoRechazo || null,
            observaciones: observaciones || null,
          }),
        }
      );

      if (res.ok) {
        toast.success(`Item procesado: ${item.repuesto.nombre}`);
        await cargarRecepcion();
        setItemSeleccionado(null);
        resetFormulario();
      } else {
        const error = await res.json();
        toast.error(error.error || "Error al procesar item");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar item");
    } finally {
      setProcesando(null);
    }
  };

  const finalizarRecepcion = async () => {
    if (!recepcion) return;

    const pendientes = recepcion.items.filter((i) => i.estadoItem === "PENDIENTE");
    if (pendientes.length > 0) {
      toast.error(`Faltan procesar ${pendientes.length} items`);
      return;
    }

    setFinalizando(true);
    try {
      const res = await fetch(
        `/api/embarques/${embarqueId}/recepcion/finalizar`,
        {
          method: "POST",
        }
      );

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Recepción finalizada. Stock actualizado: ${data.stockActualizado} unidades`
        );
        onRecepcionFinalizada?.();
        onOpenChange(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Error al finalizar recepción");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al finalizar recepción");
    } finally {
      setFinalizando(false);
    }
  };

  const resetFormulario = () => {
    setCantidadRecibida(0);
    setCantidadRechazada(0);
    setCantidadFaltante(0);
    setUbicacion("");
    setMotivoRechazo("");
    setObservaciones("");
  };

  const getEstadoBadge = (estado: EstadoRecepcionItem) => {
    switch (estado) {
      case "PENDIENTE":
        return <Badge variant="outline">Pendiente</Badge>;
      case "RECIBIDO_OK":
        return (
          <Badge className="bg-teal-500 hover:bg-teal-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Recibido OK
          </Badge>
        );
      case "RECIBIDO_PARCIAL":
        return (
          <Badge variant="secondary">
            <AlertCircle className="mr-1 h-3 w-3" />
            Parcial
          </Badge>
        );
      case "RECHAZADO_TOTAL":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rechazado
          </Badge>
        );
      case "FALTANTE":
        return <Badge variant="destructive">Faltante</Badge>;
    }
  };

  const progreso =
    recepcion && recepcion.totalItemsEsperados > 0
      ? (recepcion.totalItemsRecibidos / recepcion.totalItemsEsperados) * 100
      : 0;

  const itemActual = recepcion?.items.find((i) => i.id === itemSeleccionado);

  // Filtrar items por búsqueda
  const itemsFiltrados = recepcion?.items.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.repuesto.nombre.toLowerCase().includes(term) ||
      item.repuesto.codigo?.toLowerCase().includes(term) ||
      item.repuesto.codigoFabricante?.toLowerCase().includes(term)
    );
  });

  // Ordenar: pendientes primero, procesados al final
  const itemsOrdenados = itemsFiltrados?.sort((a, b) => {
    if (a.estadoItem === "PENDIENTE" && b.estadoItem !== "PENDIENTE") return -1;
    if (a.estadoItem !== "PENDIENTE" && b.estadoItem === "PENDIENTE") return 1;
    return 0;
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[900px] sm:max-w-[900px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-teal-500" />
              Recepción de Mercadería - {embarqueReferencia}
            </div>
          </SheetTitle>
          <SheetDescription>
            Control de calidad y asignación de ubicaciones para items del embarque
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        )}

        {!loading && !recepcion && (
          <div className="space-y-4 py-6">
            <p className="text-sm text-muted-foreground">
              No se ha iniciado la recepción de este embarque.
            </p>
            <Button
              onClick={iniciarRecepcion}
              disabled={iniciando}
              className="bg-teal-500 hover:bg-teal-600"
            >
              {iniciando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar Recepción
            </Button>
          </div>
        )}

        {!loading && recepcion && (
          <div className="space-y-6 py-6">
            {/* Progreso */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progreso</span>
                <span className="text-muted-foreground">
                  {recepcion.totalItemsRecibidos} / {recepcion.totalItemsEsperados}{" "}
                  items procesados
                </span>
              </div>
              <Progress value={progreso} className="h-2" />
            </div>

            <Separator />

            {/* Lista de items */}
            <div className="grid grid-cols-2 gap-6">
              {/* Columna izquierda: Lista de items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Items del Embarque</h3>
                  <Badge variant="secondary">
                    {itemsOrdenados?.length || 0} items
                  </Badge>
                </div>

                {/* Barra de búsqueda */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-2">
                    {itemsOrdenados?.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                          itemSeleccionado === item.id
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-950"
                            : "hover:bg-gray-50 dark:hover:bg-gray-900"
                        }`}
                        onClick={() => seleccionarItem(item)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {item.repuesto.nombre}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {item.repuesto.codigoFabricante || item.repuesto.codigo}
                            </p>
                          </div>
                          {getEstadoBadge(item.estadoItem)}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Esperado: {item.cantidadEsperada}</span>
                          {item.estadoItem !== "PENDIENTE" && (
                            <>
                              <span className="text-teal-600">
                                OK: {item.cantidadRecibida}
                              </span>
                              {item.cantidadRechazada > 0 && (
                                <span className="text-destructive">
                                  Rechazado: {item.cantidadRechazada}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Columna derecha: Formulario de procesamiento */}
              <div className="space-y-4">
                {itemActual ? (
                  <>
                    <div className="space-y-2">
                      <h3 className="font-medium">Procesar Item</h3>
                      <p className="text-sm text-muted-foreground">
                        {itemActual.repuesto.nombre}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-2">
                          <Label>Recibido OK</Label>
                          <Input
                            type="number"
                            min={0}
                            value={cantidadRecibida}
                            onChange={(e) =>
                              setCantidadRecibida(parseInt(e.target.value) || 0)
                            }
                            disabled={itemActual.estadoItem !== "PENDIENTE"}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rechazado</Label>
                          <Input
                            type="number"
                            min={0}
                            value={cantidadRechazada}
                            onChange={(e) =>
                              setCantidadRechazada(parseInt(e.target.value) || 0)
                            }
                            disabled={itemActual.estadoItem !== "PENDIENTE"}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Faltante</Label>
                          <Input
                            type="number"
                            min={0}
                            value={cantidadFaltante}
                            onChange={(e) =>
                              setCantidadFaltante(parseInt(e.target.value) || 0)
                            }
                            disabled={itemActual.estadoItem !== "PENDIENTE"}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Ubicación (E2-F3-P1)
                        </Label>
                        <Input
                          placeholder="Ej: E2-F3-P1"
                          value={ubicacion}
                          onChange={(e) => setUbicacion(e.target.value)}
                          disabled={itemActual.estadoItem !== "PENDIENTE"}
                        />
                      </div>

                      {cantidadRechazada > 0 && (
                        <div className="space-y-2">
                          <Label>Motivo de Rechazo</Label>
                          <Textarea
                            placeholder="Ej: Producto dañado en transporte"
                            value={motivoRechazo}
                            onChange={(e) => setMotivoRechazo(e.target.value)}
                            disabled={itemActual.estadoItem !== "PENDIENTE"}
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Observaciones</Label>
                        <Textarea
                          placeholder="Observaciones adicionales..."
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          disabled={itemActual.estadoItem !== "PENDIENTE"}
                        />
                      </div>

                      {itemActual.estadoItem === "PENDIENTE" && (
                        <Button
                          onClick={procesarItem}
                          disabled={!!procesando}
                          className="w-full bg-teal-500 hover:bg-teal-600"
                        >
                          {procesando && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Confirmar Procesamiento
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">Selecciona un item para procesar</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Botón finalizar */}
            {!recepcion.fechaFinalizada && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={finalizarRecepcion}
                  disabled={finalizando || progreso < 100}
                  className="bg-teal-500 hover:bg-teal-600"
                >
                  {finalizando && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Finalizar Recepción y Actualizar Stock
                </Button>
              </div>
            )}

            {recepcion.fechaFinalizada && (
              <div className="rounded-lg bg-teal-50 dark:bg-teal-950 p-4">
                <p className="text-sm font-medium text-teal-900 dark:text-teal-100">
                  ✅ Recepción finalizada el{" "}
                  {new Date(recepcion.fechaFinalizada).toLocaleString("es-AR")}
                </p>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
