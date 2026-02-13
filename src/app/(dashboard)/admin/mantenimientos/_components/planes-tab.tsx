"use client";

import { useEffect, useState } from "react";
import { FileText, Wrench, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type TareaPlan = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  orden: number;
  obligatoria: boolean;
  tiempoEstimado: number | null;
  repuestoSugerido: {
    id: string;
    nombre: string;
    codigo: string;
    precioCompra: number;
  } | null;
};

type PlanMantenimiento = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipoService: string;
  kmDesde: number;
  kmHasta: number | null;
  activo: boolean;
  tareas: TareaPlan[];
};

export function PlanesTab() {
  const [planes, setPlanes] = useState<PlanMantenimiento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlanes = async () => {
      try {
        const res = await fetch("/api/mantenimientos/planes");
        if (!res.ok) throw new Error("Error al cargar planes");
        const json = await res.json();
        setPlanes(json.data || []);
      } catch (error) {
        console.error("Error fetching planes:", error);
        toast.error("Error al cargar planes de mantenimiento");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlanes();
  }, []);

  const categoriaBadgeColor = (cat: string) => {
    const colors: Record<string, string> = {
      MOTOR: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      TRANSMISION: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      FRENOS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      SUSPENSION: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      ELECTRICO: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      NEUMATICOS: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      CARROCERIA: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
      LUBRICACION: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
      INSPECCION: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    };
    return colors[cat] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planes de Mantenimiento</CardTitle>
        <CardDescription>
          Planes predefinidos según kilometraje. Cada plan incluye tareas obligatorias y opcionales.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {planes.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            <p>No hay planes de mantenimiento configurados</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {planes.map((plan) => (
              <AccordionItem key={plan.id} value={plan.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex flex-col items-start gap-1">
                      <p className="font-semibold">{plan.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.kmDesde.toLocaleString()} - {plan.kmHasta ? plan.kmHasta.toLocaleString() : "∞"} km
                        {" • "}
                        {plan.tareas.length} tareas
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {plan.descripcion && (
                      <p className="text-sm text-muted-foreground">{plan.descripcion}</p>
                    )}

                    {/* Resumen por categoría */}
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(plan.tareas.map((t) => t.categoria))).map((cat) => {
                        const count = plan.tareas.filter((t) => t.categoria === cat).length;
                        return (
                          <Badge key={cat} variant="outline" className={categoriaBadgeColor(cat)}>
                            {cat} ({count})
                          </Badge>
                        );
                      })}
                    </div>

                    {/* Listado de tareas */}
                    <div className="space-y-2 rounded-lg border p-3">
                      {plan.tareas.map((tarea, idx) => (
                        <div
                          key={tarea.id}
                          className="flex items-start gap-3 border-b pb-2 last:border-b-0 last:pb-0"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {idx + 1}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{tarea.nombre}</p>
                              {tarea.obligatoria && (
                                <Badge variant="outline" className="text-xs">
                                  Obligatoria
                                </Badge>
                              )}
                            </div>
                            {tarea.descripcion && (
                              <p className="text-xs text-muted-foreground">{tarea.descripcion}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {tarea.tiempoEstimado && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {tarea.tiempoEstimado} min
                                </span>
                              )}
                              {tarea.repuestoSugerido && (
                                <span className="flex items-center gap-1">
                                  <Wrench className="h-3 w-3" />
                                  {tarea.repuestoSugerido.nombre} (${tarea.repuestoSugerido.precioCompra.toLocaleString()})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tiempo total estimado */}
                    <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
                      <span className="font-medium">Tiempo total estimado:</span>
                      <span className="flex items-center gap-1 font-bold">
                        <Clock className="h-4 w-4" />
                        {plan.tareas.reduce((sum, t) => sum + (t.tiempoEstimado || 0), 0)} minutos
                      </span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
