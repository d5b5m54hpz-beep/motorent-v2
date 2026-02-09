import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { jsPDF } from "jspdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    const factura = await prisma.factura.findUnique({
      where: { id },
      include: {
        pago: {
          include: {
            contrato: {
              include: {
                cliente: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
                moto: {
                  select: {
                    marca: true,
                    modelo: true,
                    patente: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!factura) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    // Generar PDF con jsPDF
    const doc = new jsPDF();
    const cliente = factura.pago.contrato.cliente;
    const moto = factura.pago.contrato.moto;
    const contrato = factura.pago.contrato;

    const numeroCompleto = `${String(factura.puntoVenta).padStart(4, "0")}-${factura.numero}`;
    const clienteNombre = cliente.nombre || cliente.user.name;

    const formatDate = (date: Date | string) => {
      return new Date(date).toLocaleDateString("es-AR");
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(amount);
    };

    // Configurar fuente y tamaños
    let yPos = 20;

    // Header - Logo y datos de la empresa
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("MotoRent", 20, yPos);

    // Tipo de Factura en cuadro superior derecho
    doc.setLineWidth(2);
    doc.rect(160, 10, 40, 40);
    doc.setFontSize(36);
    doc.text(factura.tipo, 175, 38);

    yPos += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("MotoRent S.R.L.", 20, yPos);
    yPos += 4;
    doc.text("CUIT: 30-12345678-9", 20, yPos);
    yPos += 4;
    doc.text("Av. Corrientes 1234, CABA", 20, yPos);
    yPos += 4;
    doc.text("Condición IVA: Responsable Inscripto", 20, yPos);

    yPos += 10;
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);

    // Número de Factura
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`FACTURA ${factura.tipo}`, 20, yPos);

    yPos += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Número:", 20, yPos);
    doc.setFont("helvetica", "bold");
    doc.text(numeroCompleto, 50, yPos);

    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Fecha de emisión:", 20, yPos);
    doc.text(formatDate(factura.createdAt), 50, yPos);

    if (factura.cae) {
      yPos += 5;
      doc.text("CAE:", 20, yPos);
      doc.text(factura.cae, 50, yPos);

      if (factura.caeVencimiento) {
        yPos += 5;
        doc.text("Vencimiento CAE:", 20, yPos);
        doc.text(formatDate(factura.caeVencimiento), 50, yPos);
      }
    }

    // Datos del Cliente
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL CLIENTE", 20, yPos);
    doc.setLineWidth(0.3);
    doc.line(20, yPos + 1, 190, yPos + 1);

    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.text("Razón Social / Nombre:", 20, yPos);
    doc.text(factura.razonSocial || clienteNombre, 65, yPos);

    yPos += 5;
    doc.text("CUIT / DNI:", 20, yPos);
    doc.text(factura.cuit || cliente.dni || "—", 65, yPos);

    yPos += 5;
    doc.text("Dirección:", 20, yPos);
    const direccion = [
      cliente.direccion,
      cliente.ciudad,
      cliente.provincia,
    ].filter(Boolean).join(", ") || "—";
    doc.text(direccion, 65, yPos);

    yPos += 5;
    doc.text("Email:", 20, yPos);
    doc.text(cliente.user.email, 65, yPos);

    yPos += 5;
    doc.text("Condición IVA:", 20, yPos);
    doc.text("Consumidor Final", 65, yPos);

    // Detalle
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text("DETALLE", 20, yPos);
    doc.line(20, yPos + 1, 190, yPos + 1);

    // Header de tabla
    yPos += 6;
    doc.setFillColor(0, 0, 0);
    doc.rect(20, yPos - 4, 170, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Descripción", 22, yPos);
    doc.text("Cant.", 130, yPos);
    doc.text("P. Unitario", 145, yPos);
    doc.text("Subtotal", 175, yPos);

    // Fila de datos
    yPos += 6;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    const descripcion = `Alquiler de moto ${moto.marca} ${moto.modelo} (Patente: ${moto.patente})`;
    const descripcion2 = `Período del ${formatDate(contrato.fechaInicio)} al ${formatDate(contrato.fechaFin)}`;

    doc.text(descripcion, 22, yPos);
    yPos += 4;
    doc.text(descripcion2, 22, yPos);
    yPos -= 2;

    doc.text("1", 130, yPos);

    const precioUnitario = factura.tipo === "A" ? factura.montoNeto : factura.montoTotal;
    doc.text(formatCurrency(precioUnitario), 145, yPos);
    doc.text(formatCurrency(precioUnitario), 175, yPos);

    yPos += 8;
    doc.setLineWidth(0.3);
    doc.line(20, yPos, 190, yPos);

    // Totales
    yPos += 8;
    doc.setFontSize(9);

    if (factura.tipo === "A") {
      doc.text("Subtotal:", 140, yPos);
      doc.text(formatCurrency(factura.montoNeto), 175, yPos);

      yPos += 5;
      doc.text("IVA 21%:", 140, yPos);
      doc.text(formatCurrency(factura.montoIva), 175, yPos);

      yPos += 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("TOTAL:", 140, yPos);
      doc.text(formatCurrency(factura.montoTotal), 175, yPos);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("TOTAL:", 140, yPos);
      doc.text(formatCurrency(factura.montoTotal), 175, yPos);
    }

    // Footer
    yPos = 270;
    doc.setLineWidth(0.3);
    doc.line(20, yPos, 190, yPos);
    yPos += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    if (!factura.emitida) {
      doc.text("⚠ DOCUMENTO NO VÁLIDO COMO FACTURA", 70, yPos);
      yPos += 4;
    }

    doc.text(
      factura.emitida
        ? "Comprobante fiscal válido según normativa AFIP"
        : "Comprobante interno - No válido para AFIP",
      60,
      yPos
    );

    // Generar buffer del PDF
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Nombre del archivo
    const filename = `Factura_${factura.tipo}_${numeroCompleto}.pdf`;

    // Retornar el PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Error al generar PDF" },
      { status: 500 }
    );
  }
}
