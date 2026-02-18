"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Wrench,
  MessageSquare,
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import type { Moto } from "@/app/(dashboard)/admin/motos/types";

type MotoDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motoId: string | null;
  onDelete?: () => void;
};

export function MotoDetailSheet({
  open,
  onOpenChange,
  motoId,
  onDelete,
}: MotoDetailSheetProps) {
  const router = useRouter();
  const [moto, setMoto] = useState<Moto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && motoId) {
      setIsLoading(true);
      fetch(`/api/motos/${motoId}`)
        .then((res) => res.json())
        .then((data) => {
          setMoto(data);
        })
        .catch((error) => {
          console.error("Error loading moto details:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, motoId]);

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
  const estadoBadge = {
    DISPONIBLE: { label: "Disponible", className: "bg-green-100 text-green-700 border-green-300" },
    ALQUILADA: { label: "Alquilada", className: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    MANTENIMIENTO: { label: "Mantenimiento", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    BAJA: { label: "Baja", className: "bg-gray-100 text-gray-700 border-gray-300" },
  }[moto?.estado ?? "DISPONIBLE"] ?? { label: "Desconocido", className: "" };

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

            <Accordion type="multiple" defaultValue={["datos", "documentacion", "observaciones"]} className="w-full">
              {/* Datos Generales */}
              <AccordionItem value="datos">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Datos Generales
                  </div>
                </AccordionTrigger>
                <AccordionContent>
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
                    {moto.numeroCuadro && <DataField label="Nº Cuadro/Chasis" value={moto.numeroCuadro} />}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Documentación */}
              <AccordionItem value="documentacion">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentación
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
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
                            label="Fecha inicio trámite"
                            value={new Date(moto.fechaInicioTramitePatente).toLocaleDateString("es-AR")}
                          />
                        )}
                        {moto.fechaPatentamiento && (
                          <DataField
                            label="Fecha patentamiento"
                            value={new Date(moto.fechaPatentamiento).toLocaleDateString("es-AR")}
                          />
                        )}
                        {moto.notasPatentamiento && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Notas</p>
                            <p className="text-sm">{moto.notasPatentamiento}</p>
                          </div>
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
                        {moto.fechaInicioSeguro && (
                          <DataField
                            label="Fecha inicio"
                            value={new Date(moto.fechaInicioSeguro).toLocaleDateString("es-AR")}
                          />
                        )}
                        {moto.fechaVencimientoSeguro && (
                          <DataField
                            label="Vigencia hasta"
                            value={new Date(moto.fechaVencimientoSeguro).toLocaleDateString("es-AR")}
                          />
                        )}
                        {moto.notasSeguro && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Notas</p>
                            <p className="text-sm">{moto.notasSeguro}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Mantenimientos */}
              <AccordionItem value="mantenimientos">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Mantenimientos
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No hay mantenimientos registrados
                    </p>
                    <Link
                      href={`/admin/mantenimientos?motoId=${moto.id}`}
                      className="mt-2 inline-block text-xs text-cyan-600 hover:underline"
                    >
                      Ver todos →
                    </Link>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Observaciones */}
              <AccordionItem value="observaciones">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Observaciones
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {moto.descripcion ? (
                    <p className="text-sm text-muted-foreground">{moto.descripcion}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Sin observaciones
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
