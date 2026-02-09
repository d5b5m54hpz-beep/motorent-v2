import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { MotoCard } from "@/components/catalog/moto-card";
import { Search, Calendar, Bike, TrendingDown, Clock, Shield } from "lucide-react";

async function getFeaturedMotos() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/motos/featured`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Error fetching featured motos:", error);
    return [];
  }
}

async function getPricing() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/pricing`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Error fetching pricing:", error);
    return null;
  }
}

export default async function HomePage() {
  const [featured, pricing] = await Promise.all([getFeaturedMotos(), getPricing()]);

  return (
    <>
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Alquilá tu moto ideal en{" "}
              <span className="text-primary">Buenos Aires</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Planes flexibles, sin complicaciones. Elegí, configurá y empezá a rodar en minutos.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="text-base">
                <Link href="/catalogo">
                  <Search className="mr-2 h-5 w-5" />
                  Ver Catálogo
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link href="#como-funciona">
                  Cómo Funciona
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo Funciona */}
      <section id="como-funciona" className="py-16 md:py-24 bg-muted/40">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Cómo Funciona
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Alquilar tu moto es fácil y rápido
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Search className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">1. Elegí tu Moto</h3>
                  <p className="mt-2 text-muted-foreground">
                    Navegá nuestro catálogo y seleccioná la moto que mejor se adapte a tus
                    necesidades
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Calendar className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">2. Configurá tu Plan</h3>
                  <p className="mt-2 text-muted-foreground">
                    Elegí las fechas, duración y frecuencia de pago que prefieras. Nosotros
                    calculamos el mejor precio
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bike className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">3. Empezá a Rodar</h3>
                  <p className="mt-2 text-muted-foreground">
                    Confirmá tu alquiler y coordinamos la entrega. ¡A disfrutar de tu moto!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Nuestra Flota */}
      {featured.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Nuestra Flota
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Motos de calidad para todos los estilos
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featured.map((moto: any) => (
                <MotoCard key={moto.id} moto={moto} />
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button asChild size="lg" variant="outline">
                <Link href="/catalogo">Ver Catálogo Completo</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Planes Flexibles */}
      {pricing && (
        <section className="py-16 md:py-24 bg-muted/40">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Planes Flexibles
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Elegí la frecuencia de pago que mejor se adapte a vos
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <Badge className="mb-4" variant="secondary">
                      <Clock className="mr-1 h-3 w-3" />
                      Semanal
                    </Badge>
                    <div className="text-3xl font-bold">
                      {pricing.descuentoSemanal}%
                      <span className="text-lg font-normal text-muted-foreground"> OFF</span>
                    </div>
                    <p className="mt-4 text-muted-foreground">
                      Pagá cada semana y obtené un descuento adicional del{" "}
                      {pricing.descuentoSemanal}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <Badge className="mb-4" variant="secondary">
                      <Calendar className="mr-1 h-3 w-3" />
                      Quincenal
                    </Badge>
                    <div className="text-3xl font-bold">
                      {pricing.descuentoSemanal}%
                      <span className="text-lg font-normal text-muted-foreground"> OFF</span>
                    </div>
                    <p className="mt-4 text-muted-foreground">
                      Pagá cada quincena y obtené un descuento del {pricing.descuentoSemanal}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <Badge className="mb-4">
                      <TrendingDown className="mr-1 h-3 w-3" />
                      Mensual
                    </Badge>
                    <div className="text-3xl font-bold">Estándar</div>
                    <p className="mt-4 text-muted-foreground">
                      Pago mensual clásico. Además, obtené descuentos por duración de 3, 6, 9 o 12
                      meses
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm">
                <Shield className="h-4 w-4 text-primary" />
                <span>
                  <strong>Descuentos por duración:</strong> 3 meses ({pricing.descuentoMeses3}%), 6
                  meses ({pricing.descuentoMeses6}%), 9 meses ({pricing.descuentoMeses9}%), 12
                  meses ({pricing.descuentoMeses12}%)
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Preguntas Frecuentes */}
      <section id="preguntas" className="py-16 md:py-24">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Preguntas Frecuentes
              </h2>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>¿Qué documentos necesito para alquilar?</AccordionTrigger>
                <AccordionContent>
                  Necesitás DNI vigente, licencia de conducir para motos (categoría A) y un método
                  de pago válido. Todo el proceso de verificación se hace online.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>¿Puedo cancelar o modificar mi alquiler?</AccordionTrigger>
                <AccordionContent>
                  Sí, podés modificar o cancelar tu alquiler contactándonos con al menos 48 horas
                  de anticipación. Las condiciones específicas dependen del plan que hayas elegido.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>¿Las motos incluyen seguro?</AccordionTrigger>
                <AccordionContent>
                  Todas nuestras motos cuentan con seguro contra terceros incluido en el precio del
                  alquiler. Podés agregar cobertura adicional durante el proceso de contratación.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>¿Cómo funciona el sistema de pagos?</AccordionTrigger>
                <AccordionContent>
                  Podés elegir pagar semanalmente, quincenalmente o mensualmente según tu
                  preferencia. Aceptamos transferencia bancaria, tarjeta de crédito y MercadoPago.
                  Los descuentos se aplican automáticamente según la duración y frecuencia elegida.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>¿Dónde retiro y devuelvo la moto?</AccordionTrigger>
                <AccordionContent>
                  Tenemos puntos de retiro y devolución en varios barrios de Buenos Aires. Durante
                  el proceso de alquiler podrás elegir el punto más conveniente para vos. También
                  ofrecemos delivery a domicilio con costo adicional.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>¿Qué edad mínima se requiere?</AccordionTrigger>
                <AccordionContent>
                  Debés ser mayor de 18 años y contar con licencia de conducir para motos vigente.
                  Para algunos modelos de mayor cilindrada podemos requerir experiencia mínima
                  comprobable.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Empezá a Rodar Hoy
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Unite a cientos de riders que ya confían en MotoRent para sus aventuras
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="text-base">
                <Link href="/catalogo">
                  <Bike className="mr-2 h-5 w-5" />
                  Explorar Catálogo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </>
  );
}
