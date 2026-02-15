"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Package, Ship, MapPin, CheckCircle2, Info, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";

type ScanData = {
  tipo: "REPUESTO" | "ITEM_EMBARQUE" | "ETIQUETA";
  repuesto?: {
    codigo: string;
    nombre: string;
    descripcion: string | null;
    stock: number;
    ubicacion: string | null;
  };
  embarque?: {
    referencia: string;
    estado: string;
    proveedor: string;
  };
  ubicacion?: string;
  autenticado: boolean;
  detalles?: Record<string, unknown>;
};

export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ScanData | null>(null);

  useEffect(() => {
    fetchScanData();
  }, [id]);

  const fetchScanData = async () => {
    try {
      const res = await fetch(`/api/scan/${id}`);
      if (!res.ok) {
        throw new Error("Invalid scan code");
      }
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Error fetching scan data:", error);
      toast.error("Código de escaneo inválido");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando código...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Código Inválido</CardTitle>
            <CardDescription>
              Este código no es válido o ha expirado. Por favor, contacte a MotoLibre.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Verificado
              </Badge>
            </div>
            {!data.autenticado && (
              <Button variant="outline" size="sm" onClick={() => router.push("/login-admin")}>
                <LogIn className="mr-2 h-4 w-4" />
                Iniciar Sesión
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Product Info Card */}
          {data.repuesto && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>{data.repuesto.nombre}</CardTitle>
                    <CardDescription className="font-mono">{data.repuesto.codigo}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {data.repuesto.descripcion && (
                  <p className="text-sm text-muted-foreground mb-4">{data.repuesto.descripcion}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {data.autenticado && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Stock Disponible</p>
                        <p className="text-2xl font-bold">{data.repuesto.stock}</p>
                      </div>
                      {data.repuesto.ubicacion && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Ubicación
                          </p>
                          <p className="text-lg font-mono font-semibold">{data.repuesto.ubicacion}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shipment Info Card */}
          {data.embarque && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Ship className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Embarque {data.embarque.referencia}</CardTitle>
                    <CardDescription>{data.embarque.proveedor}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <Badge className="mt-1">{data.embarque.estado}</Badge>
                  </div>

                  {data.autenticado && (
                    <div className="pt-4 border-t">
                      <Button
                        onClick={() => router.push(`/admin/importaciones`)}
                        className="w-full"
                      >
                        Ver Detalles del Embarque
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info for non-authenticated users */}
          {!data.autenticado && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Producto MotoLibre Verificado</p>
                    <p>
                      Este es un producto auténtico de MotoLibre. Para ver información completa
                      de inventario y ubicación, inicie sesión como empleado.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 inset-x-0 border-t bg-white py-4">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2026 MotoLibre. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
