import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BotonVolver({
  href,
  "aria-label": ariaLabel,
  sobreFoto = false,
  className,
}: {
  href: string;
  "aria-label": string;
  sobreFoto?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        "flex size-11 items-center justify-center rounded-full",
        sobreFoto ? "bg-background shadow-sm" : "bg-card",
        className
      )}
    >
      <ChevronLeft className="size-5" />
    </Link>
  );
}
