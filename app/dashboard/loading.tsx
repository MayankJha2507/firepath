import SideNav from "@/components/layout/SideNav";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: "var(--border)" }}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <SideNav />
      <main className="lg:ml-[220px] pt-14">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card space-y-3">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-2.5 w-3/4" />
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card space-y-3">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-40" />
            </div>
            <div className="card space-y-3">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-40" />
            </div>
          </div>
          <div className="card space-y-3">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </main>
    </div>
  );
}
