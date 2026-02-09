export type Pago = {
  id: string;
  contratoId: string;
  monto: number;
  metodo: string;
  estado: string;
  referencia: string | null;
  mpPaymentId: string | null;
  comprobante: string | null;
  notas: string | null;
  pagadoAt: string | null;
  vencimientoAt: string | null;
  createdAt: string;
  updatedAt: string;
  contrato: {
    id: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
    cliente: {
      nombre: string | null;
      email: string;
      dni: string | null;
      user: {
        name: string | null;
        email: string;
      };
    };
    moto: {
      marca: string;
      modelo: string;
      patente: string;
    };
  };
};

export type PagosApiResponse = {
  data: Pago[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
