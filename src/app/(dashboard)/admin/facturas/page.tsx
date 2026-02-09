"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getColumns } from "./columns";
import { ViewFacturaDialog } from "./view-factura-dialog";
import { ExportButton } from "@/components/import-export/export-button";
import type { Factura } from "./types";

export default function FacturasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  // Filtros
  const tipoActivo = searchParams.get("tipo") || "todos";

  const fetchFacturas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");

      if (tipoActivo !== "todos") {
        params.set("tipo", tipoActivo);
      }

      const res = await fetch(`/api/facturas?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Error al cargar facturas");
      }

      const data = await res.json();
      setFacturas(data.data || []);
    } catch (error) {
      console.error("Error fetching facturas:", error);
      toast.error("Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacturas();
  }, [tipoActivo]);

  const handleViewFactura = (factura: Factura) => {
    setSelectedFactura(factura);
    setViewDialogOpen(true);
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      toast.loading("Generando PDF...");

      const res = await fetch(`/api/facturas/${id}/pdf`);

      if (!res.ok) {
        throw new Error("Error al generar PDF");
      }

      // Obtener el blob del PDF
      const blob = await res.blob();

      // Obtener el nombre del archivo del header Content-Disposition
      const contentDisposition = res.headers.get("Content-Disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : "factura.pdf";

      // Crear URL temporal y descargar
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success("PDF descargado correctamente");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.dismiss();
      toast.error("Error al descargar PDF");
    }
  };

  const handleSendEmail = async (id: string) => {
    setSendingEmail(id);
    try {
      const factura = facturas.find((f) => f.id === id);
      const isResend = factura?.emailEnviado;

      toast.loading(isResend ? "Reenviando factura..." : "Enviando factura...");

      const res = await fetch(`/api/facturas/${id}/enviar`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al enviar email");
      }

      toast.dismiss();
      toast.success(isResend ? "Factura reenviada por email" : "Factura enviada por email");

      // Refrescar la lista para actualizar el estado emailEnviado
      fetchFacturas();
    } catch (error) {
      console.error("Error sending email:", error);
      toast.dismiss();
      const message = error instanceof Error ? error.message : "Error al enviar email";
      toast.error(message);
    } finally {
      setSendingEmail(null);
    }
  };

  const handleTipoChange = (tipo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tipo === "todos") {
      params.delete("tipo");
    } else {
      params.set("tipo", tipo);
    }
    router.push(`/admin/facturas?${params.toString()}`);
  };

  const columns = getColumns({
    onView: handleViewFactura,
    onDownloadPDF: handleDownloadPDF,
    onSendEmail: handleSendEmail,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de facturas generadas automáticamente
          </p>
        </div>
        <ExportButton module="facturas" />
      </div>

      {/* Filtros por Tipo */}
      <div className="flex items-center gap-4">
        <Tabs value={tipoActivo} onValueChange={handleTipoChange}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="A">Tipo A</TabsTrigger>
            <TabsTrigger value="B">Tipo B</TabsTrigger>
            <TabsTrigger value="C">Tipo C</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="ml-auto text-sm text-muted-foreground">
          {facturas.length} factura{facturas.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={facturas}
        searchKey="numero"
        searchPlaceholder="Buscar por número, cliente, patente..."
        emptyMessage="No se encontraron facturas"
        isLoading={loading}
      />

      {/* View Dialog */}
      <ViewFacturaDialog
        factura={selectedFactura}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        onDownloadPDF={handleDownloadPDF}
        onSendEmail={handleSendEmail}
      />
    </div>
  );
}
