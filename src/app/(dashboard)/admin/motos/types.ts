export type Moto = {
  id: string;
  marca: string;
  modelo: string;
  patente: string;
  anio: number;
  color: string | null;
  kilometraje: number;
  precioMensual: number;
  cilindrada: number | null;
  tipo: string | null;
  descripcion: string | null;
  numeroMotor: string | null;
  numeroCuadro: string | null;
  imagen: string | null;
  estado: string;
  createdAt: string;
  updatedAt: string;

  // Patentamiento
  estadoPatentamiento: string | null;
  fechaInicioTramitePatente: string | null;
  fechaPatentamiento: string | null;
  notasPatentamiento: string | null;

  // Seguro
  estadoSeguro: string | null;
  aseguradora: string | null;
  numeroPoliza: string | null;
  fechaInicioSeguro: string | null;
  fechaVencimientoSeguro: string | null;
  notasSeguro: string | null;
};

export type MotosApiResponse = {
  data: Moto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
