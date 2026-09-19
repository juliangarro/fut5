"use client";

// No existía ningún global-error.tsx. Sin uno, un error no capturado que
// escapa incluso del RootLayout (ej. una excepción sincrónica en una
// Server Component antes de que el <body> con el fondo crema llegue a
// renderizar) hace que Next dibuje su propio documento HTML mínimo de
// emergencia, sin ninguno de los estilos de la app — en un sistema con
// modo oscuro (SO o navegador) esa página en blanco sin estilos puede
// pintarse casi negra. Reportado por el usuario como "pantalla negra" al
// navegar entre acciones. Este archivo reemplaza ese documento de
// emergencia por uno con el mismo fondo crema/tono de la app, y por eso
// tiene que traer su propio <html>/<body> (reemplaza TODO el layout, no
// solo el contenido de una página).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "24px",
          textAlign: "center",
          backgroundColor: "#f5ead8",
          color: "#3a2f28",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div>
          <p style={{ fontSize: "19px", fontWeight: 700, margin: 0 }}>Algo salió mal</p>
          <p style={{ fontSize: "15px", color: "#6b5f55", marginTop: "4px" }}>
            Probá de nuevo — si sigue pasando, contanos qué estabas haciendo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "8px",
            padding: "10px 20px",
            borderRadius: "999px",
            border: "none",
            backgroundColor: "#8a4a2f",
            color: "#fff",
            fontWeight: 600,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
