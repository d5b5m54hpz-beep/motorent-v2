"use client";

import { useState, useEffect } from "react";
import { PackageCheck, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RecepcionMercaderiaSheet } from "@/components/embarques/recepcion-mercaderia-sheet";

type EmbarqueRecepcion = {
  id: string;
  referencia: string;
  proveedor: { nombre: string } | null;
  estado: string;
  items: Array<{
    id: string;
    cantidad: number;
    repuesto: { codigo: string; nombre: string } | null;
  }>;
  createdAt: string;
};

export function RecepcionesTab() {
  const [embarques, setEmbarques] = useState<EmbarqueRecepcion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmbarque, setSelectedEmbarque] = useState<EmbarqueRecepcion | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetchEmbarques();
  }, []);

  const fetchEmbarques = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/embarques");
      if (!res.ok) throw new Error("Error fetching embarques");
      const json = await res.json();

      // Filter embarques that need reception
      const allEmbarques = json.data || json.embarques || [];
      const pendientes = allEmbarques.filter((e: any) =>
        ["EN_PUERTO", "EN_ADUANA", "DESPACHADO_PARCIAL", "EN_RECEPCION"].includes(e.estado)
      );

      setEmbarques(pendientes);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar embarques para recepción");
      setEmbarques([]); // Set empty array on error to prevent undefined
    } finally {
      setIsLoading(false);
    }
  };

  const handleIniciarRecepcion = (embarque: EmbarqueRecepcion) => {
    setSelectedEmbarque(embarque);
    setSheetOpen(true);
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: any }> = {
      EN_PUERTO: { variant: "secondary", label: "En Puerto", icon: Clock },
      EN_ADUANA: { variant: "outline", label: "En Aduana", icon: AlertTriangle },
      DESPACHADO_PARCIAL: { variant: "default", label: "Despachado", icon: CheckCircle },
      EN_RECEPCION: { variant: "default", label: "En Recepción", icon: PackageCheck },
    };

    const config = variants[estado] || { variant: "secondary", label: estado, icon: PackageCheck };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (embarques.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <PackageCheck className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay embarques pendientes de recepción</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Los embarques en estado EN_PUERTO, EN_ADUANA, DESPACHADO_PARCIAL o EN_RECEPCION aparecerán aquí
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Embarques Pendientes de Recepción</CardTitle>
          <CardDescription>
            {embarques.length} embarque{embarques.length !== 1 ? "s" : ""} esperando procesamiento
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {embarques.map((embarque) => (
          <Card key={embarque.id} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{embarque.referencia}</CardTitle>
                    {getEstadoBadge(embarque.estado)}
                  </div>
                  <CardDescription>
                    Proveedor: <span className="font-medium">{embarque.proveedor?.nombre || "Sin proveedor"}</span>
                  </CardDescription>
                </div>
                <Button onClick={() => handleIniciarRecepcion(embarque)}>
                  <PackageCheck className="mr-2 h-4 w-4" />
                  Iniciar Recepción
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <PackageCheck className="h-4 w-4" />
                  <span>{embarque.items.length} items</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Creado: {new Date(embarque.createdAt).toLocaleDateString("es-AR")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedEmbarque && (
        <RecepcionMercaderiaSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          embarqueId={selectedEmbarque.id}
          embarqueReferencia={selectedEmbarque.referencia}
          onRecepcionFinalizada={() => {
            fetchEmbarques();
            setSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}
