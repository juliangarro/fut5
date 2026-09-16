import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoCanchas() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex flex-col gap-3.5 rounded-b-header bg-card px-5 pt-[52px] pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="size-9 rounded-full" />
        </div>
        <Skeleton className="h-[50px] w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3.5 px-5 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-card bg-card shadow-sm">
            <Skeleton className="h-24 w-full rounded-none" />
            <div className="flex flex-col gap-1.5 p-3.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
