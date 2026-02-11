export type Gasto = {
  id: string;
  visibleId: string;
  concepto: string;
  descripcion: string | null;
  monto: number;
  categoria: string;
  subcategoria: string | null;
  motoId: string | null;
  proveedorId: string | null;
  mantenimientoId: string | null;
  metodoPago: string | null;
  comprobante: string | null;
  fecha: string;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
  moto: { id: string; marca: string; modelo: string; patente: string } | null;
  proveedor: { id: string; nombre: string } | null;
};

export type GastosApiResponse = {
  data: Gasto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
