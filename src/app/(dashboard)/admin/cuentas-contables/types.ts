export type CuentaContable = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "ACTIVO" | "PASIVO" | "PATRIMONIO" | "INGRESO" | "EGRESO";
  padre: string | null;
  nivel: number;
  imputable: boolean;
  activa: boolean;
  descripcion: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CuentaContableFormData = {
  codigo: string;
  nombre: string;
  tipo: "ACTIVO" | "PASIVO" | "PATRIMONIO" | "INGRESO" | "EGRESO";
  padre?: string | null;
  nivel: number;
  imputable: boolean;
  activa: boolean;
  descripcion?: string;
};
