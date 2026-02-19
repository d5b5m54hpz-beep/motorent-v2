import { ShoppingCart } from "lucide-react";

export default function CompraLocalPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compra Local</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registro de motos adquiridas en el mercado local — concesionarias y particulares
        </p>
      </div>
      <div className="flex items-center justify-center rounded-lg border border-dashed p-24 text-center">
        <div className="space-y-3">
          <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">Módulo en construcción</p>
          <p className="text-xs text-muted-foreground">
            Próximamente: ingreso de motos por compra local con upload de factura
          </p>
        </div>
      </div>
    </div>
  );
}
