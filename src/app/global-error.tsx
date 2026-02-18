"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Error inesperado
          </h2>
          <p style={{ color: "#666", marginBottom: "1rem", maxWidth: "400px" }}>
            Ocurrió un error inesperado. Intentá recargar la página.
          </p>
          {error.message && (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: "0.75rem",
                color: "#999",
                marginBottom: "1.5rem",
                maxWidth: "500px",
                wordBreak: "break-all",
              }}
            >
              {error.message}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
