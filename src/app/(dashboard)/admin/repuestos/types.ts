export type Repuesto = {
  id: string;
  visibleId: string;
  nombre: string;
  codigo: string | null;
  categoria: string | null;
  descripcion: string | null;
  marca: string | null;
  modelo: string | null;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  proveedorId: string | null;
  unidad: string | null;
  unidadCompra: string | null;
  factorConversion: number | null;
  vidaUtilKm: number | null;
  ubicacion: string | null;
  codigoBarras: string | null;
  imagenUrl: string | null;
  imagenKey: string | null;
  peso: number | null;
  activo: boolean;
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
