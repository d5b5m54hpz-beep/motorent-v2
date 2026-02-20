"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FileText,
  Wrench,
  Car,
  AlertCircle,
  User,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckSquare,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Moto } from "@/app/(dashboard)/admin/motos/types";

type MotoDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motoId: string | null;
};

type ContratoResumen = {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  montoPeriodo: number;
  montoTotal: number;
  frecuenciaPago: string;
  estado: string;
  cliente: { nombre: string; email: string; dni: string };
  _count: { pagos: number };
  montoCobrado: number;
};

type ContratoDetailData = {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  montoPeriodo: number;
  montoTotal: number;
  frecuenciaPago: string;
  estado: string;
  notas: string | null;
  renovacionAuto: boolean;
  cliente: { nombre: string; email: string; dni: string };
  pagos: {
    id: string;
    monto: number;
    estado: string;
    vencimientoAt: string;
    factura: { id: string } | null;
  }[];
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
  costoRepuestos: number;
  costoManoObra: number;
  costoOtros: number;
  descripcion: string;
  observacionesMecanico: string | null;
  observacionesRecepcion: string | null;
  kmAlIngreso: number | null;
  kmAlEgreso: number | null;
  taller: { id: string; nombre: string } | null;
  mecanico: { id: string; nombre: string } | null;
  rider: { id: string; nombre: string } | null;
  plan: { id: string; nombre: string; tipo: string } | null;
  tareas: { id: string; nombre: string; descripcion: string | null; completada: boolean; orden: number }[];
  repuestosUsados: {
    id: string;
    cantidad: number;
    costoUnitario: number;
    repuesto: { id: string; nombre: string; codigo: string | null };
  }[];
};

export function MotoDetailSheet({
  open,
  onOpenChange,
  motoId,
}: MotoDetailSheetProps) {
  const [moto, setMoto] = useState<Moto | null>(null);
  const [contratos, setContratos] = useState<ContratoResumen[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<ContratoDetailData | null>(null);
  const [isLoadingContratos, setIsLoadingContratos] = useState(false);
  const [isLoadingContratoDetail, setIsLoadingContratoDetail] = useState(false);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState<OrdenTrabajo[]>([]);
  const [selectedOT, setSelectedOT] = useState<OrdenTrabajo | null>(null);
  const [isLoadingOTDetail, setIsLoadingOTDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOTs, setIsLoadingOTs] = useState(false);

  useEffect(() => {
    if (open && motoId) {
      setIsLoading(true);
      setContratos([]);
      setSelectedContrato(null);
      setOrdenesTrabajo([]);
      setSelectedOT(null);

      Promise.all([
        fetch(`/api/motos/${motoId}`).then((r) => r.json()),
        fetch(`/api/contratos?motoId=${motoId}&limit=100&sortBy=fechaInicio&sortOrder=desc`)
          .then((r) => r.json())
          .then((d) => {
            if (d.data) setContratos(d.data);
            setIsLoadingContratos(false);
          })
          .catch(() => setIsLoadingContratos(false)),
      ])
        .then(([motoData]) => {
          setMoto(motoData);
        })
        .catch((err) => console.error("Error loading:", err))
        .finally(() => setIsLoading(false));
    }
  }, [open, motoId]);

  // Fetch órdenes de trabajo cuando se abre el tab de mantenimientos
  const handleMantenimientosTabClick = () => {
    if (motoId && ordenesTrabajo.length === 0 && !isLoadingOTs) {
      setIsLoadingOTs(true);
      fetch(`/api/mantenimientos/ordenes?motoId=${motoId}&limit=200`)
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

  const handleOpenContrato = (contrato: ContratoResumen) => {
    setIsLoadingContratoDetail(true);
    fetch(`/api/contratos/${contrato.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setSelectedContrato(data);
      })
      .catch((err) => console.error("Error loading contrato detail:", err))
      .finally(() => setIsLoadingContratoDetail(false));
  };

  const handleOpenOT = (ot: OrdenTrabajo) => {
    // Si ya tiene tareas/repuestos cargados, mostrar directo
    if (ot.tareas && ot.repuestosUsados) {
      setSelectedOT(ot);
      return;
    }
    setIsLoadingOTDetail(true);
    fetch(`/api/mantenimientos/ordenes/${ot.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setSelectedOT(data.data);
      })
      .catch((err) => console.error("Error loading OT detail:", err))
      .finally(() => setIsLoadingOTDetail(false));
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
              <SheetTitle className="sr-only">Detalle de Moto</SheetTitle>

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
              <TabsContent value="general" className="mt-4">
                {selectedContrato ? (
                  <ContratoDetail
                    contrato={selectedContrato}
                    onBack={() => setSelectedContrato(null)}
                  />
                ) : isLoadingContratoDetail ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
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
                              <DataField label="Inicio trámite" value={new Date(moto.fechaInicioTramitePatente).toLocaleDateString("es-AR")} />
                            )}
                            {moto.fechaPatentamiento && (
                              <DataField label="Patentada" value={new Date(moto.fechaPatentamiento).toLocaleDateString("es-AR")} />
                            )}
                          </div>
                        </div>
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
                              <DataField label="Vigencia hasta" value={new Date(moto.fechaVencimientoSeguro).toLocaleDateString("es-AR")} />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Historial de Contratos */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1.5 px-0.5">
                        <User className="h-4 w-4" />
                        Contratos de alquiler
                        {contratos.length > 0 && (
                          <span className="text-muted-foreground font-normal">({contratos.length})</span>
                        )}
                      </p>
                      {isLoadingContratos ? (
                        <div className="space-y-2">
                          <Skeleton className="h-14 w-full" />
                          <Skeleton className="h-14 w-full" />
                        </div>
                      ) : contratos.length > 0 ? (
                        <div className="space-y-2">
                          {contratos.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => handleOpenContrato(c)}
                              className="w-full text-left rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">
                                      {c.cliente.nombre}
                                    </span>
                                    <ContratoEstadoBadge estado={c.estado} />
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(c.fechaInicio).toLocaleDateString("es-AR")} →{" "}
                                      {new Date(c.fechaFin).toLocaleDateString("es-AR")}
                                    </span>
                                    <span className="text-xs font-medium">
                                      ${Number(c.montoPeriodo).toLocaleString("es-AR")}/{c.frecuenciaPago.toLowerCase().slice(0, 3)}
                                    </span>
                                  </div>
                                  {c.montoCobrado > 0 && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      ${Number(c.montoCobrado).toLocaleString("es-AR")} cobrado · {c._count.pagos} pago{c._count.pagos !== 1 ? "s" : ""}
                                    </p>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Sin contratos registrados
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB: MANTENIMIENTOS */}
              <TabsContent value="mantenimientos" className="mt-4">
                {selectedOT ? (
                  <OTDetail
                    ot={selectedOT}
                    onBack={() => setSelectedOT(null)}
                  />
                ) : isLoadingOTs ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : ordenesTrabajo.length > 0 ? (
                  <div className="space-y-2">
                    {isLoadingOTDetail && (
                      <div className="space-y-2 mb-2">
                        <Skeleton className="h-16 w-full" />
                      </div>
                    )}
                    {ordenesTrabajo.map((ot) => (
                      <button
                        key={ot.id}
                        onClick={() => handleOpenOT(ot)}
                        className="w-full text-left rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium font-mono">
                                {ot.numero}
                              </span>
                              <OTEstadoBadge estado={ot.estado} />
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {ot.tipoOT}
                              </span>
                              {ot.taller && (
                                <>
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {ot.taller.nombre}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {new Date(ot.fechaIngreso).toLocaleDateString("es-AR")}
                                {ot.fechaFinalizacion && (
                                  <> → {new Date(ot.fechaFinalizacion).toLocaleDateString("es-AR")}</>
                                )}
                              </span>
                              {Number(ot.costoTotal) > 0 && (
                                <span className="text-xs font-medium text-foreground">
                                  ${Number(ot.costoTotal).toLocaleString("es-AR")}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
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

// Badge de estado de Contrato
const CONTRATO_ESTADO_MAP: Record<string, { label: string; className: string }> = {
  PENDIENTE:   { label: "Pendiente",   className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  ACTIVO:      { label: "Activo",      className: "bg-green-100 text-green-700 border-green-300" },
  FINALIZADO:  { label: "Finalizado",  className: "bg-gray-100 text-gray-700 border-gray-300" },
  CANCELADO:   { label: "Cancelado",   className: "bg-red-100 text-red-700 border-red-300" },
  VENCIDO:     { label: "Vencido",     className: "bg-rose-100 text-rose-700 border-rose-300" },
};

function ContratoEstadoBadge({ estado }: { estado: string }) {
  const badge = CONTRATO_ESTADO_MAP[estado] ?? { label: estado, className: "" };
  return (
    <Badge variant="outline" className={`text-xs ${badge.className}`}>
      {badge.label}
    </Badge>
  );
}

// Vista de detalle de un Contrato
type ContratoDetailProps = {
  contrato: ContratoDetailData;
  onBack: () => void;
};

const PAGO_ESTADO_MAP: Record<string, { label: string; className: string }> = {
  PENDIENTE:  { label: "Pendiente",  className: "text-yellow-700" },
  APROBADO:   { label: "Aprobado",   className: "text-green-700" },
  VENCIDO:    { label: "Vencido",    className: "text-red-700" },
  ANULADO:    { label: "Anulado",    className: "text-gray-500" },
};

function ContratoDetail({ contrato, onBack }: ContratoDetailProps) {
  const pagosAprobados = contrato.pagos.filter((p) => p.estado === "APROBADO");
  const montoCobrado = pagosAprobados.reduce((sum, p) => sum + Number(p.monto), 0);

  return (
    <div className="space-y-4">
      {/* Header con back */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Contratos
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{contrato.cliente.nombre}</span>
      </div>

      {/* Estado */}
      <div className="flex items-center gap-2 flex-wrap">
        <ContratoEstadoBadge estado={contrato.estado} />
        <Badge variant="outline" className="text-xs">{contrato.frecuenciaPago}</Badge>
        {contrato.renovacionAuto && (
          <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-300">
            Renovación auto
          </Badge>
        )}
      </div>

      <Separator />

      {/* Cliente */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Cliente</p>
        <p className="font-medium">{contrato.cliente.nombre}</p>
        <p className="text-xs text-muted-foreground">{contrato.cliente.email}</p>
        <p className="text-xs text-muted-foreground">DNI {contrato.cliente.dni}</p>
      </div>

      <Separator />

      {/* Fechas y montos */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <DataField label="Inicio" value={new Date(contrato.fechaInicio).toLocaleDateString("es-AR")} />
        <DataField label="Fin" value={new Date(contrato.fechaFin).toLocaleDateString("es-AR")} />
        <DataField label="Monto período" value={`$${Number(contrato.montoPeriodo).toLocaleString("es-AR")}`} />
        <DataField label="Monto total" value={`$${Number(contrato.montoTotal).toLocaleString("es-AR")}`} />
      </div>

      {/* Resumen de cobros */}
      <div className="rounded-lg border p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cobrado</span>
          <span className="font-medium text-green-700">${montoCobrado.toLocaleString("es-AR")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pagos aprobados</span>
          <span>{pagosAprobados.length} / {contrato.pagos.length}</span>
        </div>
      </div>

      {/* Notas */}
      {contrato.notas && (
        <>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Notas</p>
            <p className="text-sm">{contrato.notas}</p>
          </div>
        </>
      )}

      {/* Pagos */}
      {contrato.pagos.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              Pagos ({contrato.pagos.length})
            </p>
            <div className="space-y-1">
              {contrato.pagos.map((pago) => {
                const estadoPago = PAGO_ESTADO_MAP[pago.estado] ?? { label: pago.estado, className: "" };
                return (
                  <div key={pago.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${estadoPago.className}`}>
                        {estadoPago.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(pago.vencimientoAt).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                    <span className="font-medium">${Number(pago.monto).toLocaleString("es-AR")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <Link
        href={`/admin/contratos/${contrato.id}`}
        className="block text-center text-xs text-cyan-600 hover:underline pt-2"
      >
        Ver contrato completo →
      </Link>
    </div>
  );
}

// Badge de estado de OT
const OT_ESTADO_MAP: Record<string, { label: string; className: string }> = {
  SOLICITADA:   { label: "Solicitada",   className: "bg-gray-100 text-gray-700 border-gray-300" },
  PROGRAMADA:   { label: "Programada",   className: "bg-blue-100 text-blue-700 border-blue-300" },
  EN_PROCESO:   { label: "En Proceso",   className: "bg-amber-100 text-amber-700 border-amber-300" },
  COMPLETADA:   { label: "Completada",   className: "bg-green-100 text-green-700 border-green-300" },
  CANCELADA:    { label: "Cancelada",    className: "bg-red-100 text-red-700 border-red-300" },
};

function OTEstadoBadge({ estado }: { estado: string }) {
  const badge = OT_ESTADO_MAP[estado] ?? { label: estado, className: "" };
  return (
    <Badge variant="outline" className={`text-xs ${badge.className}`}>
      {badge.label}
    </Badge>
  );
}

// Vista de detalle de una OT
type OTDetailProps = {
  ot: OrdenTrabajo;
  onBack: () => void;
};

function OTDetail({ ot, onBack }: OTDetailProps) {
  return (
    <div className="space-y-4">
      {/* Header con back */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Historial
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium font-mono">{ot.numero}</span>
      </div>

      {/* Estado + tipo */}
      <div className="flex items-center gap-2 flex-wrap">
        <OTEstadoBadge estado={ot.estado} />
        <Badge variant="outline" className="text-xs">{ot.tipoOT}</Badge>
        <Badge variant="outline" className="text-xs">{ot.prioridad}</Badge>
      </div>

      {/* Descripción */}
      {ot.descripcion && (
        <p className="text-sm text-muted-foreground">{ot.descripcion}</p>
      )}

      <Separator />

      {/* Fechas y km */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <DataField
          label="Fecha ingreso"
          value={new Date(ot.fechaIngreso).toLocaleDateString("es-AR")}
        />
        {ot.fechaFinalizacion && (
          <DataField
            label="Fecha finalización"
            value={new Date(ot.fechaFinalizacion).toLocaleDateString("es-AR")}
          />
        )}
        {ot.kmAlIngreso != null && (
          <DataField label="Km ingreso" value={`${ot.kmAlIngreso.toLocaleString("es-AR")} km`} />
        )}
        {ot.kmAlEgreso != null && (
          <DataField label="Km egreso" value={`${ot.kmAlEgreso.toLocaleString("es-AR")} km`} />
        )}
      </div>

      {/* Taller / Mecánico / Plan */}
      {(ot.taller || ot.mecanico || ot.rider || ot.plan) && (
        <>
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-sm">
            {ot.taller && <DataField label="Taller" value={ot.taller.nombre} />}
            {ot.mecanico && <DataField label="Mecánico" value={ot.mecanico.nombre} />}
            {ot.rider && <DataField label="Rider" value={ot.rider.nombre} />}
            {ot.plan && <DataField label="Plan" value={ot.plan.nombre} />}
          </div>
        </>
      )}

      {/* Tareas */}
      {ot.tareas && ot.tareas.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4" />
              Tareas ({ot.tareas.filter((t) => t.completada).length}/{ot.tareas.length})
            </p>
            <div className="space-y-1">
              {ot.tareas.map((tarea) => (
                <div key={tarea.id} className="flex items-start gap-2 text-sm">
                  <span className={tarea.completada ? "text-green-600" : "text-muted-foreground"}>
                    {tarea.completada ? "✓" : "○"}
                  </span>
                  <div>
                    <p className={tarea.completada ? "line-through text-muted-foreground" : ""}>
                      {tarea.nombre}
                    </p>
                    {tarea.descripcion && (
                      <p className="text-xs text-muted-foreground">{tarea.descripcion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Repuestos */}
      {ot.repuestosUsados && ot.repuestosUsados.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              Repuestos utilizados
            </p>
            <div className="space-y-1">
              {ot.repuestosUsados.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span>{r.repuesto.nombre}</span>
                  <span className="text-muted-foreground text-xs">
                    {r.cantidad}x · ${Number(r.costoUnitario).toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Observaciones */}
      {(ot.observacionesMecanico || ot.observacionesRecepcion) && (
        <>
          <Separator />
          <div className="space-y-3">
            {ot.observacionesMecanico && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observaciones del mecánico</p>
                <p className="text-sm">{ot.observacionesMecanico}</p>
              </div>
            )}
            {ot.observacionesRecepcion && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observaciones de recepción</p>
                <p className="text-sm">{ot.observacionesRecepcion}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Costos */}
      {Number(ot.costoTotal) > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              Costos
            </p>
            <div className="space-y-1 text-sm">
              {Number(ot.costoRepuestos) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repuestos</span>
                  <span>${Number(ot.costoRepuestos).toLocaleString("es-AR")}</span>
                </div>
              )}
              {Number(ot.costoManoObra) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mano de obra</span>
                  <span>${Number(ot.costoManoObra).toLocaleString("es-AR")}</span>
                </div>
              )}
              {Number(ot.costoOtros) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Otros</span>
                  <span>${Number(ot.costoOtros).toLocaleString("es-AR")}</span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t pt-1 mt-1">
                <span>Total</span>
                <span>${Number(ot.costoTotal).toLocaleString("es-AR")}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
