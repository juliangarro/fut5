import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoValidaciones() {
  return (
    <div className="flex flex-col gap-5 px-[22px] pt-[52px] pb-8">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-[240px] w-full rounded-panel" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[110px] w-full rounded-panel" />
        ))}
      </div>
    </div>
  );
}
