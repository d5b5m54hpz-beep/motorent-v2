import type { Empleado, ReciboSueldo, Ausencia, DocumentoEmpleado } from "@prisma/client";

export type EmpleadoWithRelations = Empleado & {
  recibos?: ReciboSueldo[];
  ausencias?: Ausencia[];
  documentos?: DocumentoEmpleado[];
};

export type EmpleadoListItem = Empleado;
