import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse Excel/CSV with xlsx
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON array
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Convert to text format for Claude
    const textData = jsonData
      .slice(0, 200) // Limit to first 200 rows
      .map((row: any) => (row as any[]).join(" | "))
      .join("\n");

    if (!textData.trim()) {
      return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
    }

    // Use Claude to parse the packing list
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Eres un experto en parsing de packing lists de importación. Analiza el siguiente archivo y extrae la información de repuestos/productos.

INSTRUCCIONES:
1. Identifica las columnas que contienen:
   - Código de parte/producto/SKU del fabricante
   - Descripción/nombre del producto
   - Cantidad
   - Precio FOB unitario en USD
   - Peso en kg (si existe)
   - Volumen en m³/CBM (si existe)

2. El archivo puede estar en CUALQUIER IDIOMA (español, inglés, chino, etc.). Interpreta automáticamente.

3. Devuelve ÚNICAMENTE un JSON array con este formato exacto:
[
  {
    "codigoFabricante": "ABC-123",
    "descripcion": "Filtro de aceite compatible Honda Wave 110",
    "cantidad": 50,
    "precioFobUnitarioUsd": 12.50,
    "pesoTotalKg": 25.0,
    "volumenTotalCbm": 0.5
  }
]

4. Si no encuentras una columna, usa estos defaults:
   - pesoTotalKg: 0
   - volumenTotalCbm: 0

5. IMPORTANTE: Devuelve SOLO el JSON array, sin explicaciones, sin markdown, sin backticks.

DATOS DEL ARCHIVO:
${textData}`,
        },
      ],
    });

    // Extract JSON from Claude response
    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Try to parse JSON (removing markdown if present)
    let items: any[] = [];
    try {
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      items = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Error parsing Claude response:", responseText);
      return NextResponse.json(
        { error: "No se pudo interpretar el archivo. Asegúrate de que tenga columnas de código, descripción, cantidad y precio." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron items en el archivo" },
        { status: 400 }
      );
    }

    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error("Error parsing packing list:", error);
    return NextResponse.json(
      { error: "Error al procesar el archivo", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
