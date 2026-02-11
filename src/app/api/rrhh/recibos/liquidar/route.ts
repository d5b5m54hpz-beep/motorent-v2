import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { z } from "zod";

const liquidarSchema = z.object({
  mes: z.number().min(1).max(12),
  anio: z.number().min(2020).max(2100),
  empleadoIds: z.array(z.string()).min(1, "Debe seleccionar al menos un empleado"),
  incluirSAC: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "RRHH_MANAGER"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = liquidarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { mes, anio, empleadoIds } = parsed.data;

    // Get empleados
    const empleados = await prisma.empleado.findMany({
      where: { id: { in: empleadoIds }, estado: "ACTIVO" },
      include: {
        ausencias: {
          where: {
            fechaInicio: {
              gte: new Date(anio, mes - 1, 1),
              lte: new Date(anio, mes, 0),
            },
          },
        },
      },
    });

    if (empleados.length === 0) {
      return NextResponse.json({ error: "No se encontraron empleados activos" }, { status: 404 });
    }

    const recibos = [];

    for (const empleado of empleados) {
      // Calculate presentismo (8.33% if no unjustified absences)
      const ausenciasInjustificadas = empleado.ausencias.filter((a) => !a.justificada);
      const tienePresentismo = ausenciasInjustificadas.length === 0;
      const presentismo = tienePresentismo ? empleado.salarioBasico * 0.0833 : 0;

      // Calculate antigüedad (1% per year)
      const fechaIngresoDate = new Date(empleado.fechaIngreso);
      const añosTrabajados = Math.floor(
        (new Date(anio, mes - 1, 1).getTime() - fechaIngresoDate.getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
      );
      const antiguedad = empleado.salarioBasico * 0.01 * añosTrabajados;

      // Total haberes
      const totalHaberes = empleado.salarioBasico + presentismo + antiguedad;

      // Deducciones (percentages of totalHaberes)
      const jubilacion = totalHaberes * 0.11; // 11%
      const obraSocial = totalHaberes * 0.03; // 3%
      const ley19032 = totalHaberes * 0.03; // 3% PAMI
      const sindicato = empleado.sindicato ? totalHaberes * 0.02 : 0; // 2% if has sindicato

      const totalDeducciones = jubilacion + obraSocial + ley19032 + sindicato;
      const netoAPagar = totalHaberes - totalDeducciones;

      // Aportes patronales (company cost, not deducted from employee)
      const aporteJubilacion = totalHaberes * 0.16; // 16%
      const aporteObraSocial = totalHaberes * 0.06; // 6%
      const aportePAMI = totalHaberes * 0.015; // 1.5%
      const aporteART = empleado.salarioBasico * 0.03; // ~3% estimate

      const recibo = await prisma.reciboSueldo.create({
        data: {
          empleadoId: empleado.id,
          mes,
          anio,
          tipo: "MENSUAL",
          salarioBasico: empleado.salarioBasico,
          presentismo,
          antiguedad,
          horasExtra50: 0,
          horasExtra100: 0,
          adicionales: 0,
          totalHaberes,
          jubilacion,
          obraSocial,
          sindicato,
          ley19032,
          impuestoGanancias: 0,
          otrasDeduccciones: 0,
          totalDeducciones,
          aporteJubilacion,
          aporteObraSocial,
          aportePAMI,
          aporteART,
          totalAportesPatronales: aporteJubilacion + aporteObraSocial + aportePAMI + aporteART,
          netoAPagar,
          estado: "BORRADOR",
        },
        include: {
          empleado: {
            select: {
              nombre: true,
              apellido: true,
              dni: true,
              cuil: true,
              cargo: true,
            },
          },
        },
      });

      recibos.push(recibo);
    }

    return NextResponse.json({ recibos, count: recibos.length }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error generating recibos:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
