"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getColumns } from "./columns";
import { EmpleadoForm } from "./empleado-form";
import { DeleteEmpleadoDialog } from "./delete-empleado-dialog";
import { EmpleadoDetailSheet } from "./empleado-detail-sheet";
import { EmpleadoListItem } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmpleadosPage() {
  const [data, setData] = useState<EmpleadoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("");

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState<EmpleadoListItem | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(estado && { estado }),
      });

      const res = await fetch(`/api/rrhh/empleados?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (error) {
      console.error("Error fetching empleados:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [page, search, estado]);

  const columns = getColumns({
    onEdit: (empleado) => {
      setSelectedEmpleado(empleado);
      setFormOpen(true);
    },
    onDelete: (empleado) => {
      setSelectedEmpleado(empleado);
      setDeleteOpen(true);
    },
    onView: (empleado) => {
      setSelectedEmpleado(empleado);
      setDetailOpen(true);
    },
  });

  const handleSuccess = () => {
    fetchData();
    setSelectedEmpleado(null);
  };

  const handleTabChange = (value: string) => {
    setEstado(value === "todos" ? "" : value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
          <p className="text-muted-foreground">Gestión de personal</p>
        </div>
        <Button
          onClick={() => {
            setSelectedEmpleado(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Empleado
        </Button>
      </div>

      <Tabs value={estado || "todos"} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="ACTIVO">Activos</TabsTrigger>
          <TabsTrigger value="LICENCIA">En Licencia</TabsTrigger>
          <TabsTrigger value="SUSPENDIDO">Suspendidos</TabsTrigger>
          <TabsTrigger value="BAJA">Bajas</TabsTrigger>
        </TabsList>

        <TabsContent value={estado || "todos"} className="space-y-4">
          <DataTable
            columns={columns}
            data={data}
            isLoading={loading}
            searchPlaceholder="Buscar por nombre, apellido, DNI, CUIL, cargo..."
          />
        </TabsContent>
      </Tabs>

      <EmpleadoForm
        empleado={selectedEmpleado}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleSuccess}
      />

      <DeleteEmpleadoDialog
        empleado={selectedEmpleado}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={handleSuccess}
      />

      <EmpleadoDetailSheet
        empleado={selectedEmpleado}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
