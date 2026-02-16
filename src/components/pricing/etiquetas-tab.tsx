"use client";

import { useState, useEffect } from "react";
import { Tag, FileDown, Printer, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EmbarqueItem = {
  id: string;
  embarque: {
    referencia: string;
    proveedor: { nombre: string } | null;
  };
  repuesto: {
    codigo: string;
    nombre: string;
  } | null;
  cantidad: number;
};

export function EtiquetasTab() {
  const [embarques, setEmbarques] = useState<any[]>([]);
  const [selectedEmbarque, setSelectedEmbarque] = useState<string>("");
  const [tipoEtiqueta, setTipoEtiqueta] = useState<"individual" | "bulto" | "master">("bulto");
  const [isLoading, setIsLoading] = useState(true);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    fetchEmbarques();
  }, []);

  const fetchEmbarques = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/embarques");
      if (!res.ok) throw new Error("Error fetching embarques");
      const data = await res.json();
      const allEmbarques = data.data || data.embarques || [];
      setEmbarques(allEmbarques);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar embarques");
      setEmbarques([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerarEtiquetas = async () => {
    if (!selectedEmbarque) {
      toast.error("Selecciona un embarque");
      return;
    }

    const embarque = embarques.find((e) => e.id === selectedEmbarque);
    if (!embarque) {
      toast.error("Embarque no encontrado");
      return;
    }

    // Calculate total for large batch warning
    let totalLabels = 0;
    if (tipoEtiqueta === "individual") {
      totalLabels = embarque.items.reduce((sum: number, item: any) => sum + item.cantidad, 0);
    } else if (tipoEtiqueta === "bulto") {
      totalLabels = embarque.items.length;
    } else {
      totalLabels = 1;
    }

    // Warn for very large batches
    if (totalLabels > 1000) {
      toast.warning(`⚠️ Generando ${totalLabels.toLocaleString()} etiquetas. Esto puede tardar varios minutos.`, {
        duration: 5000,
      });
    }

    setGenerando(true);
    try {

      // Prepare label data based on tipo
      let labelItems: any[] = [];

      if (tipoEtiqueta === "individual") {
        // Generate one label per UNIT (not per bulto)
        labelItems = embarque.items.flatMap((item: any) => {
          const labels = [];
          for (let i = 1; i <= item.cantidad; i++) {
            labels.push({
              id: `${item.id}-unit-${i}`,
              codigo: item.repuesto?.codigo || "N/A",
              nombre: item.repuesto?.nombre || "Item sin nombre",
              cantidad: 1, // Individual unit
              unidad: `${i}/${item.cantidad}`,
              qrUrl: `${window.location.origin}/scan/${item.id}?unit=${i}`,
            });
          }
          return labels;
        });
      } else if (tipoEtiqueta === "bulto") {
        // Generate one label per ItemEmbarque (current behavior)
        labelItems = embarque.items.map((item: any) => ({
          id: item.id,
          codigo: item.repuesto?.codigo || "N/A",
          nombre: item.repuesto?.nombre || "Item sin nombre",
          cantidad: item.cantidad,
          qrUrl: `${window.location.origin}/scan/${item.id}`,
        }));
      } else if (tipoEtiqueta === "master") {
        // Generate ONE label for entire embarque
        labelItems = [
          {
            id: embarque.id,
            codigo: embarque.referencia,
            nombre: `Embarque ${embarque.referencia}`,
            cantidad: embarque.items.reduce((sum: number, item: any) => sum + item.cantidad, 0),
            qrUrl: `${window.location.origin}/admin/importaciones?ref=${embarque.referencia}`,
          },
        ];
      }

      // Generate PDF using the existing generateLabelsPDF function
      const { generateLabelsPDF } = await import("@/lib/generate-labels-pdf");
      const pdfBlob = await generateLabelsPDF(
        labelItems,
        embarque.referencia,
        embarque.proveedor?.nombre || "Proveedor"
      );

      // Download PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `etiquetas-${tipoEtiqueta}-${embarque.referencia}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${labelItems.length} etiqueta(s) generada(s) correctamente`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar etiquetas");
    } finally {
      setGenerando(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generación de Etiquetas</CardTitle>
          <CardDescription>
            Crea e imprime etiquetas individuales, por bulto o master para tus embarques
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Tipos de etiquetas disponibles
            </h4>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <Badge variant="outline" className="shrink-0">Individual</Badge>
                <span>
                  Una etiqueta por cada unidad. Si tienes 100 unidades de un repuesto, se generan 100 etiquetas.
                  Ideal para inventario detallado.
                </span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="shrink-0">Bulto</Badge>
                <span>
                  Una etiqueta por cada línea del embarque (ItemEmbarque). Si tienes 100 unidades, se genera 1 etiqueta
                  que dice "Qty: 100 pcs". Ideal para recepción rápida.
                </span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="shrink-0">Master</Badge>
                <span>
                  Una sola etiqueta para todo el embarque. Muestra el total de unidades. Ideal para contenedores o pallets.
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label>Embarque</Label>
              <Select value={selectedEmbarque} onValueChange={setSelectedEmbarque}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un embarque" />
                </SelectTrigger>
                <SelectContent>
                  {embarques.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.referencia} - {e.proveedor?.nombre} ({e.items?.length || 0} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Etiqueta</Label>
              <RadioGroup
                value={tipoEtiqueta}
                onValueChange={(value: any) => setTipoEtiqueta(value)}
                className="mt-2 space-y-2"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="flex-1 cursor-pointer">
                    <div className="font-medium">Individual</div>
                    <p className="text-xs text-muted-foreground">Una etiqueta por unidad</p>
                  </Label>
                  {selectedEmbarque && (
                    <Badge variant="secondary">
                      {embarques
                        .find((e) => e.id === selectedEmbarque)
                        ?.items.reduce((sum: number, item: any) => sum + item.cantidad, 0) || 0}{" "}
                      etiquetas
                    </Badge>
                  )}
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="bulto" id="bulto" />
                  <Label htmlFor="bulto" className="flex-1 cursor-pointer">
                    <div className="font-medium">Bulto / Línea</div>
                    <p className="text-xs text-muted-foreground">Una etiqueta por SKU</p>
                  </Label>
                  {selectedEmbarque && (
                    <Badge variant="secondary">
                      {embarques.find((e) => e.id === selectedEmbarque)?.items?.length || 0} etiquetas
                    </Badge>
                  )}
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="master" id="master" />
                  <Label htmlFor="master" className="flex-1 cursor-pointer">
                    <div className="font-medium">Master</div>
                    <p className="text-xs text-muted-foreground">Una etiqueta para todo el embarque</p>
                  </Label>
                  <Badge variant="secondary">1 etiqueta</Badge>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerarEtiquetas}
              disabled={!selectedEmbarque || generando}
              className="w-full"
            >
              {generando ? (
                <>Generando PDF...</>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Generar e Imprimir Etiquetas
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
