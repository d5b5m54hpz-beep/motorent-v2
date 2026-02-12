"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function ResultadoPagoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const status = searchParams.get("status") || searchParams.get("collection_status");
  const paymentId = searchParams.get("payment_id");
  const externalReference = searchParams.get("external_reference");
  const preferenceId = searchParams.get("preference_id");

  useEffect(() => {
    // Simular carga inicial
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleGoToPayments = () => {
    router.push("/mi-cuenta?tab=pagos");
  };

  const handleRetry = () => {
    if (externalReference) {
      // Redirigir al checkout de nuevo
      router.push(`/mi-cuenta?tab=pagos&retry=${externalReference}`);
    } else {
      handleGoToPayments();
    }
  };

  if (loading) {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pago aprobado
  if (status === "approved") {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/20">
              <CheckCircle className="h-10 w-10 text-teal-600 dark:text-teal-400" />
            </div>
            <CardTitle className="text-2xl">¡Pago Aprobado!</CardTitle>
            <CardDescription>Tu pago se procesó correctamente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-900/20">
              <CheckCircle className="h-4 w-4 text-teal-600" />
              <AlertTitle>Pago confirmado</AlertTitle>
              <AlertDescription>
                Recibirás un comprobante por email con los detalles de tu pago.
              </AlertDescription>
            </Alert>

            {paymentId && (
              <div className="space-y-2 rounded-lg bg-muted p-4">
                <p className="text-sm font-medium">Detalles del pago:</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>ID de Pago: {paymentId}</p>
                  {externalReference && <p>Referencia: {externalReference}</p>}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleGoToPayments} className="flex-1">
                Ver Mis Pagos
              </Button>
              <Button variant="outline" onClick={() => router.push("/mi-cuenta")} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pago rechazado
  if (status === "rejected" || status === "failure") {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Pago Rechazado</CardTitle>
            <CardDescription>No se pudo procesar tu pago</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error en el pago</AlertTitle>
              <AlertDescription>
                El pago fue rechazado. Esto puede deberse a fondos insuficientes, límite de
                tarjeta excedido, o datos incorrectos.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">¿Qué puedes hacer?</p>
              <ul className="list-inside list-disc space-y-2 text-sm">
                <li>Verificar los datos de tu tarjeta o cuenta</li>
                <li>Probar con otro método de pago</li>
                <li>Contactar a tu banco para más información</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleRetry} className="flex-1">
                Reintentar Pago
              </Button>
              <Button variant="outline" onClick={handleGoToPayments} className="flex-1">
                Ver Mis Pagos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pago pendiente
  if (status === "pending" || status === "in_process") {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <Clock className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle className="text-2xl">Pago Pendiente</CardTitle>
            <CardDescription>Tu pago está siendo procesado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertTitle>En proceso</AlertTitle>
              <AlertDescription>
                Tu pago está siendo verificado. Recibirás una notificación cuando se confirme.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Tiempos estimados:</p>
              <ul className="list-inside list-disc space-y-2 text-sm">
                <li>Tarjeta de crédito/débito: inmediato a 2 días hábiles</li>
                <li>Transferencia bancaria: 1 a 3 días hábiles</li>
                <li>Efectivo (Rapipago/Pago Fácil): inmediato al pagar</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleGoToPayments} className="flex-1">
                Ver Mis Pagos
              </Button>
              <Button variant="outline" onClick={() => router.push("/mi-cuenta")} className="flex-1">
                Volver al Panel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado desconocido
  return (
    <div className="container max-w-2xl py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Estado Desconocido</CardTitle>
          <CardDescription>No pudimos determinar el estado de tu pago</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTitle>Información</AlertTitle>
            <AlertDescription>
              Por favor, verifica el estado de tu pago en la sección "Mis Pagos".
            </AlertDescription>
          </Alert>

          <Button onClick={handleGoToPayments} className="w-full">
            Ver Mis Pagos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResultadoPagoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ResultadoPagoContent />
    </Suspense>
  );
}
