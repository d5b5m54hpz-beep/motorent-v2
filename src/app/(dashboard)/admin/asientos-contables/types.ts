export type LineaAsiento = {
  id: string;
  asientoId: string;
  orden: number;
  cuentaId: string;
  cuenta: { id: string; codigo: string; nombre: string };
  debe: number;
  haber: number;
  descripcion: string | null;
  createdAt: Date;
};

export type AsientoContable = {
  id: string;
  visibleId: string;
  numero: number;
  fecha: Date;
  tipo: "APERTURA" | "COMPRA" | "VENTA" | "PAGO" | "COBRO" | "AJUSTE" | "CIERRE";
  descripcion: string;
  totalDebe: number;
  totalHaber: number;
  facturaCompraId: string | null;
  cerrado: boolean;
  creadoPor: string | null;
  notas: string | null;
  createdAt: Date;
  updatedAt: Date;
  lineas: LineaAsiento[];
};

export type AsientoContableFormData = {
  fecha: string;
  tipo: "APERTURA" | "COMPRA" | "VENTA" | "PAGO" | "COBRO" | "AJUSTE" | "CIERRE";
  descripcion: string;
  notas?: string;
  lineas: {
    cuentaId: string;
    debe: number;
    haber: number;
    descripcion?: string;
  }[];
};
