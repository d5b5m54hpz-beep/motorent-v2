export type TipoAusencia =
  | "VACACIONES"
  | "ENFERMEDAD"
  | "ACCIDENTE_LABORAL"
  | "LICENCIA_MATERNIDAD"
  | "LICENCIA_PATERNIDAD"
  | "ESTUDIO"
  | "MATRIMONIO"
  | "FALLECIMIENTO_FAMILIAR"
  | "MUDANZA"
  | "DONACION_SANGRE";

export type EstadoAusencia = "PENDIENTE" | "APROBADA" | "RECHAZADA";

export interface Ausencia {
  id: string;
  empleadoId: string;
  empleado: {
    nombre: string;
    apellido: string;
    dni: string;
  };
  tipo: TipoAusencia;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  justificada: boolean;
  certificado?: string;
  notas?: string;
  estado: EstadoAusencia;
  createdAt: string;
  updatedAt: string;
}

export interface AusenciaFormData {
  empleadoId: string;
  tipo: TipoAusencia;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  justificada: boolean;
  certificado?: string;
  notas?: string;
  estado: EstadoAusencia;
}
