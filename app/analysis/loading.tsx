import SideNav from "@/components/layout/SideNav";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg ${className}`} style={{ background: "var(--border)" }} />;
}

export default function AnalysisLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <SideNav />
      <main className="lg:ml-[220px] pt-14">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
          <Skeleton className="h-7 w-36" />
          <div className="card flex items-center gap-6">
            <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="card space-y-3">
                <Skeleton className="h-3 w-1/3" />
                {[...Array(3)].map((_, j) => <Skeleton key={j} className="h-3 w-full" />)}
              </div>
            ))}
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card space-y-3">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-16" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
