"use client";

import { useEffect, useState } from "react";
import { X, Bike, User, Wrench, MapPin, Calendar, DollarSign, CheckCircle2, Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";

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

type Props = {
  ordenId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OrdenDetailSheet({ ordenId, open, onOpenChange }: Props) {
  const [orden, setOrden] = useState<OrdenTrabajoDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    } catch (error) {
      console.error("Error fetching orden:", error);
      toast.error("Error al cargar detalle de orden");
    } finally {
      setIsLoading(false);
    }
  };

  const estadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      PENDIENTE: "bg-gray-100 text-gray-800",
      EN_EJECUCION: "bg-yellow-100 text-yellow-800",
      COMPLETADA: "bg-teal-100 text-teal-800",
      CANCELADA: "bg-red-100 text-red-800",
    };
    return colors[estado] || "bg-gray-100 text-gray-800";
  };

  const tareasCompletadas = orden?.tareas.filter((t) => t.completada).length || 0;
  const totalTareas = orden?.tareas.length || 0;
  const progressPercent = totalTareas > 0 ? (tareasCompletadas / totalTareas) * 100 : 0;

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
              `Orden de trabajo - ${orden?.tipoOT} / ${orden?.tipoService}`
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
                <Badge variant="outline" className={estadoBadge(orden.estado)}>
                  {orden.estado.replace("_", " ")}
                </Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Costo Total</span>
                  <p className="text-lg font-bold">${orden.costoTotal.toLocaleString()}</p>
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
                <p className="text-lg font-semibold">{orden.kmAlIngreso.toLocaleString()}</p>
              </div>
              {orden.kmAlEgreso && (
                <div>
                  <span className="text-muted-foreground">KM Egreso</span>
                  <p className="text-lg font-semibold">{orden.kmAlEgreso.toLocaleString()}</p>
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
                          <span className={tarea.completada ? "line-through text-muted-foreground" : ""}>
                            {tarea.nombre}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Repuestos */}
              {orden.repuestosUsados.length > 0 && (
                <AccordionItem value="repuestos">
                  <AccordionTrigger>Repuestos ({orden.repuestosUsados.length})</AccordionTrigger>
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
                          <p className="text-muted-foreground">{orden.observacionesRecepcion}</p>
                        </div>
                      )}
                      {orden.observacionesMecanico && (
                        <div>
                          <p className="font-medium">Mecánico:</p>
                          <p className="text-muted-foreground">{orden.observacionesMecanico}</p>
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
                  <AccordionTrigger>Historial ({orden.historial.length})</AccordionTrigger>
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

            {/* Desglose de costos */}
            <div className="rounded-lg border p-4">
              <p className="mb-3 font-medium">Desglose de costos</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repuestos</span>
                  <span className="font-medium">${orden.costoRepuestos.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mano de obra</span>
                  <span className="font-medium">${orden.costoManoObra.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Otros</span>
                  <span className="font-medium">${orden.costoOtros.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">${orden.costoTotal.toLocaleString()}</span>
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
