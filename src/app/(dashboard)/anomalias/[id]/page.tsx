"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SeveridadBadge } from "@/components/anomalias/SeveridadBadge";
import { EstadoBadge } from "@/components/anomalias/EstadoBadge";
import { AnalisisDataCard } from "@/components/anomalias/AnalisisDataCard";
import {
  ArrowLeft,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  Zap,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";

type AnomaliaDetail = {
  id: string;
  tipo: string;
  severidad: string;
  titulo: string;
  descripcion: string;
  entidadTipo: string | null;
  entidadId: string | null;
  montoInvolucrado: string | number | null;
  datosAnalisis: Record<string, unknown> | null;
  estado: string;
  resueltaPor: string | null;
  resolucion: string | null;
  autoDetectada: boolean;
  createdAt: string;
  updatedAt: string;
};

const TIPO_LABELS: Record<string, string> = {
  GASTO_INUSUAL: "Gasto Inusual",
  PAGO_DUPLICADO: "Pago Duplicado",
  FACTURA_SIN_PAGO: "Factura Sin Pago",
  MARGEN_BAJO: "Margen Bajo",
  STOCK_CRITICO: "Stock Critico",
  PATRON_SOSPECHOSO: "Patron Sospechoso",
  DESVIO_PRESUPUESTO: "Desvio Presupuesto",
  CONCILIACION_PENDIENTE: "Conciliacion Pendiente",
  VENCIMIENTO_PROXIMO: "Vencimiento Proximo",
  FLUJO_CAJA_NEGATIVO: "Flujo Caja Negativo",
};

const ENTITY_ROUTES: Record<string, string> = {
  Pago: "/admin/pagos",
  Gasto: "/admin/gastos",
  Factura: "/admin/facturas",
  Moto: "/admin/motos",
  Repuesto: "/admin/repuestos",
  Cliente: "/admin/clientes",
  Contrato: "/admin/contratos",
};

export default function AnomaliaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const anomaliaId = params.id as string;

  const [anomalia, setAnomalia] = useState<AnomaliaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Action states
  const [reviewLoading, setReviewLoading] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveText, setResolveText] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardText, setDiscardText] = useState("");
  const [discardLoading, setDiscardLoading] = useState(false);

  const fetchAnomalia = useCallback(async () => {
    try {
      const res = await fetch(`/api/anomalias/${anomaliaId}`);
      if (res.ok) {
        setAnomalia(await res.json());
      } else if (res.status === 404) {
        toast.error("Anomalia no encontrada");
        router.push("/anomalias");
      }
    } catch {
      toast.error("Error al cargar anomalia");
    } finally {
      setLoading(false);
    }
  }, [anomaliaId, router]);

  useEffect(() => {
    fetchAnomalia();
  }, [fetchAnomalia]);

  // Take in review
  const handleReview = async () => {
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/anomalias/${anomaliaId}`, { method: "PUT" });
      if (res.ok) {
        toast.success("Anomalia tomada en revision");
        fetchAnomalia();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error");
      }
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setReviewLoading(false);
    }
  };

  // Resolve
  const handleResolve = async () => {
    if (!resolveText.trim()) return;
    setResolveLoading(true);
    try {
      const res = await fetch(`/api/anomalias/${anomaliaId}/resolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolucion: resolveText.trim() }),
      });
      if (res.ok) {
        toast.success("Anomalia resuelta");
        setResolveOpen(false);
        setResolveText("");
        fetchAnomalia();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error");
      }
    } catch {
      toast.error("Error al resolver");
    } finally {
      setResolveLoading(false);
    }
  };

  // Discard
  const handleDiscard = async () => {
    if (!discardText.trim()) return;
    setDiscardLoading(true);
    try {
      const res = await fetch(`/api/anomalias/${anomaliaId}/descartar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: discardText.trim() }),
      });
      if (res.ok) {
        toast.success("Anomalia descartada");
        setDiscardOpen(false);
        setDiscardText("");
        fetchAnomalia();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error");
      }
    } catch {
      toast.error("Error al descartar");
    } finally {
      setDiscardLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!anomalia) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Anomalia no encontrada</p>
        <Link href="/anomalias">
          <Button variant="outline" className="mt-4">Volver</Button>
        </Link>
      </div>
    );
  }

  const monto = anomalia.montoInvolucrado ? Number(anomalia.montoInvolucrado) : null;
  const entityRoute = anomalia.entidadTipo ? ENTITY_ROUTES[anomalia.entidadTipo] : null;
  const isActionable = anomalia.estado === "NUEVA" || anomalia.estado === "EN_REVISION";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/anomalias">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <SeveridadBadge severidad={anomalia.severidad} className="text-sm px-3 py-1" />
            <EstadoBadge estado={anomalia.estado} />
            <Badge variant="outline" className="text-xs">
              {TIPO_LABELS[anomalia.tipo] || anomalia.tipo}
            </Badge>
            {anomalia.autoDetectada && (
              <Badge variant="secondary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Auto-detectada
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-bold">{anomalia.titulo}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3.5 w-3.5" />
            Detectada: {new Date(anomalia.createdAt).toLocaleString("es-AR")}
          </p>
        </div>

        {/* Action buttons */}
        {isActionable && (
          <div className="flex gap-2">
            {anomalia.estado === "NUEVA" && (
              <Button
                variant="outline"
                onClick={handleReview}
                disabled={reviewLoading}
              >
                {reviewLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-1" />
                )}
                Tomar en Revision
              </Button>
            )}
            {anomalia.estado === "EN_REVISION" && (
              <Button onClick={() => setResolveOpen(true)}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Resolver
              </Button>
            )}
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDiscardOpen(true)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Descartar
            </Button>
          </div>
        )}
      </div>

      {/* Monto + Entity */}
      <div className="flex flex-wrap gap-4">
        {monto !== null && (
          <Card className="flex-1 min-w-[200px]">
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Monto Involucrado</p>
                <p className="text-2xl font-bold">{formatMoney(monto)}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {anomalia.entidadTipo && anomalia.entidadId && (
          <Card className="flex-1 min-w-[200px]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entidad Relacionada</p>
                <p className="text-sm font-medium">
                  {anomalia.entidadTipo} #{anomalia.entidadId.slice(0, 8)}
                </p>
              </div>
              {entityRoute && (
                <Link href={entityRoute}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Ver
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Description */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Descripcion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{anomalia.descripcion}</p>
        </CardContent>
      </Card>

      {/* Analysis Data */}
      <AnalisisDataCard tipo={anomalia.tipo} datosAnalisis={anomalia.datosAnalisis} />

      {/* Resolution info (if resolved or discarded) */}
      {(anomalia.estado === "RESUELTA" || anomalia.estado === "DESCARTADA") && anomalia.resolucion && (
        <>
          <Separator />
          <Card className={anomalia.estado === "RESUELTA" ? "border-green-200 dark:border-green-800" : "border-gray-200"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {anomalia.estado === "RESUELTA" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-500" />
                )}
                {anomalia.estado === "RESUELTA" ? "Resolucion" : "Motivo de Descarte"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{anomalia.resolucion}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Actualizado: {new Date(anomalia.updatedAt).toLocaleString("es-AR")}
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Timeline */}
      <Separator />
      <div>
        <h3 className="text-sm font-semibold mb-3">Linea de Tiempo</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
            <div>
              <p className="text-sm font-medium">Detectada</p>
              <p className="text-xs text-muted-foreground">
                {new Date(anomalia.createdAt).toLocaleString("es-AR")}
                {anomalia.autoDetectada ? " - Deteccion automatica" : " - Creada manualmente"}
              </p>
            </div>
          </div>
          {(anomalia.estado === "EN_REVISION" || anomalia.estado === "RESUELTA" || anomalia.estado === "DESCARTADA") && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-yellow-500" />
              <div>
                <p className="text-sm font-medium">En Revision</p>
                <p className="text-xs text-muted-foreground">Tomada para analisis</p>
              </div>
            </div>
          )}
          {anomalia.estado === "RESUELTA" && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium">Resuelta</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(anomalia.updatedAt).toLocaleString("es-AR")}
                </p>
              </div>
            </div>
          )}
          {anomalia.estado === "DESCARTADA" && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-400" />
              <div>
                <p className="text-sm font-medium">Descartada</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(anomalia.updatedAt).toLocaleString("es-AR")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Anomalia</DialogTitle>
            <DialogDescription>
              Describe como se resolvio esta anomalia.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="resolucion">Resolucion</Label>
            <Textarea
              id="resolucion"
              placeholder="Detalla las acciones tomadas para resolver esta anomalia..."
              value={resolveText}
              onChange={(e) => setResolveText(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResolve} disabled={resolveLoading || !resolveText.trim()}>
              {resolveLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard Dialog */}
      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar Anomalia</DialogTitle>
            <DialogDescription>
              Indica el motivo por el cual se descarta esta anomalia.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea
              id="motivo"
              placeholder="Motivo por el cual se descarta..."
              value={discardText}
              onChange={(e) => setDiscardText(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscard}
              disabled={discardLoading || !discardText.trim()}
            >
              {discardLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
