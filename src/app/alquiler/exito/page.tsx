"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Home } from "lucide-react";

export default function ExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ contratoId?: string }>;
}) {
  const params = use(searchParams);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <PublicHeader />

      <div className="container max-w-2xl px-4 py-16">
        <div className="text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              ¡Solicitud Enviada!
            </h1>
            <p className="text-lg text-muted-foreground">
              Tu solicitud de alquiler ha sido recibida correctamente
            </p>
          </div>

          {/* Info Card */}
          <Card className="text-left">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h2 className="font-semibold text-lg">Próximos Pasos:</h2>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                      1
                    </span>
                    <span>
                      Nuestro equipo revisará tu solicitud en las próximas 24-48 horas
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                      2
                    </span>
                    <span>
                      Recibirás un email de confirmación con los detalles del alquiler y las
                      instrucciones para el retiro
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                      3
                    </span>
                    <span>
                      Podés ver el estado de tu solicitud en la sección "Mis Contratos" de tu
                      cuenta
                    </span>
                  </li>
                </ol>

                {params.contratoId && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      ID de Contrato:{" "}
                      <span className="font-mono font-medium">{params.contratoId}</span>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild size="lg">
              <Link href="/mi-cuenta?tab=contratos">
                Ver Mis Contratos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/catalogo">
                <Home className="mr-2 h-4 w-4" />
                Volver al Catálogo
              </Link>
            </Button>
          </div>

          {/* Additional Info */}
          <div className="pt-8 text-sm text-muted-foreground">
            <p>
              ¿Tenés alguna pregunta? Escribinos a{" "}
              <a
                href="mailto:contacto@motorent.com"
                className="text-primary hover:underline"
              >
                contacto@motorent.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
