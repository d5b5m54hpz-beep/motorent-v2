export type Proveedor = {
  id: string;
  visibleId: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  rubro: string | null;
  notas: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    mantenimientos: number;
    repuestos: number;
  };
};

export type ProveedoresApiResponse = {
  data: Proveedor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
