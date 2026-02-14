export type Mantenimiento = {
  id: string;
  visibleId: string;
  motoId: string;
  tipo: string;
  estado: string;
  descripcion: string;
  diagnostico: string | null;
  solucion: string | null;
  costoRepuestos: number;
  costoManoObra: number;
  costoTotal: number;
  proveedorId: string | null;
  kmAlMomento: number | null;
  fechaProgramada: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  proximoServiceKm: number | null;
  proximoServiceFecha: string | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
  moto: {
    id: string;
    marca: string;
    modelo: string;
    patente: string;
  };
  proveedor: {
    id: string;
    nombre: string;
  } | null;
};

export type MantenimientosApiResponse = {
  data: Mantenimiento[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
