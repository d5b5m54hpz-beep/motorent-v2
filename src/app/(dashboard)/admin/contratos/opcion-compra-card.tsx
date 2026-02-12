"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OpcionCompraCardProps {
  contratoId: string;
  fechaInicio: string;
  mesesParaCompra: number;
  valorCompraFinal: number;
  opcionEjercida: boolean;
  fechaEjercicio?: string | null;
}

export function OpcionCompraCard({
  contratoId,
  fechaInicio,
  mesesParaCompra,
  valorCompraFinal,
  opcionEjercida,
  fechaEjercicio,
}: OpcionCompraCardProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Calcular meses transcurridos
  const inicio = new Date(fechaInicio);
  const ahora = new Date();
  const mesesTranscurridos = Math.floor(
    (ahora.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  const progreso = Math.min((mesesTranscurridos / mesesParaCompra) * 100, 100);
  const puedeEjercer = mesesTranscurridos >= mesesParaCompra && !opcionEjercida;

  async function handleEjercerOpcion() {
    setLoading(true);
    try {
      const res = await fetch(`/api/contratos/${contratoId}/ejercer-opcion`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al ejercer la opción");
        return;
      }

      toast.success(data.mensaje || "Opción de compra ejercida exitosamente");
      router.refresh();
    } catch (error) {
      console.error("Error ejerciendo opción:", error);
      toast.error("Error al ejercer la opción de compra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Opción a Compra</CardTitle>
          </div>
          {opcionEjercida ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              <CheckCircle className="mr-1 h-3 w-3" />
              Ejercida
            </Badge>
          ) : (
            <Badge variant="outline">
              <Clock className="mr-1 h-3 w-3" />
              Activa
            </Badge>
          )}
        </div>
        <CardDescription>
          {opcionEjercida
            ? `Opción ejercida el ${new Date(fechaEjercicio!).toLocaleDateString("es-AR")}`
            : "El cliente puede comprar la moto al finalizar el período"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!opcionEjercida && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-medium">
                  {mesesTranscurridos} / {mesesParaCompra} meses
                </span>
              </div>
              <Progress value={progreso} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {puedeEjercer
                  ? "✓ Período mínimo cumplido"
                  : `Faltan ${mesesParaCompra - mesesTranscurridos} meses`}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <span className="text-sm font-medium">Valor de compra final</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(valorCompraFinal)}
              </span>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  className="w-full"
                  disabled={!puedeEjercer || loading}
                >
                  {loading ? "Procesando..." : "Ejercer Opción de Compra"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Ejercer opción de compra?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      Esta acción es irreversible. Se realizarán las siguientes operaciones:
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      <li>El contrato se marcará como "Finalizado por compra"</li>
                      <li>La moto se dará de baja del inventario</li>
                      <li>Se registrará la venta por {formatCurrency(valorCompraFinal)}</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEjercerOpcion} disabled={loading}>
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {opcionEjercida && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-green-600 dark:text-green-400" />
            <p className="mt-2 text-sm font-medium text-green-900 dark:text-green-100">
              Opción de compra ejercida
            </p>
            <p className="mt-1 text-xs text-green-700 dark:text-green-300">
              Valor final: {formatCurrency(valorCompraFinal)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
