export type Cliente = {
  id: string;
  userId: string;
  nombre: string | null;
  email: string;
  telefono: string | null;
  dni: string | null;
  dniVerificado: boolean;
  licencia: string | null;
  licenciaVencimiento: string | null;
  licenciaVerificada: boolean;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  fechaNacimiento: string | null;
  notas: string | null;
  estado: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
    image: string | null;
  };
  _count: {
    contratos: number;
  };
};

export type ClientesApiResponse = {
  data: Cliente[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
