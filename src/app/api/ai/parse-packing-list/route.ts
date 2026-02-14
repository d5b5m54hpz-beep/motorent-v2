import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Función de parsing manual con detección inteligente de columnas
function parseManually(jsonData: any[][]): any[] {
  if (!jsonData || jsonData.length < 2) {
    throw new Error("Archivo vacío o sin suficientes datos");
  }

  // Primera fila es el header
  const headers = jsonData[0].map((h: any) =>
    String(h || "").toLowerCase().trim()
  );

  console.log("Headers detectados:", headers);

  // Detectar índices de columnas por keywords
  const codigoIdx = headers.findIndex((h) =>
    h.includes("code") || h.includes("part") || h.includes("sku") || h.includes("codigo") || h.includes("código")
  );
  const descripcionIdx = headers.findIndex((h) =>
    h.includes("description") || h.includes("name") || h.includes("product") ||
    h.includes("descripcion") || h.includes("descripción") || h.includes("nombre")
  );
  const cantidadIdx = headers.findIndex((h) =>
    h.includes("qty") || h.includes("quantity") || h.includes("cantidad") || h.includes("qté")
  );
  const precioIdx = headers.findIndex((h) =>
    h.includes("price") || h.includes("unit") || h.includes("precio") || h.includes("fob") || h.includes("cost")
  );
  const pesoIdx = headers.findIndex((h) =>
    h.includes("weight") || h.includes("peso") || h.includes("kg")
  );
  const volumenIdx = headers.findIndex((h) =>
    h.includes("volume") || h.includes("volumen") || h.includes("cbm") || h.includes("m3") || h.includes("m³")
  );

  console.log("Índices detectados:", { codigoIdx, descripcionIdx, cantidadIdx, precioIdx, pesoIdx, volumenIdx });

  if (codigoIdx === -1 || descripcionIdx === -1 || cantidadIdx === -1 || precioIdx === -1) {
    throw new Error("No se pudieron detectar las columnas requeridas (código, descripción, cantidad, precio)");
  }

  const items: any[] = [];

  // Procesar filas (saltear header)
  for (let i = 1; i < jsonData.length && i < 201; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    const codigo = String(row[codigoIdx] || "").trim();
    const descripcion = String(row[descripcionIdx] || "").trim();
    const cantidad = parseFloat(String(row[cantidadIdx] || "0"));
    const precio = parseFloat(String(row[precioIdx] || "0"));

    // Saltar filas inválidas
    if (!codigo || !descripcion || cantidad <= 0 || precio <= 0) continue;

    const peso = pesoIdx !== -1 ? parseFloat(String(row[pesoIdx] || "0")) : 0;
    const volumen = volumenIdx !== -1 ? parseFloat(String(row[volumenIdx] || "0")) : 0;

    items.push({
      codigoFabricante: codigo,
      descripcion,
      cantidad,
      precioFobUnitarioUsd: precio,
      pesoTotalKg: peso,
      volumenTotalCbm: volumen,
    });
  }

  return items;
}

// Timeout helper
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeoutMs)
    ),
  ]);
}

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

    console.log("📂 Procesando archivo:", file.name, file.size, "bytes");

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse Excel/CSV with xlsx
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON array
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    console.log("📊 Datos extraídos:", jsonData.length, "filas");

    if (!jsonData || jsonData.length < 2) {
      return NextResponse.json({ error: "El archivo está vacío o sin datos" }, { status: 400 });
    }

    let items: any[] = [];
    let method = "unknown";

    // ESTRATEGIA 1: Intentar con Claude AI (con timeout de 15 segundos)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        console.log("🤖 Intentando parsing con Claude AI...");

        const textData = jsonData
          .slice(0, 100) // Reducido a 100 filas para mejor performance
          .map((row: any) => (row as any[]).join(" | "))
          .join("\n");

        const message = await withTimeout(
          anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            messages: [
              {
                role: "user",
                content: `Eres un experto en parsing de packing lists. Analiza este archivo y extrae items.

INSTRUCCIONES:
1. Detecta columnas: código fabricante, descripción, cantidad, precio FOB USD, peso kg, volumen m³
2. Interpreta cualquier idioma automáticamente
3. Devuelve SOLO JSON array sin markdown:
[{"codigoFabricante":"X","descripcion":"Y","cantidad":N,"precioFobUnitarioUsd":N,"pesoTotalKg":N,"volumenTotalCbm":N}]

DATOS:
${textData}`,
              },
            ],
          }),
          15000 // 15 segundos timeout
        );

        const responseText = message.content[0].type === "text" ? message.content[0].text : "";
        const cleanJson = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        items = JSON.parse(cleanJson);

        if (Array.isArray(items) && items.length > 0) {
          method = "ai";
          console.log("✅ Claude AI parsing exitoso:", items.length, "items");
        } else {
          throw new Error("Claude devolvió array vacío");
        }
      } catch (aiError: any) {
        console.warn("⚠️ Claude AI falló:", aiError.message);
        // Continuar con fallback
      }
    } else {
      console.log("⚠️ ANTHROPIC_API_KEY no configurada, usando fallback");
    }

    // ESTRATEGIA 2: Fallback con parsing manual
    if (items.length === 0) {
      console.log("🔧 Usando parsing manual con detección de columnas...");
      items = parseManually(jsonData);
      method = "manual";
      console.log("✅ Parsing manual exitoso:", items.length, "items");
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron items en el archivo. Verifica que tenga columnas de código, descripción, cantidad y precio." },
        { status: 400 }
      );
    }

    console.log(`✅ Parsing completado (${method}):`, items.length, "items");

    return NextResponse.json({ items, method });
  } catch (error: unknown) {
    console.error("❌ Error parsing packing list:", error);
    return NextResponse.json(
      {
        error: "Error al procesar el archivo",
        details: error instanceof Error ? error.message : "Unknown",
        hint: "Verifica que el archivo tenga columnas claras de código, descripción, cantidad y precio"
      },
      { status: 500 }
    );
  }
}
