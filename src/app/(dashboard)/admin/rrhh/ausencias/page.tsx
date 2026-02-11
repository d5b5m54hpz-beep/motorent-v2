"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { getColumns } from "./columns";
import { AusenciaForm } from "./ausencia-form";
import { DeleteAusenciaDialog } from "./delete-ausencia-dialog";
import type { Ausencia, AusenciaFormData } from "./types";

export default function AusenciasPage() {
  const [data, setData] = useState<Ausencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAusencia, setSelectedAusencia] = useState<Ausencia | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/rrhh/ausencias?limit=100");
      if (!res.ok) throw new Error("Failed to fetch");

      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (error) {
      console.error("Error fetching ausencias:", error);
      setData([]);
      toast.error("Error al cargar ausencias");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (formData: AusenciaFormData) => {
    setIsSubmitting(true);
    try {
      const url = selectedAusencia ? `/api/rrhh/ausencias/${selectedAusencia.id}` : "/api/rrhh/ausencias";
      const method = selectedAusencia ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");

      toast.success(selectedAusencia ? "Ausencia actualizada" : "Ausencia registrada");
      setFormOpen(false);
      setSelectedAusencia(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAusencia) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/rrhh/ausencias/${selectedAusencia.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al eliminar");

      toast.success("Ausencia eliminada");
      setDeleteOpen(false);
      setSelectedAusencia(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getColumns({
    onEdit: (ausencia) => {
      setSelectedAusencia(ausencia);
      setFormOpen(true);
    },
    onDelete: (ausencia) => {
      setSelectedAusencia(ausencia);
      setDeleteOpen(true);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ausencias</h1>
          <p className="text-muted-foreground">Gestión de ausencias y licencias</p>
        </div>
        <Button
          onClick={() => {
            setSelectedAusencia(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Ausencia
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        searchPlaceholder="Buscar por empleado..."
      />

      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setSelectedAusencia(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAusencia ? "Editar ausencia" : "Nueva ausencia"}</DialogTitle>
            <DialogDescription>
              {selectedAusencia ? "Modificá los datos de la ausencia" : "Completá los datos para registrar una ausencia"}
            </DialogDescription>
          </DialogHeader>
          <AusenciaForm
            key={selectedAusencia?.id ?? "new"}
            ausencia={selectedAusencia}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <DeleteAusenciaDialog
        ausencia={selectedAusencia}
        open={deleteOpen}
        onOpenChange={(open) => { setDeleteOpen(open); if (!open) setSelectedAusencia(null); }}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
      />
    </div>
  );
}
