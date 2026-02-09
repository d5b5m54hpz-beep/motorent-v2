export type Contrato = {
  id: string;
  clienteId: string;
  motoId: string;
  fechaInicio: string;
  fechaFin: string;
  frecuenciaPago: string;
  montoPeriodo: number;
  montoTotal: number;
  deposito: number;
  descuentoAplicado: number;
  notas: string | null;
  renovacionAuto: boolean;
  estado: string;
  createdAt: string;
  updatedAt: string;
  cliente: {
    nombre: string | null;
    email: string;
    dni: string | null;
  };
  moto: {
    marca: string;
    modelo: string;
    patente: string;
  };
  _count: {
    pagos: number;
  };
  montoCobrado?: number;
};

export type ContratosApiResponse = {
  data: Contrato[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
