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
  imagen: string | null;
  estado: string;
  createdAt: string;
  updatedAt: string;
};

export type MotosApiResponse = {
  data: Moto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
