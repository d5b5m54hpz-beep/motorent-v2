export type Factura = {
  id: string;
  numero: string;
  tipo: string;
  puntoVenta: number;
  montoNeto: number;
  montoIva: number;
  montoTotal: number;
  cae: string | null;
  caeVencimiento: string | null;
  razonSocial: string | null;
  cuit: string | null;
  emitida: boolean;
  emailEnviado: boolean;
  emailEnviadoAt: Date | null;
  pagoId: string;
  createdAt: Date;
  updatedAt: Date;
  pago: {
    id: string;
    monto: number;
    metodo: string;
    estado: string;
    contratoId: string;
    contrato: {
      id: string;
      fechaInicio: string;
      fechaFin: string;
      clienteId: string;
      motoId: string;
      cliente: {
        id: string;
        nombre: string | null;
        dni: string | null;
        email: string;
        direccion: string | null;
        ciudad: string | null;
        provincia: string | null;
        user: {
          name: string;
          email: string;
        };
      };
      moto: {
        id: string;
        marca: string;
        modelo: string;
        patente: string;
      };
    };
  };
};
