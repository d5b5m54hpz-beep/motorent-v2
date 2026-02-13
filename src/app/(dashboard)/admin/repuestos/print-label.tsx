"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import type { Repuesto } from "./types";
import { formatCurrency } from "@/lib/utils";

type PrintLabelProps = {
  repuesto: Repuesto;
};

export function printRepuestoLabel(repuesto: Repuesto) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/admin/repuestos?scan=${encodeURIComponent(repuesto.codigo || repuesto.id)}`;

  // Create hidden container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.id = "print-label-container";
  document.body.appendChild(container);

  // Generate QR code
  const canvas = document.createElement("canvas");
  QRCode.toCanvas(canvas, url, { width: 200, margin: 1 }, (error) => {
    if (error) {
      console.error("QR generation error:", error);
      toast.error("Error generando código QR");
      document.body.removeChild(container);
      return;
    }

    // Build printable HTML
    container.innerHTML = `
      <div style="width: 100mm; padding: 10mm; font-family: Arial, sans-serif; page-break-after: always;">
        <div style="text-align: center; margin-bottom: 10px;">
          <h2 style="margin: 0; font-size: 18px; font-weight: bold;">${repuesto.nombre}</h2>
          ${repuesto.codigo ? `<p style="margin: 5px 0; font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold;">${repuesto.codigo}</p>` : ""}
        </div>

        <div style="text-align: center; margin: 15px 0;">
          ${canvas.outerHTML}
        </div>

        <div style="margin-top: 15px; font-size: 12px;">
          ${repuesto.ubicacion ? `<p style="margin: 5px 0;"><strong>Ubicación:</strong> ${repuesto.ubicacion}</p>` : ""}
          ${repuesto.categoria ? `<p style="margin: 5px 0;"><strong>Categoría:</strong> ${repuesto.categoria}</p>` : ""}
          <p style="margin: 5px 0;"><strong>Stock:</strong> ${repuesto.stock} ${repuesto.unidad || "unidades"}</p>
          ${repuesto.precioVenta ? `<p style="margin: 5px 0;"><strong>Precio:</strong> ${formatCurrency(repuesto.precioVenta)}</p>` : ""}
        </div>

        <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; text-align: center; font-size: 10px; color: #666;">
          <p style="margin: 0;">MotoRent - Sistema de Gestión</p>
        </div>
      </div>
    `;

    // Create print styles
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        #print-label-container, #print-label-container * {
          visibility: visible;
        }
        #print-label-container {
          position: absolute;
          left: 0;
          top: 0;
        }
        @page {
          size: 100mm auto;
          margin: 0;
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
  });
}
