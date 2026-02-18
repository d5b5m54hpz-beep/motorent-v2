import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { empleadoSchema } from "@/lib/validations";
import { SexoEmpleado, EstadoCivil, Departamento, JornadaLaboral, EstadoEmpleado } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(OPERATIONS.hr.employee.view, "view", ["OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const empleado = await prisma.empleado.findUnique({
      where: { id },
      include: {
        recibos: { orderBy: { createdAt: "desc" }, take: 10 },
        ausencias: { orderBy: { createdAt: "desc" }, take: 10 },
        documentos: true,
      },
    });

    if (!empleado) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

    return NextResponse.json(empleado);
  } catch (err: unknown) {
    console.error("Error fetching empleado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(OPERATIONS.hr.employee.update, "execute", ["OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = empleadoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fechaNacimiento, fechaIngreso, fechaEgreso, fechaAltaAFIP, ...rest } = parsed.data;

    const empleado = await prisma.empleado.update({
      where: { id },
      data: {
        ...rest,
        sexo: rest.sexo as SexoEmpleado,
        estadoCivil: rest.estadoCivil as EstadoCivil,
        departamento: rest.departamento as Departamento,
        jornadaLaboral: rest.jornadaLaboral as JornadaLaboral,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        fechaIngreso: new Date(fechaIngreso),
        fechaEgreso: fechaEgreso ? new Date(fechaEgreso) : null,
        fechaAltaAFIP: fechaAltaAFIP ? new Date(fechaAltaAFIP) : null,
      },
    });

    eventBus.emit(OPERATIONS.hr.employee.update, "Empleado", id, { nombre: rest.nombre, cargo: rest.cargo, salario: rest.salarioBasico }, userId).catch(err => console.error("[Events] hr.employee.update error:", err));

    return NextResponse.json(empleado);
  } catch (err: unknown) {
    console.error("Error updating empleado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(OPERATIONS.hr.employee.terminate, "execute", ["OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    // Soft delete - cambiar estado a BAJA
    await prisma.empleado.update({
      where: { id },
      data: { estado: "BAJA" as EstadoEmpleado, fechaEgreso: new Date() },
    });

    eventBus.emit(OPERATIONS.hr.employee.terminate, "Empleado", id, { action: "baja" }, userId).catch(err => console.error("[Events] hr.employee.terminate error:", err));

    return NextResponse.json({ message: "Empleado dado de baja correctamente" });
  } catch (err: unknown) {
    console.error("Error deleting empleado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
