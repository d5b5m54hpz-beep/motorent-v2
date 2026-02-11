"use client";

import { useState, useEffect } from "react";
import { Search, Filter, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Documento = {
  id: string;
  tipo: string;
  nombre: string;
  url?: string | null;
  fechaEmision?: Date | null;
  fechaVencimiento?: Date | null;
  completado: boolean;
};

type MotoKanban = {
  id: string;
  marca: string;
  modelo: string;
  patente?: string | null;
  dominio?: string | null;
  vin?: string | null;
  esImportada: boolean;
  estadoPatentamiento: string;
  documentos: Documento[];
  progress: number;
};

type KanbanData = {
  NO_INICIADO: MotoKanban[];
  EN_PROCESO: MotoKanban[];
  OBSERVADO: MotoKanban[];
  COMPLETADO: MotoKanban[];
};

const COLUMNAS = [
  { id: "NO_INICIADO", label: "No Iniciado", color: "bg-gray-500" },
  { id: "EN_PROCESO", label: "En Proceso", color: "bg-blue-500" },
  { id: "OBSERVADO", label: "Observado", color: "bg-yellow-500" },
  { id: "COMPLETADO", label: "Completado", color: "bg-green-500" },
];

// Documentos requeridos según DNRPA
const DOCUMENTOS_REQUERIDOS = [
  { tipo: "FACTURA_COMPRA", nombre: "Factura de Compra", requeridoSiempre: true },
  { tipo: "DESPACHO_IMPORTACION", nombre: "Despacho de Importación", requeridoSolo: "importadas" },
  { tipo: "CERTIFICADO_FABRICACION", nombre: "Certificado de Fabricación", requeridoSiempre: true },
  { tipo: "CEDULA_VERDE", nombre: "Cédula Verde", requeridoSiempre: false },
  { tipo: "CEDULA_AZUL", nombre: "Cédula Azul", requeridoSiempre: false },
  { tipo: "VTV", nombre: "Verificación Técnica Vehicular", requeridoSiempre: false },
  { tipo: "POLIZA_SEGURO", nombre: "Póliza de Seguro Vigente", requeridoSiempre: true },
  { tipo: "DDJJ_ORIGEN", nombre: "DDJJ de Origen de Fondos", requeridoSiempre: true },
  { tipo: "FORMULARIO_08", nombre: "Formulario 08 (Solicitud Inscripción)", requeridoSiempre: true },
  { tipo: "FORMULARIO_13", nombre: "Formulario 13 (Denuncia de Venta)", requeridoSiempre: false },
  { tipo: "COMPROBANTE_PAGO_PATENTE", nombre: "Comprobante Pago Patente", requeridoSiempre: false },
  { tipo: "CERTIFICADO_LIBRE_DEUDA", nombre: "Certificado Libre Deuda", requeridoSiempre: false },
  { tipo: "DNI_TITULAR", nombre: "DNI del Titular", requeridoSiempre: true },
  { tipo: "CONSTANCIA_INSCRIPCION_AFIP", nombre: "Constancia Inscripción AFIP", requeridoSiempre: true },
  { tipo: "HABILITACION_MUNICIPAL", nombre: "Habilitación Municipal", requeridoSiempre: false },
];

export default function PatentamientoPage() {
  const [data, setData] = useState<KanbanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [soloImportadas, setSoloImportadas] = useState(false);
  const [soloPendientes, setSoloPendientes] = useState(true);

  // Dialog state
  const [selectedMoto, setSelectedMoto] = useState<MotoKanban | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (soloImportadas) params.set("soloImportadas", "true");
      if (soloPendientes) params.set("soloPendientes", "true");

      const res = await fetch(`/api/motos/patentamiento?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error("Error fetching patentamiento:", err);
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, soloImportadas, soloPendientes]);

  const handleEstadoChange = async (motoId: string, nuevoEstado: string) => {
    try {
      const res = await fetch(`/api/motos/${motoId}/estado-patentamiento`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estadoPatentamiento: nuevoEstado }),
      });

      if (res.ok) {
        toast.success("Estado actualizado");
        fetchData();
      } else {
        const json = await res.json();
        toast.error(json.error || "Error al actualizar");
      }
    } catch (err) {
      toast.error("Error al actualizar estado");
    }
  };

  const handleToggleDocumento = async (docId: string, completado: boolean) => {
    try {
      const res = await fetch(`/api/motos/${selectedMoto!.id}/documentos/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completado }),
      });

      if (res.ok) {
        toast.success("Documento actualizado");
        fetchData();
        // Actualizar selectedMoto
        if (selectedMoto) {
          setSelectedMoto({
            ...selectedMoto,
            documentos: selectedMoto.documentos.map((d) =>
              d.id === docId ? { ...d, completado } : d
            ),
          });
        }
      } else {
        toast.error("Error al actualizar documento");
      }
    } catch (err) {
      toast.error("Error al actualizar documento");
    }
  };

  const handleCrearDocumento = async (tipo: string, nombre: string) => {
    if (!selectedMoto) return;

    try {
      const res = await fetch(`/api/motos/${selectedMoto.id}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, nombre, completado: false }),
      });

      if (res.ok) {
        toast.success("Documento agregado");
        fetchData();
        // Refresh selected moto
        const updatedMoto = data
          ? Object.values(data)
              .flat()
              .find((m) => m.id === selectedMoto.id)
          : null;
        if (updatedMoto) setSelectedMoto(updatedMoto);
      } else {
        toast.error("Error al agregar documento");
      }
    } catch (err) {
      toast.error("Error al agregar documento");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Patentamiento RUNA</h1>
        </div>
        <Skeleton className="h-20 rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Patentamiento RUNA</h1>
        <p className="text-muted-foreground">Error al cargar datos.</p>
      </div>
    );
  }

  const totalMotos = Object.values(data).flat().length;
  const completadas = data.COMPLETADO.length;
  const enProceso = data.EN_PROCESO.length + data.OBSERVADO.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patentamiento RUNA</h1>
        <p className="text-muted-foreground">
          Gestión de trámites DNRPA para comerciante habitualista
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="rounded-lg border bg-card p-3 flex-1">
          <p className="text-sm text-muted-foreground">Total Motos</p>
          <p className="text-2xl font-bold">{totalMotos}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 flex-1">
          <p className="text-sm text-muted-foreground">En Proceso</p>
          <p className="text-2xl font-bold text-blue-500">{enProceso}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 flex-1">
          <p className="text-sm text-muted-foreground">Completadas</p>
          <p className="text-2xl font-bold text-green-500">{completadas}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por VIN, patente o dominio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="importadas"
              checked={soloImportadas}
              onCheckedChange={setSoloImportadas}
            />
            <Label htmlFor="importadas" className="cursor-pointer whitespace-nowrap">
              Solo Importadas
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="pendientes"
              checked={soloPendientes}
              onCheckedChange={setSoloPendientes}
            />
            <Label htmlFor="pendientes" className="cursor-pointer whitespace-nowrap">
              Solo Pendientes
            </Label>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNAS.map((columna) => {
          const motos = data[columna.id as keyof KanbanData];

          return (
            <div key={columna.id} className="flex flex-col">
              {/* Column Header */}
              <div className={`rounded-t-lg ${columna.color} p-3 text-white`}>
                <h3 className="font-semibold">{columna.label}</h3>
                <p className="text-sm opacity-90">{motos.length} motos</p>
              </div>

              {/* Column Content */}
              <div className="flex-1 rounded-b-lg border border-t-0 bg-muted/20 p-2 space-y-2 min-h-[500px]">
                {motos.map((moto) => (
                  <div
                    key={moto.id}
                    className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedMoto(moto);
                      setIsDialogOpen(true);
                    }}
                  >
                    {/* Moto Info */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">
                            {moto.marca} {moto.modelo}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {moto.dominio || moto.patente || moto.vin || "Sin dominio"}
                          </p>
                        </div>
                        {moto.esImportada && (
                          <Badge variant="secondary" className="text-[10px]">
                            IMP
                          </Badge>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Documentación</span>
                          <span className="font-medium">{moto.progress}%</span>
                        </div>
                        <Progress value={moto.progress} className="h-1.5" />
                      </div>

                      {/* Actions Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMoto(moto);
                          setIsDialogOpen(true);
                        }}
                      >
                        <span>Ver Checklist</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {motos.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    No hay motos en este estado
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Checklist Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedMoto && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedMoto.marca} {selectedMoto.modelo} -{" "}
                  {selectedMoto.dominio || selectedMoto.patente || selectedMoto.vin}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Estado actual */}
                <div className="space-y-2">
                  <Label>Estado del Trámite</Label>
                  <Select
                    value={selectedMoto.estadoPatentamiento}
                    onValueChange={(value) => handleEstadoChange(selectedMoto.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMNAS.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Progress global */}
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progreso General</span>
                    <span className="text-sm font-bold">{selectedMoto.progress}%</span>
                  </div>
                  <Progress value={selectedMoto.progress} className="h-2" />
                </div>

                {/* Checklist de documentos */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Documentación Requerida</h4>
                  {DOCUMENTOS_REQUERIDOS.filter(
                    (doc) =>
                      doc.requeridoSiempre ||
                      (doc.requeridoSolo === "importadas" && selectedMoto.esImportada)
                  ).map((docRequerido) => {
                    const docExistente = selectedMoto.documentos.find(
                      (d) => d.tipo === docRequerido.tipo
                    );

                    return (
                      <div
                        key={docRequerido.tipo}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={docExistente?.completado || false}
                          onCheckedChange={(checked) => {
                            if (docExistente) {
                              handleToggleDocumento(docExistente.id, !!checked);
                            } else {
                              // Crear documento
                              handleCrearDocumento(docRequerido.tipo, docRequerido.nombre);
                            }
                          }}
                          className="mt-0.5"
                        />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{docRequerido.nombre}</p>
                          {docExistente?.url && (
                            <a
                              href={docExistente.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ver documento
                            </a>
                          )}
                          {docExistente?.fechaVencimiento && (
                            <p className="text-xs text-muted-foreground">
                              Vence:{" "}
                              {new Date(docExistente.fechaVencimiento).toLocaleDateString("es-AR")}
                            </p>
                          )}
                        </div>
                        {docExistente?.completado ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
