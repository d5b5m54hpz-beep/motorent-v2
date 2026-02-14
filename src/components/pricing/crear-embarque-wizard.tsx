"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Ship, Package, DollarSign, Calculator, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Proveedor = {
  id: string;
  nombre: string;
  codigoCorto?: string | null;
};

type Repuesto = {
  id: string;
  nombre: string;
  categoria: string | null;
  codigo: string | null;
  codigoFabricante: string | null;
};

type ItemEmbarque = {
  repuestoId: string;
  repuestoNombre?: string;
  cantidad: number;
  precioFobUnitarioUsd: number;
  pesoTotalKg: number;
  volumenTotalCbm: number;
  ncmCodigo?: string;
  arancelPorcentaje?: number;
};

type CrearEmbarqueWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function CrearEmbarqueWizard({ open, onOpenChange, onSuccess }: CrearEmbarqueWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);

  // Step 1: Información General
  const [proveedorId, setProveedorId] = useState("");
  const [metodoFlete, setMetodoFlete] = useState("MARITIMO_FCL");
  const [fechaSalida, setFechaSalida] = useState("");
  const [fechaLlegadaEstimada, setFechaLlegadaEstimada] = useState("");
  const [numeroContenedor, setNumeroContenedor] = useState("");
  const [tipoContenedor, setTipoContenedor] = useState("");
  const [notas, setNotas] = useState("");

  // Step 2: Items
  const [items, setItems] = useState<ItemEmbarque[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<ItemEmbarque>>({
    cantidad: 1,
    precioFobUnitarioUsd: 0,
    pesoTotalKg: 0,
    volumenTotalCbm: 0,
  });
  const [uploadingPackingList, setUploadingPackingList] = useState(false);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [parseMethod, setParseMethod] = useState<"ai" | "manual" | null>(null);
  const [parseStatus, setParseStatus] = useState<string>("");
  const [showProveedorForm, setShowProveedorForm] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState({ nombre: "", codigoCorto: "" });

  // Step 3: Costos
  const [fleteUsd, setFleteUsd] = useState(0);
  const [seguroUsd, setSeguroUsd] = useState(0);
  const [autoCalcularSeguro, setAutoCalcularSeguro] = useState(true);

  // Step 4: Calculadora
  const [costosCalculados, setCostosCalculados] = useState<any>(null);
  const [tipoCambio, setTipoCambio] = useState(1200);

  useEffect(() => {
    if (open) {
      fetchProveedores();
      fetchRepuestos();
    }
  }, [open]);

  useEffect(() => {
    if (autoCalcularSeguro && items.length > 0) {
      const totalFob = items.reduce((sum, item) => sum + item.cantidad * item.precioFobUnitarioUsd, 0);
      setSeguroUsd((totalFob + fleteUsd) * 0.01);
    }
  }, [items, fleteUsd, autoCalcularSeguro]);

  const fetchProveedores = async () => {
    try {
      const res = await fetch("/api/proveedores?limit=100");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProveedores(data.data || []);
    } catch (error) {
      toast.error("Error al cargar proveedores");
    }
  };

  const fetchRepuestos = async () => {
    try {
      const res = await fetch("/api/repuestos?limit=200");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRepuestos(data.data || []);
    } catch (error) {
      toast.error("Error al cargar repuestos");
    }
  };

  const handleCrearProveedor = async () => {
    if (!nuevoProveedor.nombre.trim()) {
      toast.error("Ingresa el nombre del proveedor");
      return;
    }

    try {
      const res = await fetch("/api/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoProveedor.nombre,
          codigoCorto: nuevoProveedor.codigoCorto || null,
          activo: true,
        }),
      });

      if (!res.ok) throw new Error("Error al crear proveedor");

      const newProveedor = await res.json();
      setProveedores([...proveedores, newProveedor]);
      setProveedorId(newProveedor.id);
      setShowProveedorForm(false);
      setNuevoProveedor({ nombre: "", codigoCorto: "" });
      toast.success("Proveedor creado exitosamente");
    } catch (error) {
      toast.error("Error al crear proveedor");
      console.error(error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPackingList(true);
      setParseStatus("Subiendo archivo...");

      const formData = new FormData();
      formData.append("file", file);

      setParseStatus("Procesando con IA...");
      const res = await fetch("/api/ai/parse-packing-list", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al procesar archivo");
      }

      const data = await res.json();
      setParseMethod(data.method || "parser");
      setParseStatus(`✅ ${data.totalItems} items detectados`);

      const parsedWithMatches = await Promise.all(
        data.items.map(async (item: any) => {
          let match = null;

          // Strategy 1: Match by exact code (codigoFabricante)
          if (item.codigoFabricante) {
            match = repuestos.find(
              (r) =>
                r.codigo?.toLowerCase() === item.codigoFabricante.toLowerCase() ||
                r.codigoFabricante?.toLowerCase() === item.codigoFabricante.toLowerCase()
            );
          }

          // Strategy 2: If no match by code, try partial code match
          if (!match && item.codigoFabricante) {
            match = repuestos.find(
              (r) =>
                (r.codigo && r.codigo.toLowerCase().includes(item.codigoFabricante.toLowerCase())) ||
                (r.codigoFabricante && r.codigoFabricante.toLowerCase().includes(item.codigoFabricante.toLowerCase()))
            );
          }

          // Strategy 3: If still no match, try by name similarity (only if description is long enough)
          if (!match && item.descripcion && item.descripcion.length > 5) {
            const descLower = item.descripcion.toLowerCase();
            const keywords = descLower.split(/\s+/).filter((w: string) => w.length > 3); // Get significant words

            match = repuestos.find((r) => {
              const nombreLower = r.nombre.toLowerCase();
              // Check if at least 2 keywords match
              const matchingKeywords = keywords.filter((kw: string) => nombreLower.includes(kw));
              return matchingKeywords.length >= 2;
            });
          }

          return {
            ...item,
            repuestoMatch: match || null,
            isNew: !match,
          };
        })
      );

      setParsedItems(parsedWithMatches);
      toast.success(`${data.totalItems} items procesados correctamente`);
    } catch (error: any) {
      setParseStatus("❌ Error al procesar");
      toast.error(error.message || "Error al procesar archivo");
      console.error(error);
    } finally {
      setUploadingPackingList(false);
    }
  };

  const handleConfirmParsedItems = async () => {
    try {
      setUploadingPackingList(true);

      // 1. Obtener proveedor seleccionado para generar códigos
      const proveedor = proveedores.find((p) => p.id === proveedorId);

      // 2. Crear repuestos nuevos automáticamente
      const newItems = await Promise.all(
        parsedItems.map(async (item) => {
          let repuestoId = item.repuestoMatch?.id;
          let repuestoNombre = item.repuestoMatch?.nombre;

          // Si es nuevo, crear el repuesto automáticamente
          if (item.isNew) {
            try {
              // Generar código: {codigoCorto proveedor}-{codigoFabricante} o solo codigoFabricante
              const codigo = proveedor?.codigoCorto
                ? `${proveedor.codigoCorto}-${item.codigoFabricante}`
                : item.codigoFabricante;

              const res = await fetch("/api/repuestos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  nombre: item.descripcion,
                  codigo,
                  codigoFabricante: item.codigoFabricante,
                  categoria: "Importación",
                  proveedorId,
                  activo: true,
                  stock: 0,
                  precioCompra: item.precioFobUnitarioUsd,
                  precioVenta: item.precioFobUnitarioUsd * 2.0, // Markup default 2x
                  pesoUnitarioKg: item.pesoTotalKg / item.cantidad,
                  volumenUnitarioCbm: item.volumenTotalCbm / item.cantidad,
                }),
              });

              if (res.ok) {
                const newRepuesto = await res.json();
                repuestoId = newRepuesto.id;
                repuestoNombre = newRepuesto.nombre;
                toast.success(`✅ Repuesto creado: ${codigo}`);
              } else {
                toast.error(`Error creando repuesto: ${item.codigoFabricante}`);
              }
            } catch (error) {
              console.error("Error creating repuesto:", error);
              toast.error(`Error creando: ${item.codigoFabricante}`);
            }
          }

          return {
            repuestoId: repuestoId || "",
            repuestoNombre: repuestoNombre || item.descripcion,
            cantidad: item.cantidad,
            precioFobUnitarioUsd: item.precioFobUnitarioUsd,
            pesoTotalKg: item.pesoTotalKg || 0,
            volumenTotalCbm: item.volumenTotalCbm || 0,
            codigoFabricante: item.codigoFabricante,
            isNew: false, // Ya no es nuevo si se creó
          };
        })
      );

      setItems([...items, ...newItems]);
      setParsedItems([]);
      toast.success(`${newItems.length} items agregados al embarque`);
    } catch (error) {
      toast.error("Error al procesar items");
      console.error(error);
    } finally {
      setUploadingPackingList(false);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.repuestoId || !currentItem.cantidad || !currentItem.precioFobUnitarioUsd) {
      toast.error("Completa todos los campos del item");
      return;
    }

    const repuesto = repuestos.find((r) => r.id === currentItem.repuestoId);
    setItems([
      ...items,
      {
        ...currentItem,
        repuestoNombre: repuesto?.nombre,
      } as ItemEmbarque,
    ]);

    setCurrentItem({
      cantidad: 1,
      precioFobUnitarioUsd: 0,
      pesoTotalKg: 0,
      volumenTotalCbm: 0,
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    if (step === 1) {
      // Proveedor is now optional
      setStep(2);
    } else if (step === 2) {
      if (uploadingPackingList) {
        toast.error("Espera a que termine el procesamiento");
        return;
      }
      if (parsedItems.length > 0) {
        toast.error("Confirma los items parseados primero");
        return;
      }
      if (items.length === 0) {
        toast.error("Agrega al menos un item");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (fleteUsd <= 0) {
        toast.error("Ingresa el costo de flete");
        return;
      }
      setStep(4);
      await calcularCostos();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const calcularCostos = async () => {
    // This will be implemented with the waterfall chart
    toast.info("Calculando costos...");
    setCostosCalculados({ placeholder: true });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const totalFobUsd = items.reduce(
        (sum, item) => sum + item.cantidad * item.precioFobUnitarioUsd,
        0
      );

      const body = {
        proveedorId,
        metodoFlete,
        fechaSalida: fechaSalida || null,
        fechaLlegadaEstimada: fechaLlegadaEstimada || null,
        numeroContenedor: numeroContenedor || null,
        tipoContenedor: tipoContenedor || null,
        items: items.map((item) => ({
          repuestoId: item.repuestoId,
          cantidad: item.cantidad,
          precioFobUnitarioUsd: item.precioFobUnitarioUsd,
          subtotalFobUsd: item.cantidad * item.precioFobUnitarioUsd,
          pesoTotalKg: item.pesoTotalKg,
          volumenTotalCbm: item.volumenTotalCbm,
          ncmCodigo: item.ncmCodigo,
          arancelPorcentaje: item.arancelPorcentaje,
        })),
        notas,
      };

      const res = await fetch("/api/embarques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error al crear embarque");

      const embarque = await res.json();

      // Update with flete and seguro
      await fetch(`/api/embarques/${embarque.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fleteUsd,
          seguroUsd,
        }),
      });

      toast.success("Embarque creado exitosamente");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("Error al crear embarque");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setProveedorId("");
    setMetodoFlete("MARITIMO_FCL");
    setFechaSalida("");
    setFechaLlegadaEstimada("");
    setNumeroContenedor("");
    setTipoContenedor("");
    setNotas("");
    setItems([]);
    setFleteUsd(0);
    setSeguroUsd(0);
    setCostosCalculados(null);
    setParsedItems([]);
    setShowManualAdd(false);
    setParseMethod(null);
    setParseStatus("");
    setShowProveedorForm(false);
    setNuevoProveedor({ nombre: "", codigoCorto: "" });
  };

  const totalFob = items.reduce((sum, item) => sum + item.cantidad * item.precioFobUnitarioUsd, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto ring-0 focus:ring-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Nuevo Embarque de Importación
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    s === step
                      ? "bg-primary text-primary-foreground font-medium"
                      : s < step
                      ? "bg-primary/20 text-primary font-normal"
                      : "bg-muted text-muted-foreground font-normal"
                  }`}
                >
                  {s}
                </div>
                {s < 4 && <div className="w-6 h-0.5 bg-border" />}
              </div>
            ))}
          </div>
          <DialogDescription className="mt-2">
            {step === 1 && "Información general del embarque"}
            {step === 2 && "Agrega los repuestos a importar"}
            {step === 3 && "Costos de flete y seguro"}
            {step === 4 && "Revisión y confirmación"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Información General */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="proveedor">
                Proveedor <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Select value={proveedorId || undefined} onValueChange={(val) => setProveedorId(val || "")}>
                <SelectTrigger id="proveedor">
                  <SelectValue placeholder="Sin proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!showProveedorForm && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="mt-1 px-0 text-primary"
                  onClick={() => setShowProveedorForm(true)}
                >
                  + Crear nuevo proveedor
                </Button>
              )}
            </div>

            {showProveedorForm && (
              <div className="border border-primary/20 rounded-lg p-4 space-y-3 bg-primary/5">
                <h4 className="font-medium text-sm">Crear Proveedor Rápido</h4>
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={nuevoProveedor.nombre}
                    onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, nombre: e.target.value })}
                    placeholder="China Parts Co."
                  />
                </div>
                <div>
                  <Label>Código Corto (para SKUs)</Label>
                  <Input
                    value={nuevoProveedor.codigoCorto}
                    onChange={(e) =>
                      setNuevoProveedor({ ...nuevoProveedor, codigoCorto: e.target.value })
                    }
                    placeholder="CH01"
                    maxLength={10}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={handleCrearProveedor} size="sm">
                    Crear y Usar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProveedorForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label>Método de Flete</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setMetodoFlete("MARITIMO_FCL")}
                  className={`border rounded-lg p-3 flex flex-col items-center gap-2 transition ${
                    metodoFlete === "MARITIMO_FCL"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Ship className="h-5 w-5" />
                  <span className="text-xs font-medium">Marítimo FCL</span>
                  <span className="text-xs text-muted-foreground">Contenedor completo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoFlete("MARITIMO_LCL")}
                  className={`border rounded-lg p-3 flex flex-col items-center gap-2 transition ${
                    metodoFlete === "MARITIMO_LCL"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Package className="h-5 w-5" />
                  <span className="text-xs font-medium">Marítimo LCL</span>
                  <span className="text-xs text-muted-foreground">Carga consolidada</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoFlete("AEREO")}
                  className={`border rounded-lg p-3 flex flex-col items-center gap-2 transition ${
                    metodoFlete === "AEREO"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-lg">✈️</span>
                  <span className="text-xs font-medium">Aéreo</span>
                  <span className="text-xs text-muted-foreground">Envío rápido</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fechaSalida">Fecha de Salida</Label>
                <Input
                  id="fechaSalida"
                  type="date"
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fechaLlegada">Fecha de Llegada Estimada</Label>
                <Input
                  id="fechaLlegada"
                  type="date"
                  value={fechaLlegadaEstimada}
                  onChange={(e) => setFechaLlegadaEstimada(e.target.value)}
                />
              </div>
            </div>

            {(metodoFlete === "MARITIMO_FCL" || metodoFlete === "MARITIMO_LCL") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contenedor">Número de Contenedor</Label>
                  <Input
                    id="contenedor"
                    value={numeroContenedor}
                    onChange={(e) => setNumeroContenedor(e.target.value)}
                    placeholder="ABCD1234567"
                  />
                </div>
                <div>
                  <Label htmlFor="tipoContenedor">Tipo de Contenedor</Label>
                  <Select value={tipoContenedor} onValueChange={setTipoContenedor}>
                    <SelectTrigger id="tipoContenedor">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20FT">20 FT</SelectItem>
                      <SelectItem value="40FT">40 FT</SelectItem>
                      <SelectItem value="40HQ">40 FT High Cube</SelectItem>
                      <SelectItem value="LCL">LCL (carga suelta)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones, tracking, etc."
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 2: Items */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Opción A: Subir Packing List */}
            <div className="border border-primary/20 rounded-lg p-4 space-y-3 bg-primary/5">
              <h4 className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                📂 Opción A: Subir Packing List (Recomendado)
              </h4>
              <p className="text-xs text-muted-foreground">
                Sube tu Excel/CSV del proveedor. La IA interpretará automáticamente las columnas y hará match con tus repuestos.
              </p>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={uploadingPackingList}
              />
              {uploadingPackingList && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  {parseStatus}
                </div>
              )}
              {parseMethod && parsedItems.length > 0 && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  ✓ Parser Automático
                </Badge>
              )}
            </div>

            {/* Preview de items parseados */}
            {parsedItems.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2">
                  <h4 className="font-medium text-sm">Preview - {parsedItems.length} items detectados</h4>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código Fab.</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">FOB Unit.</TableHead>
                      <TableHead>Match MotoLibre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedItems.slice(0, 10).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{item.codigoFabricante}</TableCell>
                        <TableCell className="text-xs">{item.descripcion}</TableCell>
                        <TableCell className="text-right">{item.cantidad}</TableCell>
                        <TableCell className="text-right">${item.precioFobUnitarioUsd.toFixed(2)}</TableCell>
                        <TableCell>
                          {item.repuestoMatch ? (
                            <Badge variant="outline" className="bg-green-50 text-xs">
                              ✅ {item.repuestoMatch.nombre}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-xs">
                              ⚠️ Nuevo
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedItems.length > 10 && (
                  <div className="px-4 py-2 bg-muted text-xs text-muted-foreground">
                    ... y {parsedItems.length - 10} más
                  </div>
                )}
                <div className="p-4 bg-muted/50">
                  <Button onClick={handleConfirmParsedItems} className="w-full">
                    Confirmar y Agregar {parsedItems.length} Items
                  </Button>
                </div>
              </div>
            )}

            {/* Opción B: Agregar Manual */}
            {!showManualAdd && parsedItems.length === 0 && (
              <div className="text-center py-2">
                <Button variant="outline" size="sm" onClick={() => setShowManualAdd(true)}>
                  O agregar manualmente →
                </Button>
              </div>
            )}

            {showManualAdd && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Agregar Item Manual
                </h4>

                <div>
                  <Label htmlFor="repuesto">Repuesto *</Label>
                  <Select
                    value={currentItem.repuestoId || ""}
                    onValueChange={(value) => setCurrentItem({ ...currentItem, repuestoId: value })}
                  >
                    <SelectTrigger id="repuesto">
                      <SelectValue placeholder="Selecciona un repuesto" />
                    </SelectTrigger>
                    <SelectContent>
                      {repuestos.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cantidad *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={currentItem.cantidad || ""}
                      onChange={(e) =>
                        setCurrentItem({ ...currentItem, cantidad: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Precio FOB Unitario (USD) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentItem.precioFobUnitarioUsd || ""}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          precioFobUnitarioUsd: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Peso Total (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentItem.pesoTotalKg || ""}
                      onChange={(e) =>
                        setCurrentItem({ ...currentItem, pesoTotalKg: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Volumen Total (m³)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={currentItem.volumenTotalCbm || ""}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          volumenTotalCbm: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <Button onClick={handleAddItem} size="sm" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Item
                </Button>
              </div>
            )}

            {/* Lista de items agregados */}
            {items.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2">
                  <h4 className="font-medium text-sm">Items del Embarque ({items.length})</h4>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Repuesto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">FOB Unit. USD</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.repuestoNombre}</TableCell>
                        <TableCell className="text-right">{item.cantidad}</TableCell>
                        <TableCell className="text-right">
                          {item.precioFobUnitarioUsd.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(item.cantidad * item.precioFobUnitarioUsd).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-4 py-3 bg-muted font-medium text-sm flex justify-between">
                  <span>Total FOB:</span>
                  <span>USD {totalFob.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Costos */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Total FOB: USD {totalFob.toFixed(2)}</span>
            </div>

            <div>
              <Label htmlFor="flete">Flete (USD) *</Label>
              <Input
                id="flete"
                type="number"
                step="0.01"
                min="0"
                value={fleteUsd || ""}
                onChange={(e) => setFleteUsd(parseFloat(e.target.value) || 0)}
                placeholder="Ingresa el costo de flete"
              />
            </div>

            <div>
              <Label htmlFor="seguro">Seguro (USD)</Label>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    id="seguro"
                    type="number"
                    step="0.01"
                    min="0"
                    value={seguroUsd || ""}
                    onChange={(e) => {
                      setSeguroUsd(parseFloat(e.target.value) || 0);
                      setAutoCalcularSeguro(false);
                    }}
                    placeholder={autoCalcularSeguro ? "Auto-calculado (1% de FOB+Flete)" : ""}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAutoCalcularSeguro(true);
                    setSeguroUsd((totalFob + fleteUsd) * 0.01);
                  }}
                >
                  Auto
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sugerido: 1% del (FOB + Flete) = USD {((totalFob + fleteUsd) * 0.01).toFixed(2)}
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
              <h4 className="font-medium text-sm">Resumen CIF</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">FOB:</span>
                  <span>USD {totalFob.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Flete:</span>
                  <span>USD {fleteUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seguro:</span>
                  <span>USD {seguroUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>CIF Total:</span>
                  <span>USD {(totalFob + fleteUsd + seguroUsd).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Revisión */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Calculadora de Costos
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                El cálculo detallado se realizará después de crear el embarque.
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Items:</span>
                  <span>{items.length} repuestos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">FOB:</span>
                  <span>USD {totalFob.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Flete:</span>
                  <span>USD {fleteUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seguro:</span>
                  <span>USD {seguroUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>CIF:</span>
                  <span>USD {(totalFob + fleteUsd + seguroUsd).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Una vez creado el embarque, podrás calcular los costos detallados (aranceles,
              impuestos, logística) desde la lista de embarques.
            </p>
          </div>
        )}

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={handleBack} disabled={step === 1 || loading}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Atrás
            </Button>

            {step < 4 ? (
              <Button
                onClick={handleNext}
                disabled={uploadingPackingList || (step === 2 && parsedItems.length > 0)}
              >
                {uploadingPackingList ? "Procesando..." : "Siguiente"}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Creando..." : "Crear Embarque"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
