import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔥</div>
        <div className="font-bold text-2xl mb-1" style={{ color: "var(--text-primary)" }}>
          FIRE<span style={{ color: "var(--orange)" }}>path</span>
        </div>
        <p className="text-sm mt-3 mb-6" style={{ color: "var(--text-secondary)" }}>
          Page not found.
        </p>
        <Link href="/dashboard" className="btn-primary px-6">
          Go to dashboard →
        </Link>
      </div>
    </div>
  );
}
