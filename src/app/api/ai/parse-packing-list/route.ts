import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

// Auto-detectar la fila de headers (primera fila con al menos 3 celdas con texto)
function detectHeaderRow(jsonData: any[][]): number {
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    if (!row) continue;

    const nonEmptyCells = row.filter((cell) => {
      const str = String(cell || "").trim();
      return str.length > 0 && isNaN(Number(str)); // Tiene texto y NO es solo número
    });

    if (nonEmptyCells.length >= 3) {
      console.log(`✓ Header row detectado en fila ${i + 1}:`, row);
      return i;
    }
  }

  console.warn("⚠️ No se detectó header row, asumiendo fila 0");
  return 0;
}

// Detectar índice de columna por keywords (multilingual)
function findColumnIndex(headers: string[], keywords: string[]): number {
  return headers.findIndex((h) =>
    keywords.some((kw) => h.includes(kw))
  );
}

// Verificar si una fila es un total o debe ser ignorada
function shouldSkipRow(row: any[]): boolean {
  const rowText = row.map((c) => String(c || "").toLowerCase()).join(" ");

  // Ignorar filas con palabras clave de totales
  if (
    rowText.includes("total") ||
    rowText.includes("subtotal") ||
    rowText.includes("sum") ||
    rowText.includes("grand") ||
    rowText.includes("summary")
  ) {
    return true;
  }

  // Ignorar filas completamente vacías
  const nonEmpty = row.filter((c) => String(c || "").trim().length > 0);
  if (nonEmpty.length === 0) {
    return true;
  }

  return false;
}

// Detectar nombre de proveedor en las primeras filas
function detectProveedorFromHeaders(jsonData: any[][]): string | null {
  const maxRows = Math.min(5, jsonData.length);
  const keywords = ["co.", "ltd", "inc", "corp", "s.a.", "s.r.l.", "motorcycle", "trading", "company", "limited", "industrial"];

  for (let i = 0; i < maxRows; i++) {
    for (const cell of jsonData[i]) {
      const text = String(cell || "").trim();

      // Buscar textos largos (>15 chars) que contengan keywords de empresa
      if (text.length > 15) {
        const textLower = text.toLowerCase();
        const hasKeyword = keywords.some(kw => textLower.includes(kw));

        if (hasKeyword) {
          console.log(`✓ Proveedor detectado en fila ${i + 1}: "${text}"`);
          return text;
        }
      }
    }
  }

  return null;
}

// Parser principal con auto-detección inteligente
function parsePackingList(jsonData: any[][]): { items: any[], proveedorDetectado: string | null } {
  if (!jsonData || jsonData.length < 2) {
    throw new Error("Archivo vacío o sin suficientes datos");
  }

  console.log(`📊 Procesando ${jsonData.length} filas...`);

  // 0. Detectar proveedor antes de headers
  const proveedorDetectado = detectProveedorFromHeaders(jsonData);

  // 1. Detectar fila de headers automáticamente
  const headerRowIdx = detectHeaderRow(jsonData);
  const headerRow = jsonData[headerRowIdx];

  if (!headerRow) {
    throw new Error("No se pudo detectar la fila de headers");
  }

  // 2. Normalizar headers a lowercase
  const headers = headerRow.map((h: any) =>
    String(h || "").toLowerCase().trim()
  );

  console.log("Headers normalizados:", headers);

  // 3. Detectar índices de columnas por keywords (multilingual)
  // Para código: priorizar "part number" sobre keywords genéricos
  // IMPORTANTE: NO detectar "Item No." o "No." que son números secuenciales, NO códigos de parte
  let codigoIdx = headers.findIndex((h) => {
    // Debe contener "part" y alguna variación de número/código
    if (h.includes("part number") || h.includes("part no") || h.includes("part#") || h.includes("partnumber")) {
      return true;
    }
    // Rechazar explícitamente columnas que son solo "item no" o "no." (números secuenciales)
    if (h === "item no" || h === "item no." || h === "no" || h === "no." || h === "item" || h === "#") {
      return false;
    }
    return false;
  });

  // Si no encuentra "part number", buscar otros patrones específicos
  if (codigoIdx === -1) {
    codigoIdx = findColumnIndex(headers, [
      "sku", "codigo", "código", "product code", "model code", "reference"
    ]);
  }

  // Para descripción: priorizar columnas en inglés/español, evitar caracteres chinos
  let descripcionIdx = headers.findIndex((h) =>
    (h.includes("description") || h.includes("descripcion") || h.includes("product name")) &&
    !/[\u4e00-\u9fa5]/.test(h) // Evitar headers con caracteres chinos
  );

  if (descripcionIdx === -1) {
    descripcionIdx = findColumnIndex(headers, [
      "desc", "name", "nombre", "designation", "produit", "article"
    ]);
  }

  const cantidadIdx = findColumnIndex(headers, [
    "qty", "quantity", "cantidad", "pcs", "units", "qté", "quantité", "pieces"
  ]);

  // Para precio: buscar "price" o "fob" pero NO total/amount/subtotal
  const precioIdx = headers.findIndex((h) =>
    (h.includes("price") || h.includes("fob") || h.includes("precio") || h.includes("cost") || h.includes("unit")) &&
    !h.includes("total") &&
    !h.includes("amount") &&
    !h.includes("subtotal")
  );

  const pesoIdx = findColumnIndex(headers, [
    "weight", "net weight", "peso", "kg", "kgs", "poids"
  ]);

  const volumenIdx = findColumnIndex(headers, [
    "volume", "cbm", "m3", "m³", "volumen", "cubic"
  ]);

  console.log("Índices detectados:", {
    codigoIdx,
    descripcionIdx,
    cantidadIdx,
    precioIdx,
    pesoIdx,
    volumenIdx
  });

  // 4. Validar que se encontraron las columnas críticas
  if (codigoIdx === -1) {
    throw new Error(
      `❌ No se detectó columna de código de parte.\n\n` +
      `Busqué: "Part Number", "Part No", "Part#", "SKU", "Product Code"\n` +
      `Encontré estas columnas: ${headers.join(", ")}\n\n` +
      `⚠️ IMPORTANTE: Si tu Excel tiene "Item No." o "No.", esas son números secuenciales, NO códigos de parte.\n` +
      `Necesitas una columna con códigos como "BRK-110-F", "ELC-BAT-5", etc.`
    );
  }
  if (descripcionIdx === -1) {
    throw new Error(
      `No se detectó columna de descripción.\n` +
      `Busqué: "Description", "Descripción", "Product Name"\n` +
      `Encontré: ${headers.join(", ")}`
    );
  }
  if (cantidadIdx === -1) {
    throw new Error(
      `No se detectó columna de cantidad.\n` +
      `Busqué: "Qty", "Quantity", "Cantidad", "Pcs"\n` +
      `Encontré: ${headers.join(", ")}`
    );
  }
  if (precioIdx === -1) {
    throw new Error(
      `No se detectó columna de precio unitario.\n` +
      `Busqué: "Price", "FOB", "Unit Price", "Cost"\n` +
      `Encontré: ${headers.join(", ")}`
    );
  }

  // 5. Procesar filas de datos (empezar después del header)
  const items: any[] = [];
  const maxRows = Math.min(jsonData.length, 500); // Máximo 500 items

  for (let i = headerRowIdx + 1; i < maxRows; i++) {
    const row = jsonData[i];

    if (!row || shouldSkipRow(row)) {
      continue;
    }

    // Extraer datos
    const codigo = String(row[codigoIdx] || "").trim();
    const descripcion = String(row[descripcionIdx] || "").trim();
    const cantidadStr = String(row[cantidadIdx] || "0").replace(/,/g, "");
    const precioStr = String(row[precioIdx] || "0").replace(/,/g, "").replace(/\$/g, "");

    const cantidad = parseFloat(cantidadStr);
    const precio = parseFloat(precioStr);

    // Validar datos críticos
    if (!codigo || !descripcion) continue;
    if (cantidad <= 0 || isNaN(cantidad)) continue;
    if (precio <= 0 || isNaN(precio)) continue;

    // Datos opcionales
    let peso = 0;
    let volumen = 0;

    if (pesoIdx !== -1) {
      const pesoStr = String(row[pesoIdx] || "0").replace(/,/g, "");
      peso = parseFloat(pesoStr) || 0;
    }

    if (volumenIdx !== -1) {
      const volStr = String(row[volumenIdx] || "0").replace(/,/g, "");
      volumen = parseFloat(volStr) || 0;
    }

    items.push({
      codigoFabricante: codigo,
      descripcion,
      cantidad,
      precioFobUnitarioUsd: precio,
      pesoTotalKg: peso,
      volumenTotalCbm: volumen,
    });
  }

  console.log(`✅ Parsing exitoso: ${items.length} items válidos encontrados`);

  // 6. Validar calidad de datos: detectar si los códigos son solo números (señal de error)
  const codigosNumericos = items.filter(item => /^\d+$/.test(item.codigoFabricante));
  if (codigosNumericos.length > items.length * 0.5) {
    console.warn(`⚠️ ADVERTENCIA: ${codigosNumericos.length}/${items.length} códigos son solo números.`);
    console.warn(`Primeros 5: ${codigosNumericos.slice(0, 5).map(i => i.codigoFabricante).join(", ")}`);
    console.warn(`Esto puede indicar que se detectó "Item No." en lugar de "Part Number"`);

    throw new Error(
      `⚠️ ADVERTENCIA: Detecté ${codigosNumericos.length} códigos que son solo números (${codigosNumericos.slice(0, 5).map(i => i.codigoFabricante).join(", ")}).\n\n` +
      `Esto sugiere que el parser detectó la columna "Item No." en lugar de "Part Number".\n\n` +
      `✅ SOLUCIÓN:\n` +
      `1. Verifica que tu Excel tenga una columna "Part Number" con códigos como "BRK-110-F", "ELC-BAT-5"\n` +
      `2. Si solo tienes "Item No." (números 1, 2, 3...), necesitas agregar una columna con códigos reales\n` +
      `3. Renombra la columna de códigos a "Part Number" para asegurar detección correcta`
    );
  }

  return { items, proveedorDetectado };
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

    // Leer archivo
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parsear Excel/CSV con xlsx
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convertir a JSON array
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    console.log(`📊 Datos extraídos: ${jsonData.length} filas del sheet "${sheetName}"`);

    if (!jsonData || jsonData.length < 2) {
      return NextResponse.json({
        error: "El archivo está vacío o sin datos"
      }, { status: 400 });
    }

    // Parsear con detección inteligente
    const { items, proveedorDetectado } = parsePackingList(jsonData);

    if (items.length === 0) {
      return NextResponse.json(
        {
          error: "No se encontraron items válidos en el archivo",
          hint: "Verifica que el archivo tenga columnas de: código, descripción, cantidad y precio"
        },
        { status: 400 }
      );
    }

    console.log(`✅ Parser completado: ${items.length} items`);
    if (proveedorDetectado) {
      console.log(`📋 Proveedor detectado: ${proveedorDetectado}`);
    }

    return NextResponse.json({
      items,
      method: "parser",
      totalItems: items.length,
      proveedorDetectado: proveedorDetectado || null,
    });

  } catch (error: unknown) {
    console.error("❌ Error parsing packing list:", error);

    const errorMessage = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      {
        error: "Error al procesar el archivo",
        details: errorMessage,
        hint: "Verifica que el archivo sea un Excel válido (.xlsx) con columnas de código, descripción, cantidad y precio"
      },
      { status: 500 }
    );
  }
}
