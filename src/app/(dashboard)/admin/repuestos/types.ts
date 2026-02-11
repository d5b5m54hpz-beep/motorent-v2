export type Repuesto = {
  id: string;
  visibleId: string;
  nombre: string;
  codigo: string | null;
  categoria: string | null;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  proveedorId: string | null;
  createdAt: string;
  updatedAt: string;
  proveedor: {
    id: string;
    nombre: string;
  } | null;
};

export type RepuestosApiResponse = {
  data: Repuesto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
