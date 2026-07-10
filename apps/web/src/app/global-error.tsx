"use client";

/**
 * Last-resort error boundary: without it, a runtime error anywhere in the
 * tree (e.g. the DOM mutated behind React's back by a browser translator or
 * an extension) unmounts the whole app into a dead blank page. Recovery is a
 * full reload rather than `reset()` because the foreign DOM mutations that
 * typically land here survive a mere re-render.
 *
 * Must render its own <html>/<body>: it replaces the root layout entirely.
 */
export default function GlobalError({ error }: { error: Error }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          color: "#18181b",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, color: "#51525c", marginBottom: 20 }}>
            Se produjo un error inesperado. Si la página está traducida
            automáticamente por el navegador, desactiva la traducción e
            inténtalo de nuevo.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#18181b",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recargar la página
          </button>
          {error?.message ? (
            <p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 20 }}>
              {error.message}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
