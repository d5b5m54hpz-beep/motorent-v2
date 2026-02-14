"use client";

import { useState, useEffect } from "react";
import { Users, Plus, RefreshCw, UserPlus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type ListaPrecio = {
  id: string;
  nombre: string;
  codigo: string;
};

type GrupoCliente = {
  id: string;
  nombre: string;
  descripcion: string | null;
  listaPrecioId: string | null;
  listaPrecio?: ListaPrecio | null;
  _count: { miembros: number };
};

type Cliente = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
};

type MiembroGrupo = {
  id: string;
  clienteId: string;
  grupoId: string;
  cliente: Cliente;
};

export function GruposTab() {
  const [grupos, setGrupos] = useState<GrupoCliente[]>([]);
  const [listas, setListas] = useState<ListaPrecio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogNuevo, setDialogNuevo] = useState(false);
  const [sheetMiembros, setSheetMiembros] = useState(false);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<GrupoCliente | null>(null);
  const [miembros, setMiembros] = useState<MiembroGrupo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingMiembros, setLoadingMiembros] = useState(false);

  const [formNuevo, setFormNuevo] = useState({
    nombre: "",
    descripcion: "",
    listaPrecioId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resGrupos, resListas] = await Promise.all([
        fetch("/api/pricing-repuestos/grupos-cliente"),
        fetch("/api/pricing-repuestos/listas"),
      ]);

      if (resGrupos.ok) {
        const dataGrupos = await resGrupos.json();
        setGrupos(dataGrupos);
      }

      if (resListas.ok) {
        const dataListas = await resListas.json();
        setListas(dataListas.data || []);
      }
    } catch (error) {
      toast.error("Error al cargar datos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGrupo = async () => {
    try {
      const payload = {
        nombre: formNuevo.nombre,
        descripcion: formNuevo.descripcion || null,
        listaPrecioId: formNuevo.listaPrecioId || null,
      };

      const res = await fetch("/api/pricing-repuestos/grupos-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      toast.success("Grupo creado exitosamente");
      setDialogNuevo(false);
      fetchData();
      resetForm();
    } catch (error) {
      toast.error("Error al crear grupo");
      console.error(error);
    }
  };

  const handleOpenMiembros = async (grupo: GrupoCliente) => {
    setGrupoSeleccionado(grupo);
    setSheetMiembros(true);
    await fetchMiembros(grupo.id);
    await fetchClientes();
  };

  const fetchMiembros = async (grupoId: string) => {
    try {
      setLoadingMiembros(true);
      const res = await fetch(`/api/pricing-repuestos/grupos-cliente/${grupoId}/miembros`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMiembros(data);
    } catch (error) {
      toast.error("Error al cargar miembros");
      console.error(error);
    } finally {
      setLoadingMiembros(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const res = await fetch("/api/clientes?limit=100");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClientes(data.data || []);
    } catch (error) {
      console.error("Error fetching clientes:", error);
    }
  };

  const handleAddMiembro = async (clienteId: string) => {
    if (!grupoSeleccionado) return;

    try {
      const res = await fetch(`/api/pricing-repuestos/grupos-cliente/${grupoSeleccionado.id}/miembros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId }),
      });

      if (!res.ok) throw new Error();

      toast.success("Cliente agregado al grupo");
      await fetchMiembros(grupoSeleccionado.id);
      fetchData();
    } catch (error) {
      toast.error("Error al agregar miembro");
      console.error(error);
    }
  };

  const handleRemoveMiembro = async (miembroId: string) => {
    if (!grupoSeleccionado) return;

    try {
      const res = await fetch(`/api/pricing-repuestos/grupos-cliente/${grupoSeleccionado.id}/miembros/${miembroId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast.success("Cliente removido del grupo");
      await fetchMiembros(grupoSeleccionado.id);
      fetchData();
    } catch (error) {
      toast.error("Error al remover miembro");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormNuevo({
      nombre: "",
      descripcion: "",
      listaPrecioId: "",
    });
  };

  const clientesDisponibles = clientes.filter(
    (c) => !miembros.some((m) => m.clienteId === c.id)
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Grupos de Clientes
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Asigna listas de precios especiales a grupos de clientes
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Recargar
              </Button>
              <Button onClick={() => setDialogNuevo(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Grupo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Lista de Precios</TableHead>
                    <TableHead className="text-center">Miembros</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupos.map((grupo) => (
                    <TableRow key={grupo.id}>
                      <TableCell className="font-medium">{grupo.nombre}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {grupo.descripcion || "-"}
                      </TableCell>
                      <TableCell>
                        {grupo.listaPrecio ? (
                          <Badge variant="outline">{grupo.listaPrecio.nombre}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin asignar</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{grupo._count.miembros}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenMiembros(grupo)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Gestionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Nuevo Grupo */}
      <Dialog open={dialogNuevo} onOpenChange={(open) => { setDialogNuevo(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Grupo de Clientes</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre-grupo">Nombre del Grupo</Label>
              <Input
                id="nombre-grupo"
                value={formNuevo.nombre}
                onChange={(e) => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
                placeholder="ej: Clientes Corporativos"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descripcion-grupo">Descripción</Label>
              <Input
                id="descripcion-grupo"
                value={formNuevo.descripcion}
                onChange={(e) => setFormNuevo({ ...formNuevo, descripcion: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lista-precio">Lista de Precios</Label>
              <Select
                value={formNuevo.listaPrecioId || undefined}
                onValueChange={(val) => setFormNuevo({ ...formNuevo, listaPrecioId: val || "" })}
              >
                <SelectTrigger id="lista-precio">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  {listas.map((lista) => (
                    <SelectItem key={lista.id} value={lista.id}>
                      {lista.nombre} ({lista.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNuevo(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGrupo}>Crear Grupo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet Miembros */}
      <Sheet open={sheetMiembros} onOpenChange={setSheetMiembros}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Miembros del Grupo: {grupoSeleccionado?.nombre}</SheetTitle>
            <SheetDescription>
              {grupoSeleccionado?.listaPrecio && (
                <span>
                  Lista asignada: <Badge variant="outline">{grupoSeleccionado.listaPrecio.nombre}</Badge>
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Agregar Cliente */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Agregar Cliente al Grupo</h3>
              {clientesDisponibles.length > 0 ? (
                <Select onValueChange={handleAddMiembro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesDisponibles.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre} {cliente.email && `(${cliente.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">Todos los clientes ya están en este grupo</p>
              )}
            </div>

            {/* Lista de Miembros */}
            <div>
              <h3 className="font-medium mb-3">
                Miembros actuales ({miembros.length})
              </h3>
              {loadingMiembros ? (
                <div className="text-center py-8 text-muted-foreground">Cargando miembros...</div>
              ) : miembros.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  No hay miembros en este grupo
                </div>
              ) : (
                <div className="space-y-2">
                  {miembros.map((miembro) => (
                    <div
                      key={miembro.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{miembro.cliente.nombre}</div>
                        {miembro.cliente.email && (
                          <div className="text-sm text-muted-foreground">{miembro.cliente.email}</div>
                        )}
                        {miembro.cliente.telefono && (
                          <div className="text-xs text-muted-foreground">{miembro.cliente.telefono}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMiembro(miembro.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
