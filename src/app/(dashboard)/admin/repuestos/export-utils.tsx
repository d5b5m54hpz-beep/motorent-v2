import { toast } from "sonner";

export async function exportRepuestos(format: "csv" | "json") {
  try {
    const res = await fetch(`/api/export/repuestos?format=${format}`);
    if (!res.ok) throw new Error("Error exporting");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repuestos-${new Date().toISOString().split("T")[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Repuestos exportados en ${format.toUpperCase()}`);
  } catch (error) {
    console.error("Export error:", error);
    toast.error("Error al exportar repuestos");
  }
}
