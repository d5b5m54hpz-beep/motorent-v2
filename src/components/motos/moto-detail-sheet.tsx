"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Wrench,
  Car,
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
  User,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Moto } from "@/app/(dashboard)/admin/motos/types";

type MotoDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motoId: string | null;
  onDelete?: () => void;
};

type ContratoActivo = {
  id: string;
  cliente: { nombre: string; email: string; dni: string };
  fechaInicio: Date;
  fechaFin: Date;
  montoPeriodo: number;
  frecuenciaPago: string;
  estado: string;
};

type OrdenTrabajo = {
  id: string;
  numero: string;
  tipoOT: string;
  prioridad: string;
  estado: string;
  fechaIngreso: Date;
  fechaFinalizacion: Date | null;
  costoTotal: number;
  descripcion: string;
};

export function MotoDetailSheet({
  open,
  onOpenChange,
  motoId,
  onDelete,
}: MotoDetailSheetProps) {
  const router = useRouter();
  const [moto, setMoto] = useState<Moto | null>(null);
  const [contratoActivo, setContratoActivo] = useState<ContratoActivo | null>(null);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState<OrdenTrabajo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContrato, setIsLoadingContrato] = useState(false);
  const [isLoadingOTs, setIsLoadingOTs] = useState(false);

  useEffect(() => {
    if (open && motoId) {
      setIsLoading(true);
      fetch(`/api/motos/${motoId}`)
        .then((res) => res.json())
        .then((data) => {
          setMoto(data);

          // Si está alquilada o reservada, fetch contrato activo
          if (data.estado === "ALQUILADA" || data.estado === "RESERVADA") {
            setIsLoadingContrato(true);
            fetch(`/api/contratos?motoId=${motoId}&estado=ACTIVO,PENDIENTE&limit=1`)
              .then((r) => r.json())
              .then((d) => {
                if (d.data && d.data.length > 0) {
                  setContratoActivo(d.data[0]);
                }
              })
              .catch((err) => console.error("Error loading contrato:", err))
              .finally(() => setIsLoadingContrato(false));
          }
        })
        .catch((error) => {
          console.error("Error loading moto details:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, motoId]);

  // Fetch órdenes de trabajo cuando se abre el tab de mantenimientos
  const handleMantenimientosTabClick = () => {
    if (motoId && ordenesTrabajo.length === 0 && !isLoadingOTs) {
      setIsLoadingOTs(true);
      fetch(`/api/mantenimientos/ordenes?motoId=${motoId}&limit=10`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setOrdenesTrabajo(data.data);
          }
        })
        .catch((err) => console.error("Error loading OTs:", err))
        .finally(() => setIsLoadingOTs(false));
    }
  };

  const handleEdit = () => {
    if (moto) {
      router.push(`/admin/motos?edit=${moto.id}`);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onOpenChange(false);
    }
  };

  // Estado badges
  const estadoBadgeMap: Record<string, { label: string; className: string }> = {
    EN_DEPOSITO: { label: "En Depósito", className: "bg-gray-100 text-gray-700 border-gray-300" },
    EN_PATENTAMIENTO: { label: "Patentando", className: "bg-amber-100 text-amber-700 border-amber-300" },
    DISPONIBLE: { label: "Disponible", className: "bg-green-100 text-green-700 border-green-300" },
    RESERVADA: { label: "Reservada", className: "bg-blue-100 text-blue-700 border-blue-300" },
    ALQUILADA: { label: "Alquilada", className: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    EN_SERVICE: { label: "En Service", className: "bg-orange-100 text-orange-700 border-orange-300" },
    EN_REPARACION: { label: "En Reparación", className: "bg-red-100 text-red-700 border-red-300" },
    INMOVILIZADA: { label: "Inmovilizada", className: "bg-purple-100 text-purple-700 border-purple-300" },
    RECUPERACION: { label: "Recuperación", className: "bg-sky-100 text-sky-700 border-sky-300" },
    BAJA_TEMP: { label: "Baja Temporal", className: "bg-rose-100 text-rose-700 border-rose-300" },
    BAJA_DEFINITIVA: { label: "Baja Definitiva", className: "bg-slate-100 text-slate-700 border-slate-300" },
    TRANSFERIDA: { label: "Transferida", className: "bg-teal-100 text-teal-700 border-teal-300" },
  };
  const estadoBadge = estadoBadgeMap[moto?.estado ?? "DISPONIBLE"] ?? { label: "Desconocido", className: "" };

  // Patentamiento badge
  const patentamientoBadge = {
    SIN_PATENTAR: { label: "🔴 Sin Patentar", className: "bg-red-100 text-red-700 border-red-300" },
    EN_TRAMITE: { label: "🟡 En Trámite", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    PATENTADA: { label: "🟢 Patentada", className: "bg-green-100 text-green-700 border-green-300" },
  }[moto?.estadoPatentamiento ?? "SIN_PATENTAR"] ?? { label: "N/A", className: "" };

  // Seguro badge
  const estadoSeguro = moto?.estadoSeguro ?? "SIN_SEGURO";
  const seguroBadge = {
    SIN_SEGURO: { label: "🔴 Sin Seguro", className: "bg-red-100 text-red-700 border-red-300" },
    EN_TRAMITE: { label: "🟡 En Trámite", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    ASEGURADA: { label: "🟢 Asegurada", className: "bg-green-100 text-green-700 border-green-300" },
  }[estadoSeguro] ?? { label: "N/A", className: "" };

  // Calcular estado de vencimiento seguro
  const vencimientoSeguro = moto?.fechaVencimientoSeguro ? new Date(moto.fechaVencimientoSeguro) : null;
  const hoy = new Date();
  const diasParaVencer = vencimientoSeguro ? Math.floor((vencimientoSeguro.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const seguroVencido = diasParaVencer !== null && diasParaVencer < 0;
  const seguroPorVencer = diasParaVencer !== null && diasParaVencer >= 0 && diasParaVencer <= 30;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Separator />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : moto ? (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <SheetTitle className="sr-only">Detalle de Moto</SheetTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Imagen */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                {moto.imagen ? (
                  <Image
                    src={moto.imagen}
                    alt={`${moto.marca} ${moto.modelo}`}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <AlertCircle className="h-12 w-12" />
                  </div>
                )}
              </div>

              {/* Título */}
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {moto.marca} {moto.modelo}
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {moto.patente}
                  </Badge>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant="outline" className={estadoBadge.className}>
                    {estadoBadge.label}
                  </Badge>
                </div>
              </div>
            </SheetHeader>

            <Separator className="my-4" />

            {/* Tabs organizadas por categoría */}
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">
                  <FileText className="h-4 w-4 mr-1" />
                  General
                </TabsTrigger>
                <TabsTrigger value="mantenimientos" onClick={handleMantenimientosTabClick}>
                  <Wrench className="h-4 w-4 mr-1" />
                  Mantenimientos
                </TabsTrigger>
                <TabsTrigger value="viajes">
                  <MapPin className="h-4 w-4 mr-1" />
                  Viajes
                </TabsTrigger>
              </TabsList>

              {/* TAB: GENERAL */}
              <TabsContent value="general" className="space-y-4 mt-4">
                {/* Datos de la Moto */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Datos de la Moto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <DataField label="Marca" value={moto.marca} />
                      <DataField label="Modelo" value={moto.modelo} />
                      <DataField label="Año" value={moto.anio} />
                      <DataField label="Patente" value={moto.patente} />
                      <DataField label="Cilindrada" value={moto.cilindrada ? `${moto.cilindrada} cc` : "-"} />
                      <DataField label="Tipo" value={moto.tipo || "-"} />
                      <DataField label="Color" value={moto.color || "-"} />
                      <DataField label="Kilometraje" value={`${moto.kilometraje.toLocaleString("es-AR")} km`} />
                      {moto.numeroMotor && <DataField label="Nº Motor" value={moto.numeroMotor} />}
                      {moto.numeroCuadro && <DataField label="Nº Cuadro" value={moto.numeroCuadro} />}
                    </div>
                    {moto.descripcion && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
                        <p className="text-sm">{moto.descripcion}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Documentación */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documentación
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Patentamiento */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Patentamiento</h4>
                      <div className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Estado</span>
                          <Badge variant="outline" className={`text-xs ${patentamientoBadge.className}`}>
                            {patentamientoBadge.label}
                          </Badge>
                        </div>
                        {moto.fechaInicioTramitePatente && (
                          <DataField
                            label="Inicio trámite"
                            value={new Date(moto.fechaInicioTramitePatente).toLocaleDateString("es-AR")}
                          />
                        )}
                        {moto.fechaPatentamiento && (
                          <DataField
                            label="Patentada"
                            value={new Date(moto.fechaPatentamiento).toLocaleDateString("es-AR")}
                          />
                        )}
                      </div>
                    </div>

                    {/* Seguro */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Seguro</h4>
                      <div className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Estado</span>
                          <div className="flex gap-2">
                            <Badge variant="outline" className={`text-xs ${seguroBadge.className}`}>
                              {seguroBadge.label}
                            </Badge>
                            {seguroVencido && (
                              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-xs">
                                Vencido
                              </Badge>
                            )}
                            {seguroPorVencer && (
                              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                                ⚠️ Vence pronto
                              </Badge>
                            )}
                          </div>
                        </div>
                        {moto.aseguradora && <DataField label="Aseguradora" value={moto.aseguradora} />}
                        {moto.numeroPoliza && <DataField label="Nº Póliza" value={moto.numeroPoliza} />}
                        {moto.fechaVencimientoSeguro && (
                          <DataField
                            label="Vigencia hasta"
                            value={new Date(moto.fechaVencimientoSeguro).toLocaleDateString("es-AR")}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contrato Activo (si aplica) */}
                {(moto.estado === "ALQUILADA" || moto.estado === "RESERVADA") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {moto.estado === "ALQUILADA" ? "Contrato Activo" : "Contrato en Firma"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingContrato ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ) : contratoActivo ? (
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">Cliente</p>
                              <p className="font-medium">{contratoActivo.cliente.nombre}</p>
                              <p className="text-xs text-muted-foreground">{contratoActivo.cliente.email}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {contratoActivo.estado}
                            </Badge>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Desde
                              </p>
                              <p className="font-medium">
                                {new Date(contratoActivo.fechaInicio).toLocaleDateString("es-AR")}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Hasta
                              </p>
                              <p className="font-medium">
                                {new Date(contratoActivo.fechaFin).toLocaleDateString("es-AR")}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                Monto {contratoActivo.frecuenciaPago.toLowerCase()}
                              </p>
                              <p className="font-medium">
                                ${Number(contratoActivo.montoPeriodo).toLocaleString("es-AR")}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Frecuencia
                              </p>
                              <p className="font-medium">{contratoActivo.frecuenciaPago}</p>
                            </div>
                          </div>
                          <Link
                            href={`/admin/contratos/${contratoActivo.id}`}
                            className="block text-center text-xs text-cyan-600 hover:underline pt-2"
                          >
                            Ver contrato completo →
                          </Link>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No se encontró contrato activo</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TAB: MANTENIMIENTOS */}
              <TabsContent value="mantenimientos" className="space-y-4 mt-4">
                {isLoadingOTs ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : ordenesTrabajo.length > 0 ? (
                  <div className="space-y-3">
                    {ordenesTrabajo.map((ot) => (
                      <Card key={ot.id}>
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">OT {ot.numero}</p>
                                <p className="text-xs text-muted-foreground">{ot.tipoOT}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {ot.estado}
                              </Badge>
                            </div>
                            {ot.descripcion && (
                              <p className="text-sm text-muted-foreground">{ot.descripcion}</p>
                            )}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {new Date(ot.fechaIngreso).toLocaleDateString("es-AR")}
                                {ot.fechaFinalizacion && (
                                  <> → {new Date(ot.fechaFinalizacion).toLocaleDateString("es-AR")}</>
                                )}
                              </span>
                              {ot.costoTotal > 0 && (
                                <span className="font-medium">
                                  ${Number(ot.costoTotal).toLocaleString("es-AR")}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Link
                      href={`/admin/mantenimientos?motoId=${moto.id}`}
                      className="block text-center text-sm text-cyan-600 hover:underline pt-2"
                    >
                      Ver historial completo →
                    </Link>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Wrench className="h-12 w-12 mx-auto text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground mt-2">
                          No hay mantenimientos registrados
                        </p>
                        <Link
                          href={`/admin/mantenimientos?motoId=${moto.id}`}
                          className="inline-block mt-2 text-xs text-cyan-600 hover:underline"
                        >
                          Crear orden de trabajo →
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TAB: VIAJES (Placeholder para IoT/Telemetría) */}
              <TabsContent value="viajes" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center space-y-3">
                      <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                        <MapPin className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">Telemetría & IoT</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Próximamente: seguimiento GPS, datos de conducción, historial de viajes
                        </p>
                      </div>
                      <div className="pt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">🛰️ GPS tracking</span>
                          <Badge variant="outline" className="text-xs">Próximamente</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">📍 Historial de rutas</span>
                          <Badge variant="outline" className="text-xs">Próximamente</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">⚡ Datos de conducción</span>
                          <Badge variant="outline" className="text-xs">Próximamente</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">🔋 Estado de batería</span>
                          <Badge variant="outline" className="text-xs">Próximamente</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No se encontró la moto</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Helper component para mostrar campos
function DataField({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
