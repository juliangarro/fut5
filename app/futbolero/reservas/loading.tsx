import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoReservas() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="mx-[22px] mt-[52px] h-8 w-40" />
      <div className="flex flex-col gap-4 px-[22px]">
        <Skeleton className="h-[52px] w-full rounded-full" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
