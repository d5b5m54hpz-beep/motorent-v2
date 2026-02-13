"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Taller = {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  horario: string | null;
  activo: boolean;
  _count: {
    mecanicos: number;
    ordenesTrabajoTaller: number;
  };
};

export default function TalleresPage() {
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTaller, setSelectedTaller] = useState<Taller | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [horario, setHorario] = useState("");

  const fetchTalleres = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/talleres?${params}`);
      if (!res.ok) throw new Error("Error al cargar talleres");

      const json = await res.json();
      setTalleres(json.data || []);
    } catch (error) {
      console.error("Error fetching talleres:", error);
      toast.error("Error al cargar talleres");
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTalleres();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTalleres]);

  const openDialog = (taller?: Taller) => {
    if (taller) {
      setSelectedTaller(taller);
      setNombre(taller.nombre);
      setDireccion(taller.direccion || "");
      setTelefono(taller.telefono || "");
      setEmail(taller.email || "");
      setHorario(taller.horario || "");
    } else {
      setSelectedTaller(null);
      setNombre("");
      setDireccion("");
      setTelefono("");
      setEmail("");
      setHorario("");
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = selectedTaller ? `/api/talleres/${selectedTaller.id}` : "/api/talleres";
      const method = selectedTaller ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          direccion: direccion || undefined,
          telefono: telefono || undefined,
          email: email || undefined,
          horario: horario || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");

      toast.success(selectedTaller ? "Taller actualizado" : "Taller creado");
      setDialogOpen(false);
      fetchTalleres();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (taller: Taller) => {
    if (!confirm(`¿Eliminar taller "${taller.nombre}"?`)) return;

    try {
      const res = await fetch(`/api/talleres/${taller.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al eliminar");

      toast.success("Taller eliminado");
      fetchTalleres();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al eliminar";
      toast.error(message);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Talleres</h1>
            <p className="text-muted-foreground">
              Gestión de talleres y centros de mantenimiento
            </p>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Taller
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Talleres registrados</CardTitle>
                <CardDescription>
                  {talleres.length} taller{talleres.length !== 1 ? "es" : ""} en el sistema
                </CardDescription>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar taller..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Mecánicos</TableHead>
                    <TableHead>OTs Activas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : talleres.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        No hay talleres registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    talleres.map((taller) => (
                      <TableRow key={taller.id}>
                        <TableCell className="font-medium">{taller.nombre}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {taller.direccion || "—"}
                        </TableCell>
                        <TableCell>{taller.telefono || "—"}</TableCell>
                        <TableCell>{taller.email || "—"}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">
                          {taller.horario || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{taller._count.mecanicos}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{taller._count.ordenesTrabajoTaller}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              taller.activo
                                ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {taller.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDialog(taller)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(taller)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTaller ? "Editar taller" : "Nuevo taller"}
            </DialogTitle>
            <DialogDescription>
              {selectedTaller
                ? "Modifica los datos del taller"
                : "Completa los datos del nuevo taller"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Taller Central"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Av. Corrientes 1234, CABA"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: +54 11 1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: taller@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horario">Horario</Label>
              <Textarea
                id="horario"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                placeholder="Ej: Lun-Vie 9-18hs, Sáb 9-13hs"
                rows={2}
              />
            </div>

            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Guardando..." : selectedTaller ? "Guardar cambios" : "Crear taller"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
