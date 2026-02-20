"use client";

import { useEffect, useState } from "react";
import { X, Bike, User, Wrench, MapPin, CheckCircle2, Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { ItemsOT } from "./items-ot";

type OrdenTrabajoDetail = {
  id: string;
  numero: string;
  tipoOT: string;
  tipoService: string;
  estado: string;
  kmAlIngreso: number;
  kmAlEgreso: number | null;
  fechaIngreso: string;
  fechaEgreso: string | null;
  costoRepuestos: number;
  costoManoObra: number;
  costoOtros: number;
  costoTotal: number;
  costoACargoDel: string;
  observacionesRecepcion: string | null;
  observacionesMecanico: string | null;
  problemaDetectado: boolean;
  descripcionProblema: string | null;
  requiereReparacion: boolean;
  moto: {
    id: string;
    patente: string;
    marca: string;
    modelo: string;
  };
  rider: {
    id: string;
    nombre: string;
    email: string;
  } | null;
  taller: {
    id: string;
    nombre: string;
  } | null;
  mecanico: {
    id: string;
    nombre: string;
  } | null;
  tareas: Array<{
    id: string;
    nombre: string;
    completada: boolean;
    orden: number;
  }>;
  repuestosUsados: Array<{
    cantidad: number;
    repuesto: {
      nombre: string;
      codigo: string;
    };
  }>;
  historial: Array<{
    id: string;
    accion: string;
    estadoAnterior: string | null;
    estadoNuevo: string;
    createdAt: string;
  }>;
};

const ESTADO_BADGE: Record<string, string> = {
  SOLICITADA: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  APROBADA: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  PROGRAMADA: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  EN_ESPERA_REPUESTOS: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  EN_EJECUCION: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  EN_REVISION: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  COMPLETADA: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  CANCELADA: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const ESTADOS_CERRADOS = ["COMPLETADA", "CANCELADA"];

type Props = {
  ordenId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: () => void;
};

export function OrdenDetailSheet({ ordenId, open, onOpenChange, onClosed }: Props) {
  const [orden, setOrden] = useState<OrdenTrabajoDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [kmEgreso, setKmEgreso] = useState("");
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (ordenId && open) {
      fetchOrden();
    }
  }, [ordenId, open]);

  const fetchOrden = async () => {
    if (!ordenId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/mantenimientos/ordenes/${ordenId}`);
      if (!res.ok) throw new Error("Error al cargar orden");
      const json = await res.json();
      setOrden(json.data);
      setKmEgreso(json.data.kmAlEgreso?.toString() ?? "");
    } catch (error) {
      console.error("Error fetching orden:", error);
      toast.error("Error al cargar detalle de orden");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCerrarOT = async () => {
    if (!ordenId) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/mantenimientos/${ordenId}/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kmAlEgreso: kmEgreso ? parseFloat(kmEgreso) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al cerrar OT");
      }
      toast.success("OT cerrada — stock descontado — moto actualizada");
      onClosed?.();
      fetchOrden();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al cerrar OT");
    } finally {
      setClosing(false);
    }
  };

  const tareasCompletadas = orden?.tareas.filter((t) => t.completada).length || 0;
  const totalTareas = orden?.tareas.length || 0;
  const progressPercent = totalTareas > 0 ? (tareasCompletadas / totalTareas) * 100 : 0;

  const otCerrada = orden ? ESTADOS_CERRADOS.includes(orden.estado) : false;
  const puedesCerrar = orden
    ? !ESTADOS_CERRADOS.includes(orden.estado)
    : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {isLoading ? <Skeleton className="h-6 w-48" /> : orden?.numero}
          </SheetTitle>
          <SheetDescription>
            {isLoading ? (
              <Skeleton className="h-4 w-64" />
            ) : (
              `Orden de trabajo — ${orden?.tipoOT} / ${orden?.tipoService ?? "—"}`
            )}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : orden ? (
          <div className="space-y-6 pt-6">
            {/* Estado y costos */}
            <div className="grid gap-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estado</span>
                <Badge
                  variant="outline"
                  className={ESTADO_BADGE[orden.estado] ?? "bg-gray-100 text-gray-800"}
                >
                  {orden.estado.replace(/_/g, " ")}
                </Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Costo Total</span>
                  <p className="text-lg font-bold">
                    ${Number(orden.costoTotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">A cargo de</span>
                  <p className="font-medium">{orden.costoACargoDel}</p>
                </div>
              </div>
            </div>

            {/* Info básica */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Bike className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {orden.moto.marca} {orden.moto.modelo}
                </span>
                <Badge variant="outline">{orden.moto.patente}</Badge>
              </div>
              {orden.rider && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{orden.rider.nombre}</span>
                </div>
              )}
              {orden.taller && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{orden.taller.nombre}</span>
                </div>
              )}
              {orden.mecanico && (
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span>{orden.mecanico.nombre}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Kilometraje */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">KM Ingreso</span>
                <p className="text-lg font-semibold">
                  {orden.kmAlIngreso.toLocaleString("es-AR")}
                </p>
              </div>
              {orden.kmAlEgreso && (
                <div>
                  <span className="text-muted-foreground">KM Egreso</span>
                  <p className="text-lg font-semibold">
                    {orden.kmAlEgreso.toLocaleString("es-AR")}
                  </p>
                </div>
              )}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Fecha Ingreso</span>
                <p className="font-medium">
                  {new Date(orden.fechaIngreso).toLocaleDateString("es-AR")}
                </p>
              </div>
              {orden.fechaEgreso && (
                <div>
                  <span className="text-muted-foreground">Fecha Egreso</span>
                  <p className="font-medium">
                    {new Date(orden.fechaEgreso).toLocaleDateString("es-AR")}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Progreso de tareas */}
            {totalTareas > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Tareas completadas</span>
                  <span className="text-muted-foreground">
                    {tareasCompletadas} / {totalTareas}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* ── Ítems de costo ── */}
            <Separator />
            <ItemsOT otId={orden.id} otCerrada={otCerrada} />

            {/* ── Botón Cerrar OT ── */}
            {puedesCerrar && (
              <>
                <Separator />
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30 space-y-3">
                  <p className="text-sm font-medium">Cerrar Orden de Trabajo</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">KM al egreso (opcional)</Label>
                    <Input
                      className="h-9 max-w-[160px]"
                      type="number"
                      placeholder={orden.kmAlIngreso.toString()}
                      value={kmEgreso}
                      onChange={(e) => setKmEgreso(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Al cerrar: se descontará el stock de repuestos usados y la moto volverá a{" "}
                    <strong>Disponible</strong> o <strong>Alquilada</strong> según contratos activos.
                  </p>
                  <Button
                    onClick={handleCerrarOT}
                    disabled={closing}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {closing ? "Cerrando..." : "Cerrar OT"}
                  </Button>
                </div>
              </>
            )}

            {/* Accordion sections */}
            <Accordion type="single" collapsible className="w-full">
              {/* Tareas */}
              {orden.tareas.length > 0 && (
                <AccordionItem value="tareas">
                  <AccordionTrigger>Tareas ({orden.tareas.length})</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {orden.tareas.map((tarea) => (
                        <div key={tarea.id} className="flex items-center gap-2 text-sm">
                          <CheckCircle2
                            className={`h-4 w-4 ${
                              tarea.completada ? "text-teal-600" : "text-gray-300"
                            }`}
                          />
                          <span
                            className={
                              tarea.completada ? "line-through text-muted-foreground" : ""
                            }
                          >
                            {tarea.nombre}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Repuestos (modelo viejo RepuestoOrdenTrabajo) */}
              {orden.repuestosUsados.length > 0 && (
                <AccordionItem value="repuestos">
                  <AccordionTrigger>
                    Repuestos planificados ({orden.repuestosUsados.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      {orden.repuestosUsados.map((ru, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            {ru.repuesto.nombre} ({ru.repuesto.codigo})
                          </span>
                          <span className="font-medium">x{ru.cantidad}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Observaciones */}
              {(orden.observacionesRecepcion || orden.observacionesMecanico) && (
                <AccordionItem value="observaciones">
                  <AccordionTrigger>Observaciones</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 text-sm">
                      {orden.observacionesRecepcion && (
                        <div>
                          <p className="font-medium">Recepción:</p>
                          <p className="text-muted-foreground">
                            {orden.observacionesRecepcion}
                          </p>
                        </div>
                      )}
                      {orden.observacionesMecanico && (
                        <div>
                          <p className="font-medium">Mecánico:</p>
                          <p className="text-muted-foreground">
                            {orden.observacionesMecanico}
                          </p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Problemas detectados */}
              {orden.problemaDetectado && (
                <AccordionItem value="problemas">
                  <AccordionTrigger className="text-orange-600">
                    Problema detectado
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      <p>{orden.descripcionProblema}</p>
                      {orden.requiereReparacion && (
                        <Badge variant="outline" className="bg-red-100 text-red-800">
                          Requiere reparación adicional
                        </Badge>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Historial */}
              {orden.historial.length > 0 && (
                <AccordionItem value="historial">
                  <AccordionTrigger>
                    Historial ({orden.historial.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      {orden.historial.map((h) => (
                        <div key={h.id} className="flex items-start gap-2 border-l-2 pl-3">
                          <Clock className="mt-0.5 h-3 w-3 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{h.accion}</p>
                            <p className="text-xs text-muted-foreground">
                              {h.estadoAnterior && `${h.estadoAnterior} → `}
                              {h.estadoNuevo}
                              {" • "}
                              {new Date(h.createdAt).toLocaleString("es-AR")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {/* Desglose de costos (campos legacy) */}
            <div className="rounded-lg border p-4">
              <p className="mb-3 font-medium">Desglose de costos (campos legacy)</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repuestos</span>
                  <span className="font-medium">
                    ${Number(orden.costoRepuestos).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mano de obra</span>
                  <span className="font-medium">
                    ${Number(orden.costoManoObra).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Otros</span>
                  <span className="font-medium">
                    ${Number(orden.costoOtros).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-base">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">
                    ${Number(orden.costoTotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">No se encontró la orden</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
