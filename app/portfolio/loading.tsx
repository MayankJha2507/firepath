import SideNav from "@/components/layout/SideNav";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg ${className}`} style={{ background: "var(--border)" }} />;
}

export default function PortfolioLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <SideNav />
      <main className="lg:ml-[220px] pt-14">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-72 rounded-xl" />
          <div className="card space-y-4">
            <Skeleton className="h-3 w-1/4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
