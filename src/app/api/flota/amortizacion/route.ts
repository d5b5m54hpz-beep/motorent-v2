import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

/**
 * Calcula amortizacion de toda la flota segun metodo lineal AFIP
 * Vida util: 5 anios (60 meses)
 * Cuota mensual = (Valor Compra - Valor Residual) / Vida Util en meses
 */
export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.fleet.moto.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const soloActivas = url.searchParams.get("soloActivas") === "true";

    // Obtener todas las motos con valor de compra
    const motos = await prisma.moto.findMany({
      where: {
        valorCompra: { not: null, gt: 0 },
        ...(soloActivas ? { estado: { not: "BAJA_DEFINITIVA" } } : {}),
      },
      select: {
        id: true,
        marca: true,
        modelo: true,
        patente: true,
        dominio: true,
        estado: true,
        valorCompra: true,
        valorResidual: true,
        vidaUtilAnios: true,
        metodoAmortizacion: true,
        fechaCompra: true,
        createdAt: true,
      },
      orderBy: { fechaCompra: "desc" },
    });

    const now = new Date();
    const amortizaciones = motos.map((moto) => {
      const valorCompra = Number(moto.valorCompra || 0);
      const valorResidual = Number(moto.valorResidual || 0) || valorCompra * 0.1; // 10% default
      const vidaUtilAnios = moto.vidaUtilAnios || 5; // AFIP default
      const vidaUtilMeses = vidaUtilAnios * 12;

      // Fecha de inicio de amortizacion
      const fechaInicio = moto.fechaCompra || moto.createdAt;

      // Meses transcurridos desde la compra
      const mesesTranscurridos = Math.max(
        0,
        Math.floor(
          (now.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24 * 30)
        )
      );

      // Cuota de amortizacion mensual (metodo lineal)
      const cuotaMensual = (valorCompra - valorResidual) / vidaUtilMeses;

      // Amortizacion acumulada (no puede exceder el valor amortizable)
      const amortizacionAcumulada = Math.min(
        cuotaMensual * mesesTranscurridos,
        valorCompra - valorResidual
      );

      // Valor en libros (valor compra - amortizacion acumulada)
      const valorLibros = valorCompra - amortizacionAcumulada;

      // Meses restantes de vida util
      const mesesRestantes = Math.max(0, vidaUtilMeses - mesesTranscurridos);
      const aniosRestantes = mesesRestantes / 12;

      // % amortizado
      const porcentajeAmortizado =
        valorCompra > 0
          ? (amortizacionAcumulada / (valorCompra - valorResidual)) * 100
          : 0;

      // Estado de amortizacion
      let estadoAmortizacion: "NUEVA" | "EN_PROCESO" | "TOTALMENTE_AMORTIZADA" = "EN_PROCESO";
      if (mesesTranscurridos === 0) {
        estadoAmortizacion = "NUEVA";
      } else if (porcentajeAmortizado >= 99.9) {
        estadoAmortizacion = "TOTALMENTE_AMORTIZADA";
      }

      return {
        moto: {
          id: moto.id,
          marca: moto.marca,
          modelo: moto.modelo,
          patente: moto.patente || moto.dominio,
          estado: moto.estado,
        },
        financiero: {
          valorCompra,
          valorResidual,
          valorLibros: Math.max(valorLibros, valorResidual), // No puede ser menor al residual
        },
        amortizacion: {
          metodo: moto.metodoAmortizacion || "LINEAL",
          vidaUtilAnios,
          vidaUtilMeses,
          cuotaMensual,
          mesesTranscurridos,
          mesesRestantes,
          aniosRestantes: Number(aniosRestantes.toFixed(1)),
          amortizacionAcumulada,
          porcentajeAmortizado: Number(porcentajeAmortizado.toFixed(1)),
          estadoAmortizacion,
        },
        fechas: {
          fechaInicio,
          fechaFinEstimada: new Date(
            fechaInicio.getTime() + vidaUtilMeses * 30 * 24 * 60 * 60 * 1000
          ),
        },
      };
    });

    // Resumen general
    const totalValorCompra = amortizaciones.reduce(
      (sum, a) => sum + a.financiero.valorCompra,
      0
    );
    const totalAmortizacionAcum = amortizaciones.reduce(
      (sum, a) => sum + a.amortizacion.amortizacionAcumulada,
      0
    );
    const totalValorLibros = amortizaciones.reduce(
      (sum, a) => sum + a.financiero.valorLibros,
      0
    );
    const totalValorResidual = amortizaciones.reduce(
      (sum, a) => sum + a.financiero.valorResidual,
      0
    );

    const resumen = {
      totalMotos: amortizaciones.length,
      totalValorCompra,
      totalAmortizacionAcumulada: totalAmortizacionAcum,
      totalValorLibros,
      totalValorResidual,
      porcentajeAmortizadoPromedio:
        totalValorCompra > 0
          ? (totalAmortizacionAcum / (totalValorCompra - totalValorResidual)) * 100
          : 0,
      motosNuevas: amortizaciones.filter((a) => a.amortizacion.estadoAmortizacion === "NUEVA")
        .length,
      motosEnProceso: amortizaciones.filter(
        (a) => a.amortizacion.estadoAmortizacion === "EN_PROCESO"
      ).length,
      motosTotalmenteAmortizadas: amortizaciones.filter(
        (a) => a.amortizacion.estadoAmortizacion === "TOTALMENTE_AMORTIZADA"
      ).length,
    };

    return NextResponse.json({
      resumen,
      amortizaciones,
    });
  } catch (err: unknown) {
    console.error("Error calculando amortizacion:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
