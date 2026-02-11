import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// OCR Response Schema
const ocrFacturaSchema = z.object({
  razonSocial: z.string(),
  cuit: z.string().optional(),
  tipo: z.enum(["A", "B", "C", "TICKET", "RECIBO"]),
  numero: z.string(),
  puntoVenta: z.string().optional(),
  fecha: z.string(), // ISO date
  vencimiento: z.string().optional(),
  subtotal: z.number(),
  iva21: z.number().default(0),
  iva105: z.number().default(0),
  iva27: z.number().default(0),
  percepcionIVA: z.number().default(0),
  percepcionIIBB: z.number().default(0),
  impInterno: z.number().default(0),
  noGravado: z.number().default(0),
  exento: z.number().default(0),
  total: z.number(),
  confianza: z.number().min(0).max(100), // OCR confidence
  notas: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no soportado. Use PNG, JPG o PDF." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Archivo muy grande. Máximo 5MB." },
        { status: 400 }
      );
    }

    // Convert to base64 (ephemeral, no storage)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type;

    // Call Claude Vision API with structured output
    const result = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: ocrFacturaSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: `data:${mimeType};base64,${base64}`,
            },
            {
              type: "text",
              text: `Analizá esta factura argentina y extraé los siguientes datos:

**Información del Proveedor:**
- Razón social del proveedor
- CUIT (formato: 20-12345678-9)

**Datos de la Factura:**
- Tipo de factura (A, B, C, TICKET, o RECIBO)
- Número de factura completo (ej: 0001-00012345)
- Punto de venta (ej: 0001)
- Fecha de emisión (formato ISO: YYYY-MM-DD)
- Fecha de vencimiento (si está presente, formato ISO: YYYY-MM-DD)

**Montos e Impuestos:**
- Subtotal (neto gravado)
- IVA 21%
- IVA 10.5%
- IVA 27%
- Percepción IVA
- Percepción IIBB (Ingresos Brutos)
- Impuestos Internos
- No gravado
- Exento
- Total final

**Validación:**
- Si algún campo no está presente o es ilegible, usá 0 para montos numéricos y strings vacíos para texto
- Asigná un puntaje de confianza (0-100) basado en la calidad y legibilidad del documento
- Si hay información importante que puede afectar la validez (ej: "CAE vencido", "COPIA"), incluíla en el campo "notas"

**Formato de salida:**
Devolvé SOLO los datos estructurados según el schema, sin texto adicional.`,
            },
          ],
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: result.object,
      rawResponse: result,
    });
  } catch (err: unknown) {
    console.error("OCR Error:", err);
    return NextResponse.json(
      {
        error: "Error al procesar el documento",
        details: err instanceof Error ? err.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
