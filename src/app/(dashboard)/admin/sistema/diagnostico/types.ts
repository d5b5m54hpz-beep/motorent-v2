export type CheckStatus = "passed" | "warning" | "error";

export type DiagnosticoCheck = {
  categoria: string;
  nombre: string;
  status: CheckStatus;
  mensaje?: string;
  detalles?: string[];
  tiempo?: number;
  ids?: string[];
};

export type DiagnosticoResultado = {
  checks: DiagnosticoCheck[];
  totalChecks: number;
  passed: number;
  warnings: number;
  errors: number;
  duracion: number;
};

export type DiagnosticoRun = {
  id: string;
  fecha: Date;
  duracion: number;
  totalChecks: number;
  passed: number;
  warnings: number;
  errors: number;
  resultados: DiagnosticoCheck[];
  ejecutadoPor: string;
  ejecutador: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
};
