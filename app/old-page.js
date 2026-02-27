import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "Manrope, system-ui, sans-serif",
        background: "#f8f8f6",
      }}
    >
      <section style={{ maxWidth: 680, padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 40, marginBottom: 12 }}>MaplePlan Prototype</h1>
        <p style={{ color: "#475569", marginBottom: 24 }}>
          Submission-ready flow hosted as a deployable Next.js app on Vercel.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/planner"
            style={{
              display: "inline-block",
              background: "#111827",
              color: "#fff",
              textDecoration: "none",
              padding: "12px 20px",
              borderRadius: 999,
              fontWeight: 600,
            }}
          >
            Open React app flow
          </Link>
          <Link
            href="/prototype/screen1_planner_home.html"
            style={{
              display: "inline-block",
              background: "#e2e8f0",
              color: "#0f172a",
              textDecoration: "none",
              padding: "12px 20px",
              borderRadius: 999,
              fontWeight: 600,
            }}
          >
            Open static prototype
          </Link>
        </div>
      </section>
    </main>
  );
}
