"use client";

import { useState, useEffect } from "react";
import { Link2, Copy, ExternalLink, CheckCircle, Clock, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TokenData = {
  id: string;
  token: string;
  embarque: {
    id: string;
    referencia: string;
    proveedor: { nombre: string } | null;
    estado: string;
  };
  activo: boolean;
  vistoPor: string | null;
  vistoAt: string | null;
  confirmado: boolean;
  confirmadoAt: string | null;
  createdAt: string;
};

export function PortalProveedorTab() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    setIsLoading(true);
    try {
      // This would need a new API endpoint to fetch all tokens
      // For now, we'll show a message to create the endpoint
      setTokens([]);
      toast.info("Endpoint /api/portal-tokens pendiente de implementación");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar tokens");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/supplier/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado al portapapeles");
  };

  const openInNewTab = (token: string) => {
    const url = `${window.location.origin}/supplier/${token}`;
    window.open(url, "_blank");
  };

  const filteredTokens = tokens.filter((t) =>
    t.embarque.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.embarque.proveedor?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Portal de Proveedores</CardTitle>
          <CardDescription>
            Links públicos para que proveedores confirmen embarques y descarguen etiquetas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">¿Cómo funciona?</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Desde la tabla de embarques, haz click en "Generar Link Proveedor"</li>
              <li>Se crea un token único de acceso público (sin login requerido)</li>
              <li>Envía el link al proveedor por email o WhatsApp</li>
              <li>El proveedor puede ver los items, confirmar el embarque y descargar etiquetas PDF</li>
              <li>Aquí puedes ver el historial de accesos y confirmaciones</li>
            </ul>
          </div>

          {filteredTokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No hay tokens generados aún</p>
              <p className="text-sm mt-1">
                Ve a la tabla de Embarques y genera un link para comenzar
              </p>
            </div>
          ) : (
            <>
              <Input
                placeholder="Buscar por referencia o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Embarque</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Visto</TableHead>
                    <TableHead>Confirmado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">{token.embarque.referencia}</TableCell>
                      <TableCell>{token.embarque.proveedor?.nombre || "Sin proveedor"}</TableCell>
                      <TableCell>
                        {token.activo ? (
                          <Badge variant="default">Activo</Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {token.vistoAt ? (
                          <div className="flex items-center gap-1 text-green-600 text-sm">
                            <Eye className="h-3 w-3" />
                            {new Date(token.vistoAt).toLocaleDateString("es-AR")}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Clock className="h-3 w-3" />
                            No visto
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {token.confirmado ? (
                          <div className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="h-3 w-3" />
                            {token.confirmadoAt ? new Date(token.confirmadoAt).toLocaleDateString("es-AR") : "Sí"}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Pendiente</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(token.token)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openInNewTab(token.token)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
