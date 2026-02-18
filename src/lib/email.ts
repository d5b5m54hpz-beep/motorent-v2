import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { jsPDF } from "jspdf";

// Lazy initialization - solo se crea cuando se usa
let resendInstance: Resend | null = null;

function getResendInstance() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY no está configurado. Agregá la API key en el archivo .env"
      );
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

/**
 * Genera el PDF de una factura
 */
function generateFacturaPDF(factura: any) {
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
  doc.text("motolibre", 20, yPos);

  // Tipo de Factura en cuadro superior derecho
  doc.setLineWidth(2);
  doc.rect(160, 10, 40, 40);
  doc.setFontSize(36);
  doc.text(factura.tipo, 175, 38);

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("MotoLibre S.A.", 20, yPos);
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

  return doc.output("arraybuffer");
}

/**
 * Template HTML profesional para emails de facturas
 */
function getEmailTemplate(data: {
  clienteNombre: string;
  marcaMoto: string;
  modeloMoto: string;
  numeroFactura: string;
  fechaEmision: string;
  montoTotal: string;
  estado: string;
  appUrl: string;
}) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura motolibre</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">motolibre</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Tu factura está lista</p>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Hola <strong>${data.clienteNombre}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Te enviamos la factura correspondiente a tu alquiler de <strong>${data.marcaMoto} ${data.modeloMoto}</strong>.
              </p>

              <!-- Tabla de info -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e5e5e5; font-weight: 600; color: #666666; font-size: 14px;">Número de Factura</td>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e5e5e5; text-align: right; font-size: 14px; color: #333333;">${data.numeroFactura}</td>
                </tr>
                <tr>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e5e5e5; font-weight: 600; color: #666666; font-size: 14px;">Fecha de Emisión</td>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e5e5e5; text-align: right; font-size: 14px; color: #333333;">${data.fechaEmision}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e5e5e5; font-weight: 600; color: #666666; font-size: 14px;">Estado</td>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e5e5e5; text-align: right; font-size: 14px; color: #333333;">${data.estado}</td>
                </tr>
                <tr>
                  <td style="padding: 15px 20px; font-weight: 600; color: #666666; font-size: 14px;">Monto Total</td>
                  <td style="padding: 15px 20px; text-align: right; font-size: 18px; font-weight: bold; color: #667eea;">${data.montoTotal}</td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px 0; font-size: 14px; color: #666666; line-height: 1.6;">
                El PDF adjunto contiene todos los detalles de la factura. Podés descargarlo para tus registros.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.appUrl}/mi-cuenta?tab=pagos" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Ver mis pagos</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; font-size: 14px; color: #999999; line-height: 1.6;">
                Si tenés alguna consulta, no dudes en contactarnos.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666; font-weight: 600;">MotoLibre S.A.</p>
              <p style="margin: 0 0 5px 0; font-size: 13px; color: #999999;">Av. Corrientes 1234, CABA</p>
              <p style="margin: 0 0 5px 0; font-size: 13px; color: #999999;">contacto@motolibre.com.ar | +54 11 4567-8901</p>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #bbbbbb;">
                © ${new Date().getFullYear()} motolibre. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Envía una factura por email con PDF adjunto
 */
export async function enviarFacturaEmail(facturaId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // 1. Buscar la factura con todos los datos necesarios
    const factura = await prisma.factura.findUnique({
      where: { id: facturaId },
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
      return { success: false, error: "Factura no encontrada" };
    }

    const cliente = factura.pago.contrato.cliente;
    const moto = factura.pago.contrato.moto;
    const clienteNombre = cliente.nombre || cliente.user.name;
    const numeroCompleto = `${String(factura.puntoVenta).padStart(4, "0")}-${factura.numero}`;

    // 2. Generar el PDF
    const pdfBuffer = generateFacturaPDF(factura);

    // 3. Preparar datos para el template
    const formatDate = (date: Date | string) => {
      return new Date(date).toLocaleDateString("es-AR");
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(amount);
    };

    const emailData = {
      clienteNombre,
      marcaMoto: moto.marca,
      modeloMoto: moto.modelo,
      numeroFactura: numeroCompleto,
      fechaEmision: formatDate(factura.createdAt),
      montoTotal: formatCurrency(Number(factura.montoTotal)),
      estado: factura.emitida ? "Emitida" : "Pendiente AFIP",
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    };

    // 4. Enviar el email con Resend
    const resend = getResendInstance();
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to: cliente.user.email,
      subject: `motolibre - Factura ${factura.tipo} ${numeroCompleto}`,
      html: getEmailTemplate(emailData),
      attachments: [
        {
          filename: `Factura_${factura.tipo}_${numeroCompleto}.pdf`,
          content: Buffer.from(pdfBuffer),
        },
      ],
    });

    if (error) {
      console.error("Error sending email with Resend:", error);
      return { success: false, error: error.message };
    }

    // 5. Actualizar la factura con emailEnviado
    await prisma.factura.update({
      where: { id: facturaId },
      data: {
        emailEnviado: true,
        emailEnviadoAt: new Date(),
      },
    });

    console.log(`Factura ${numeroCompleto} enviada a ${cliente.user.email}`, data);
    return { success: true };
  } catch (error: unknown) {
    console.error("Error in enviarFacturaEmail:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: message };
  }
}
