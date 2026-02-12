"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { PriceCalculator } from "@/components/pricing/price-calculator";
import { MotoCard } from "@/components/catalog/moto-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Calendar, Gauge, Palette, Bike, MapPin } from "lucide-react";

export default function MotoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [moto, setMoto] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [motoRes, pricingRes] = await Promise.all([
          fetch(`/api/public/motos/${id}`),
          fetch(`/api/public/pricing`),
        ]);

        if (!motoRes.ok) {
          router.push("/catalogo");
          return;
        }

        const [motoData, pricingData] = await Promise.all([
          motoRes.json(),
          pricingRes.json(),
        ]);

        setMoto(motoData);
        setPricing(pricingData);

        // Fetch related motos (same tipo)
        if (motoData.tipo) {
          const relatedRes = await fetch(
            `/api/public/motos?tipo=${motoData.tipo}&limit=4`
          );
          if (relatedRes.ok) {
            const relatedData = await relatedRes.json();
            setRelated(relatedData.data.filter((m: any) => m.id !== id).slice(0, 3));
          }
        }
      } catch (error) {
        console.error("Error fetching moto:", error);
        router.push("/catalogo");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, router]);

  const handleRentClick = () => {
    if (!session) {
      router.push(`/login?redirect=/alquiler/${id}`);
    } else {
      router.push(`/alquiler/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader />
        <main className="flex-1">
          <div className="container px-4 py-8">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-96 w-full rounded-lg" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-96 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!moto) return null;

  const tipoBadgeColors: Record<string, string> = {
    naked: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    touring: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    sport: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    scooter: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    custom: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1">
      <div className="container px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              {moto.imagen ? (
                <img
                  src={moto.imagen}
                  alt={`${moto.marca} ${moto.modelo}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Bike className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Title & Badges */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  {moto.marca} {moto.modelo}
                </h1>
                {moto.tipo && (
                  <Badge variant="outline" className={tipoBadgeColors[moto.tipo]}>
                    {moto.tipo}
                  </Badge>
                )}
              </div>
              <p className="text-xl text-primary font-bold">
                {formatCurrency(moto.precioMensual)}/mes
              </p>
            </div>

            <Separator />

            {/* Specs */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Especificaciones</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Año</p>
                    <p className="font-medium">{moto.anio}</p>
                  </div>
                </div>

                {moto.cilindrada && (
                  <div className="flex items-center gap-3">
                    <Gauge className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cilindrada</p>
                      <p className="font-medium">{moto.cilindrada}cc</p>
                    </div>
                  </div>
                )}

                {moto.color && (
                  <div className="flex items-center gap-3">
                    <Palette className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Color</p>
                      <p className="font-medium">{moto.color}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Kilometraje</p>
                    <p className="font-medium">{moto.kilometraje.toLocaleString()} km</p>
                  </div>
                </div>
              </div>
            </div>

            {moto.descripcion && (
              <>
                <Separator />
                <div>
                  <h2 className="text-xl font-semibold mb-4">Descripción</h2>
                  <p className="text-muted-foreground leading-relaxed">{moto.descripcion}</p>
                </div>
              </>
            )}

            {/* Related Motos */}
            {related.length > 0 && (
              <>
                <Separator />
                <div>
                  <h2 className="text-xl font-semibold mb-4">Motos Similares</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {related.map((relatedMoto) => (
                      <MotoCard key={relatedMoto.id} moto={relatedMoto} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Precio Mensual</p>
                    <p className="text-3xl font-bold text-primary">
                      {formatCurrency(moto.precioMensual)}
                    </p>
                  </div>
                  <Button onClick={handleRentClick} size="lg" className="w-full">
                    Alquilar esta Moto
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Price Calculator */}
            {pricing && (
              <PriceCalculator basePrice={moto.precioMensual} pricingConfig={pricing} />
            )}
          </div>
        </div>
      </div>

      </main>
      <PublicFooter />
    </div>
  );
}
