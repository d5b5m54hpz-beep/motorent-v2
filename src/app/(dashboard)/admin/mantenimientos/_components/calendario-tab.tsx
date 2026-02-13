"use client";

import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CitaMantenimiento = {
  id: string;
  codigoQR: string;
  fechaProgramada: string;
  estado: string;
  moto: {
    id: string;
    patente: string;
    marca: string;
    modelo: string;
  };
  rider: {
    id: string;
    nombre: string;
  };
};

export function CalendarioTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [citas, setCitas] = useState<CitaMantenimiento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state for new cita
  const [motoId, setMotoId] = useState("");
  const [riderId, setRiderId] = useState("");
  const [tallerId, setTallerId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCitas = async () => {
    setIsLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const params = new URLSearchParams({
        desde: startOfMonth.toISOString(),
        hasta: endOfMonth.toISOString(),
      });

      const res = await fetch(`/api/mantenimientos/citas?${params}`);
      if (!res.ok) throw new Error("Error al cargar citas");

      const json = await res.json();
      setCitas(json.data || []);
    } catch (error) {
      console.error("Error fetching citas:", error);
      toast.error("Error al cargar citas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCitas();
  }, [currentDate]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getCitasForDate = (date: Date) => {
    return citas.filter((cita) => {
      const citaDate = new Date(cita.fechaProgramada);
      return (
        citaDate.getDate() === date.getDate() &&
        citaDate.getMonth() === date.getMonth() &&
        citaDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleCreateCita = async () => {
    if (!motoId || !riderId || !tallerId || !selectedDate) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/mantenimientos/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motoId,
          riderId,
          fechaProgramada: selectedDate.toISOString(),
          lugarId: tallerId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al crear cita");

      toast.success("Cita creada exitosamente");
      setDialogOpen(false);
      setMotoId("");
      setRiderId("");
      setTallerId("");
      fetchCitas();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al crear cita";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const estadoBadgeColor = (estado: string) => {
    const colors: Record<string, string> = {
      PROGRAMADA: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      NOTIFICADA: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      CONFIRMADA: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
      EN_PROCESO: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      COMPLETADA: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      NO_ASISTIO: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      CANCELADA: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      REPROGRAMADA: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    };
    return colors[estado] || "";
  };

  const monthYear = currentDate.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  const days = getDaysInMonth();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Calendario de Citas</CardTitle>
              <CardDescription>
                Vista mensual de citas de mantenimiento programadas
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setSelectedDate(new Date());
                setDialogOpen(true);
              }}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cita
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Month navigation */}
          <div className="mb-4 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold capitalize">{monthYear}</h3>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {days.map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} className="min-h-[80px] rounded-lg border bg-muted/30" />;
                }

                const citasInDay = getCitasForDate(date);
                const isToday =
                  date.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={date.toISOString()}
                    className={`min-h-[80px] cursor-pointer rounded-lg border p-2 transition-colors hover:bg-muted/50 ${
                      isToday ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      setSelectedDate(date);
                      setDialogOpen(true);
                    }}
                  >
                    <div className="mb-1 text-sm font-medium">
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {citasInDay.slice(0, 2).map((cita) => (
                        <div
                          key={cita.id}
                          className="truncate rounded bg-primary/10 px-1 py-0.5 text-xs"
                          title={`${cita.moto.patente} - ${cita.rider.nombre}`}
                        >
                          {cita.moto.patente}
                        </div>
                      ))}
                      {citasInDay.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{citasInDay.length - 2} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            <span className="text-xs font-medium text-muted-foreground">Estados:</span>
            {["PROGRAMADA", "CONFIRMADA", "EN_PROCESO", "COMPLETADA", "NO_ASISTIO"].map((estado) => (
              <Badge key={estado} variant="outline" className={estadoBadgeColor(estado)}>
                {estado.replace("_", " ")}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog for creating cita */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Cita de Mantenimiento</DialogTitle>
            <DialogDescription>
              {selectedDate && `Fecha: ${selectedDate.toLocaleDateString("es-AR")}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="moto">Moto (ID)</Label>
              <Input
                id="moto"
                placeholder="ID de la moto"
                value={motoId}
                onChange={(e) => setMotoId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nota: Integración con selector en desarrollo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rider">Rider (ID)</Label>
              <Input
                id="rider"
                placeholder="ID del rider/cliente"
                value={riderId}
                onChange={(e) => setRiderId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taller">Taller (ID)</Label>
              <Input
                id="taller"
                placeholder="ID del taller"
                value={tallerId}
                onChange={(e) => setTallerId(e.target.value)}
              />
            </div>

            <Button
              onClick={handleCreateCita}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Creando..." : "Crear Cita"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
