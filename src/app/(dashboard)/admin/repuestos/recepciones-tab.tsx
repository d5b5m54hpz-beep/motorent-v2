"use client";

import { useState, useEffect } from "react";
import { Plus, PackageCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Recepcion = {
  id: string;
  numero: string;
  fechaRecepcion: string;
  usuario: { email: string } | null;
  ordenCompra: { numero: string } | null;
  items: Array<unknown>;
};

export function RecepcionesTab() {
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecepciones();
  }, []);

  const fetchRecepciones = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/recepciones?limit=100");
      if (!res.ok) throw new Error("Error fetching recepciones");
      const json = await res.json();
      setRecepciones(json.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar recepciones");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recepciones de Mercadería</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recepciones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recepciones de Mercadería</CardTitle>
          <CardDescription>Registra las recepciones de repuestos</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <PackageCheck className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No hay recepciones registradas</p>
          <Button onClick={() => toast.info("Registrar recepción - Por implementar")}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar primera Recepción
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recepciones de Mercadería</h2>
          <p className="text-muted-foreground">Historial de recepciones de repuestos</p>
        </div>
        <Button onClick={() => toast.info("Registrar recepción - Por implementar")}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Recepción
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>OC</TableHead>
                <TableHead>Recibido por</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recepciones.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-mono font-medium">{rec.numero}</TableCell>
                  <TableCell>
                    {rec.ordenCompra ? (
                      <span className="font-mono">{rec.ordenCompra.numero}</span>
                    ) : (
                      <span className="text-muted-foreground">Directo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rec.usuario?.email || "—"}
                  </TableCell>
                  <TableCell>{rec.items.length} items</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(rec.fechaRecepcion), "dd/MM/yy HH:mm", { locale: es })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
