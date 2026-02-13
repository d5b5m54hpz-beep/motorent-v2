"use client";

import { useState, useEffect } from "react";
import { Ship, Plus, Search, Filter, Eye, Calculator, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CrearEmbarqueWizard } from "./crear-embarque-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

type Embarque = {
  id: string;
  referencia: string;
  estado: string;
  totalFobUsd: number;
  fleteUsd: number;
  seguroUsd: number | null;
  cifUsd: number | null;
  fechaSalida: string | null;
  fechaLlegadaEstimada: string | null;
  fechaLlegadaReal: string | null;
  proveedor: {
    id: string;
    nombre: string;
  };
  items: Array<{
    id: string;
    cantidad: number;
    repuesto: {
      nombre: string;
    };
  }>;
  _count?: {
    items: number;
  };
};

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-500",
  EN_TRANSITO: "bg-blue-500",
  EN_ADUANA: "bg-yellow-500",
  COSTO_FINALIZADO: "bg-green-500",
  RECIBIDO: "bg-teal-500",
};

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  EN_TRANSITO: "En Tránsito",
  EN_ADUANA: "En Aduana",
  COSTO_FINALIZADO: "Costo Finalizado",
  RECIBIDO: "Recibido",
};

export function EmbarquesTab() {
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [crearDialogOpen, setCrearDialogOpen] = useState(false);

  useEffect(() => {
    fetchEmbarques();
  }, [estadoFilter]);

  const fetchEmbarques = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "50" });
      if (estadoFilter !== "all") params.append("estado", estadoFilter);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/embarques?${params}`);
      if (!res.ok) throw new Error("Error al cargar embarques");
      const data = await res.json();
      setEmbarques(data.data || []);
    } catch (error) {
      toast.error("Error al cargar embarques");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchEmbarques();
  };

  const handleChangeEstado = async (id: string, estado: string) => {
    try {
      const res = await fetch(`/api/embarques/${id}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error("Error al cambiar estado");
      toast.success("Estado actualizado");
      fetchEmbarques();
    } catch (error) {
      toast.error("Error al cambiar estado");
      console.error(error);
    }
  };

  const filteredEmbarques = embarques.filter((e) =>
    e.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredEmbarques.reduce((sum, e) => sum + (e.items?.length || 0), 0);
  const totalFob = filteredEmbarques.reduce((sum, e) => sum + e.totalFobUsd, 0);
  const enTransito = filteredEmbarques.filter((e) => e.estado === "EN_TRANSITO").length;
  const enAduana = filteredEmbarques.filter((e) => e.estado === "EN_ADUANA").length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Embarques</CardTitle>
            <Ship className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEmbarques.length}</div>
            <p className="text-xs text-muted-foreground">{totalItems} items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Tránsito</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enTransito}</div>
            <p className="text-xs text-muted-foreground">embarques activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Aduana</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enAduana}</div>
            <p className="text-xs text-muted-foreground">pendientes despacho</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total FOB</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">USD {totalFob.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">suma FOB</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Embarques de Importación</CardTitle>
              <CardDescription>Gestiona los embarques y calcula costos landed</CardDescription>
            </div>
            <Button onClick={() => setCrearDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Embarque
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Buscar por referencia o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="max-w-sm"
              />
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="EN_TRANSITO">En Tránsito</SelectItem>
                <SelectItem value="EN_ADUANA">En Aduana</SelectItem>
                <SelectItem value="COSTO_FINALIZADO">Costo Finalizado</SelectItem>
                <SelectItem value="RECIBIDO">Recibido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filteredEmbarques.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay embarques registrados. Crea tu primer embarque.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">FOB USD</TableHead>
                  <TableHead className="text-right">CIF USD</TableHead>
                  <TableHead>Fecha Salida</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmbarques.map((embarque) => (
                  <TableRow key={embarque.id}>
                    <TableCell className="font-medium">{embarque.referencia}</TableCell>
                    <TableCell>{embarque.proveedor.nombre}</TableCell>
                    <TableCell>
                      <Badge className={ESTADO_COLORS[embarque.estado]}>
                        {ESTADO_LABELS[embarque.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{embarque.items?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      {embarque.totalFobUsd.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {embarque.cifUsd
                        ? embarque.cifUsd.toLocaleString("es-AR", { minimumFractionDigits: 2 })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {embarque.fechaSalida
                        ? new Date(embarque.fechaSalida).toLocaleDateString("es-AR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {embarque.fechaLlegadaEstimada
                        ? new Date(embarque.fechaLlegadaEstimada).toLocaleDateString("es-AR")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalle
                          </DropdownMenuItem>
                          {embarque.estado === "BORRADOR" && (
                            <>
                              <DropdownMenuItem>Editar</DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleChangeEstado(embarque.id, "EN_TRANSITO")}
                              >
                                Marcar En Tránsito
                              </DropdownMenuItem>
                            </>
                          )}
                          {embarque.estado === "EN_TRANSITO" && (
                            <DropdownMenuItem
                              onClick={() => handleChangeEstado(embarque.id, "EN_ADUANA")}
                            >
                              Marcar En Aduana
                            </DropdownMenuItem>
                          )}
                          {embarque.estado === "EN_ADUANA" && (
                            <>
                              <DropdownMenuItem>
                                <Calculator className="mr-2 h-4 w-4" />
                                Calcular Costos
                              </DropdownMenuItem>
                              <DropdownMenuItem>Registrar Despacho</DropdownMenuItem>
                            </>
                          )}
                          {embarque.estado === "COSTO_FINALIZADO" && (
                            <DropdownMenuItem>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Confirmar Recepción
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Wizard Dialog */}
      <CrearEmbarqueWizard
        open={crearDialogOpen}
        onOpenChange={setCrearDialogOpen}
        onSuccess={fetchEmbarques}
      />
    </div>
  );
}
