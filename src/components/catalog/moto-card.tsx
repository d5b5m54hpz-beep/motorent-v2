import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Calendar, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

type Moto = {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  color?: string | null;
  precioMensual: number;
  cilindrada?: number | null;
  tipo?: string | null;
  descripcion?: string | null;
  imagen?: string | null;
};

type Props = {
  moto: Moto;
  variant?: "grid" | "list";
};

const tipoBadgeColors: Record<string, string> = {
  naked: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  touring: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  sport: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  scooter: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  custom: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export function MotoCard({ moto, variant = "grid" }: Props) {
  const tipoColor = moto.tipo ? tipoBadgeColors[moto.tipo] : "";

  if (variant === "list") {
    return (
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(35,224,255,0.15)]">
        <div className="flex flex-col md:flex-row">
          <div className="relative h-48 md:h-auto md:w-64 bg-muted flex-shrink-0">
            {moto.imagen ? (
              <img
                src={moto.imagen}
                alt={`${moto.marca} ${moto.modelo}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                Sin imagen
              </div>
            )}
          </div>
          <CardContent className="flex flex-1 flex-col justify-between p-6">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-xl font-semibold tracking-tight">
                  {moto.marca} {moto.modelo}
                </h3>
                {moto.tipo && (
                  <Badge variant="outline" className={cn("text-xs", tipoColor)}>
                    {moto.tipo}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{moto.anio}</span>
                </div>
                {moto.cilindrada && (
                  <div className="flex items-center gap-1">
                    <Gauge className="h-4 w-4" />
                    <span>{moto.cilindrada}cc</span>
                  </div>
                )}
                {moto.color && <span>• {moto.color}</span>}
              </div>
              {moto.descripcion && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {moto.descripcion}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(moto.precioMensual)}
                <span className="text-sm font-normal text-muted-foreground">/mes</span>
              </div>
              <Button asChild>
                <Link href={`/catalogo/${moto.id}`}>Ver Detalles</Link>
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Link href={`/catalogo/${moto.id}`}>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(35,224,255,0.15)] hover:scale-[1.02]">
        <div className="relative h-48 bg-muted">
          {moto.imagen ? (
            <img
              src={moto.imagen}
              alt={`${moto.marca} ${moto.modelo}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              Sin imagen
            </div>
          )}
          {moto.tipo && (
            <Badge
              variant="outline"
              className={cn(
                "absolute top-2 right-2 text-xs backdrop-blur-sm bg-background/90",
                tipoColor
              )}
            >
              {moto.tipo}
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold tracking-tight mb-2">
            {moto.marca} {moto.modelo}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{moto.anio}</span>
            </div>
            {moto.cilindrada && (
              <div className="flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" />
                <span>{moto.cilindrada}cc</span>
              </div>
            )}
          </div>
          {moto.color && (
            <p className="text-xs text-muted-foreground mb-3">Color: {moto.color}</p>
          )}
          <div className="text-xl font-bold text-primary">
            {formatCurrency(moto.precioMensual)}
            <span className="text-sm font-normal text-muted-foreground">/mes</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
