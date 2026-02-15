import jsPDF from "jspdf";
import QRCode from "qrcode";

type LabelItem = {
  id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  qrUrl: string;
};

export async function generateLabelsPDF(
  items: LabelItem[],
  embarqueRef: string,
  proveedorNombre: string
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const labelWidth = 90;
  const labelHeight = 50;
  const gap = 5;

  let currentX = margin;
  let currentY = margin;
  let isFirstPage = true;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Check if we need a new row or page
    if (currentX + labelWidth > pageWidth - margin) {
      currentX = margin;
      currentY += labelHeight + gap;
    }

    if (currentY + labelHeight > pageHeight - margin) {
      doc.addPage();
      currentX = margin;
      currentY = margin;
      isFirstPage = false;
    }

    // Generate QR code
    const qrDataUrl = await QRCode.toDataURL(item.qrUrl, {
      width: 200,
      margin: 1,
    });

    // Draw label border
    doc.setDrawColor(200);
    doc.rect(currentX, currentY, labelWidth, labelHeight);

    // Add logo text (simplified)
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("MOTOLIBRE", currentX + 3, currentY + 6);

    // Add QR code
    const qrSize = 20;
    doc.addImage(qrDataUrl, "PNG", currentX + labelWidth - qrSize - 3, currentY + 3, qrSize, qrSize);

    // Add item code
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const codeY = currentY + 16;
    doc.text(item.codigo, currentX + 3, codeY);

    // Add item name (truncate if too long)
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const maxNameWidth = labelWidth - 6;
    const nameLines = doc.splitTextToSize(item.nombre, maxNameWidth);
    doc.text(nameLines.slice(0, 2), currentX + 3, codeY + 5);

    // Add quantity
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Qty: ${item.cantidad} pcs`, currentX + 3, currentY + labelHeight - 15);

    // Add embarque info
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${embarqueRef} | ${proveedorNombre}`, currentX + 3, currentY + labelHeight - 10);
    doc.text(new Date().toLocaleDateString(), currentX + 3, currentY + labelHeight - 6);

    // Move to next position
    currentX += labelWidth + gap;
  }

  // Return as Blob
  return doc.output("blob");
}
