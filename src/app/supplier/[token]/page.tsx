"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Ship, Package, CheckCircle2, Download, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import Image from "next/image";

type EmbarqueData = {
  embarque: {
    referencia: string;
    proveedor: string;
    fechaSalida: string | null;
    fechaLlegadaEstimada: string | null;
    numeroContenedor: string | null;
    items: {
      id: string;
      codigo: string;
      nombre: string;
      descripcion: string | null;
      cantidad: number;
      pesoTotalKg: number | null;
      volumenTotalCbm: number | null;
    }[];
  };
  confirmado: boolean;
  confirmadoAt: string | null;
};

export default function SupplierPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EmbarqueData | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/supplier/${token}`);
      if (!res.ok) {
        throw new Error("Invalid or expired token");
      }
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error loading shipment data");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/supplier/${token}/confirmar`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Error confirming shipment");
      }
      await fetchData();
      toast.success("Shipment confirmed successfully!");
    } catch (error) {
      console.error("Error confirming:", error);
      toast.error("Error confirming shipment");
    } finally {
      setConfirming(false);
    }
  };

  const handleDownloadLabels = async () => {
    try {
      const res = await fetch(`/api/supplier/${token}/etiquetas`);
      if (!res.ok) {
        throw new Error("Error generating labels");
      }
      const labelData = await res.json();

      // Dynamic import to avoid SSR issues
      const { generateLabelsPDF } = await import("@/lib/generate-labels-pdf");

      toast.info("Generating PDF...");
      const pdfBlob = await generateLabelsPDF(
        labelData.embarque.items,
        labelData.embarque.referencia,
        labelData.embarque.proveedor
      );

      // Download PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `labels-${labelData.embarque.referencia}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`PDF generated with ${labelData.embarque.items.length} labels!`);
    } catch (error) {
      console.error("Error downloading labels:", error);
      toast.error("Error generating labels");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Ship className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading shipment information...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This link is invalid or has expired. Please contact MotoLibre for assistance.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { embarque, confirmado, confirmadoAt } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="MotoLibre"
                width={120}
                height={35}
                className="h-8 w-auto"
                priority
              />
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                Supplier Portal
              </Badge>
            </div>
            {confirmado && (
              <Badge className="bg-green-100 text-green-700 border-green-300">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Confirmed
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Shipment Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Ship className="h-6 w-6 text-primary" />
                    Shipment {embarque.referencia}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Supplier: {embarque.proveedor}
                  </CardDescription>
                </div>
                <div className="text-right">
                  {embarque.numeroContenedor && (
                    <p className="text-sm font-medium">Container: {embarque.numeroContenedor}</p>
                  )}
                  {embarque.fechaLlegadaEstimada && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      ETA: {new Date(embarque.fechaLlegadaEstimada).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Button
                  onClick={handleDownloadLabels}
                  variant="default"
                  size="lg"
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Labels (PDF)
                </Button>
                {!confirmado && (
                  <Button
                    onClick={handleConfirm}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    disabled={confirming}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {confirming ? "Confirming..." : "Confirm Shipment"}
                  </Button>
                )}
              </div>

              {confirmado && confirmadoAt && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Shipment Confirmed</p>
                      <p className="text-sm text-green-700">
                        Confirmed on {new Date(confirmadoAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Items to Ship ({embarque.items.length})</h3>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part Number</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Weight (kg)</TableHead>
                        <TableHead className="text-right">Volume (cbm)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {embarque.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.nombre}</p>
                              {item.descripcion && (
                                <p className="text-sm text-muted-foreground">{item.descripcion}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{item.cantidad}</TableCell>
                          <TableCell className="text-right">
                            {item.pesoTotalKg?.toFixed(2) || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.volumenTotalCbm?.toFixed(3) || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Download and print the labels PDF</li>
                      <li>Attach labels to each item, box, and master carton as specified</li>
                      <li>Confirm shipment when ready to dispatch</li>
                      <li>Ensure all items are properly packaged and labeled</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2026 MotoLibre. All rights reserved.</p>
            <p className="mt-1">
              For questions or support, please contact:{" "}
              <a href="mailto:support@motolibre.com" className="text-primary hover:underline">
                support@motolibre.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
