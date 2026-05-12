import SideNav from "@/components/layout/SideNav";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg ${className}`} style={{ background: "var(--border)" }} />;
}

export default function HistoryLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <SideNav />
      <main className="lg:ml-[220px] pt-14">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
          <Skeleton className="h-7 w-48" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card space-y-3">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-44" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
