"use client";

import { useState, useEffect } from "react";
import { Plus, MapPin, Package, QrCode } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

type UbicacionMapa = {
  estante: string;
  nombre: string | null;
  filas: Array<{
    fila: string;
    posiciones: Array<{
      codigo: string;
      nombre: string | null;
      cantidadRepuestos: number;
      repuestos: Array<{ nombre: string; stock: number }>;
    }>;
  }>;
};

export function UbicacionesTab() {
  const [mapa, setMapa] = useState<UbicacionMapa[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMapa();
  }, []);

  const fetchMapa = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ubicaciones-deposito/mapa");
      if (!res.ok) throw new Error("Error fetching mapa");
      const json = await res.json();
      setMapa(json);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar mapa de ubicaciones");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ubicaciones de Depósito</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mapa.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ubicaciones de Depósito</CardTitle>
          <CardDescription>Organiza el depósito con estantes, filas y posiciones</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No hay ubicaciones configuradas</p>
          <Button onClick={() => toast.info("Crear estante - Por implementar")}>
            <Plus className="mr-2 h-4 w-4" />
            Crear primer Estante
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ubicaciones de Depósito</h2>
          <p className="text-muted-foreground">Mapa visual del depósito</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("Imprimir etiquetas - Por implementar")}>
            <QrCode className="mr-2 h-4 w-4" />
            Imprimir Etiquetas
          </Button>
          <Button onClick={() => toast.info("Crear estante - Por implementar")}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Estante
          </Button>
        </div>
      </div>

      {mapa.map((estante) => (
        <Card key={estante.estante}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Estante {estante.estante}
              {estante.nombre && (
                <span className="text-muted-foreground font-normal text-base">
                  — {estante.nombre}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {estante.filas.map((fila) => (
                <div key={fila.fila}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground w-12">
                      Fila {fila.fila}
                    </span>
                    <div className="flex-1 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {fila.posiciones.map((pos) => {
                        const hasRepuestos = pos.cantidadRepuestos > 0;
                        return (
                          <Popover key={pos.codigo}>
                            <PopoverTrigger asChild>
                              <button
                                className={`p-3 rounded-lg border text-center transition-colors ${
                                  hasRepuestos
                                    ? "bg-cyan-50 border-cyan-200 hover:bg-cyan-100"
                                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                }`}
                              >
                                <div className="text-xs font-mono font-medium mb-1">
                                  {pos.codigo}
                                </div>
                                {hasRepuestos && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    <Package className="h-2.5 w-2.5 mr-0.5" />
                                    {pos.cantidadRepuestos}
                                  </Badge>
                                )}
                              </button>
                            </PopoverTrigger>
                            {hasRepuestos && (
                              <PopoverContent className="w-64" align="start">
                                <div className="space-y-2">
                                  <div className="font-medium text-sm border-b pb-2">
                                    {pos.codigo}
                                    {pos.nombre && (
                                      <span className="text-muted-foreground ml-1">
                                        — {pos.nombre}
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    {pos.repuestos.map((rep, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between text-sm py-1"
                                      >
                                        <span className="text-sm">{rep.nombre}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {rep.stock}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            )}
                          </Popover>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
