"use client";

import QRCode from "qrcode";
import { toast } from "sonner";

type Ubicacion = {
  id: string;
  codigo: string;
  nombre: string | null;
  estante: string;
  fila: string;
  posicion: string;
};

export async function printUbicacionesLabels(ubicaciones: Ubicacion[]) {
  if (ubicaciones.length === 0) {
    toast.error("Selecciona al menos una ubicación");
    return;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Create hidden container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.id = "print-ubicaciones-container";
  document.body.appendChild(container);

  try {
    // Generate all QR codes
    const qrPromises = ubicaciones.map(async (ubicacion) => {
      const url = `${origin}/admin/repuestos?tab=ubicaciones&codigo=${encodeURIComponent(ubicacion.codigo)}`;
      const canvas = document.createElement("canvas");

      return new Promise<string>((resolve, reject) => {
        QRCode.toCanvas(canvas, url, { width: 150, margin: 1 }, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve(canvas.outerHTML);
          }
        });
      });
    });

    const qrCodes = await Promise.all(qrPromises);

    // Build printable HTML with grid layout (3 labels per row)
    const labelsHtml = ubicaciones
      .map((ubicacion, index) => {
        return `
          <div style="
            width: 60mm;
            padding: 5mm;
            font-family: Arial, sans-serif;
            text-align: center;
            border: 1px dashed #ccc;
            display: inline-block;
            vertical-align: top;
            margin: 2mm;
            page-break-inside: avoid;
          ">
            <div style="margin-bottom: 8px;">
              <h3 style="margin: 0; font-size: 16px; font-weight: bold;">${ubicacion.codigo}</h3>
              ${ubicacion.nombre ? `<p style="margin: 3px 0; font-size: 11px; color: #666;">${ubicacion.nombre}</p>` : ""}
            </div>

            <div style="margin: 10px 0;">
              ${qrCodes[index]}
            </div>

            <div style="margin-top: 8px; font-size: 10px; color: #666;">
              <p style="margin: 2px 0;">Estante: ${ubicacion.estante}</p>
              <p style="margin: 2px 0;">Fila: ${ubicacion.fila} / Pos: ${ubicacion.posicion}</p>
            </div>

            <div style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #eee; font-size: 8px; color: #999;">
              <p style="margin: 0;">MotoRent</p>
            </div>
          </div>
        `;
      })
      .join("");

    container.innerHTML = `
      <div style="width: 210mm; padding: 10mm;">
        ${labelsHtml}
      </div>
    `;

    // Create print styles
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        #print-ubicaciones-container, #print-ubicaciones-container * {
          visibility: visible;
        }
        #print-ubicaciones-container {
          position: absolute;
          left: 0;
          top: 0;
        }
        @page {
          size: A4;
          margin: 10mm;
        }
      }
    `;
    document.head.appendChild(style);

    // Trigger print
    setTimeout(() => {
      window.print();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(container);
        document.head.removeChild(style);
      }, 500);
    }, 250);

    toast.success(`${ubicaciones.length} etiquetas listas para imprimir`);
  } catch (error) {
    console.error("QR generation error:", error);
    toast.error("Error generando códigos QR");
    document.body.removeChild(container);
  }
}
