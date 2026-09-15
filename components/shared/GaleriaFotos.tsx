import { ImageOff } from "lucide-react";

// Carrusel simple con scroll-snap nativo — sin JS, funciona igual de bien
// en mobile (swipe) que en desktop.
export function GaleriaFotos({ urls, alt }: { urls: string[]; alt: string }) {
  if (urls.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-muted">
        <ImageOff className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-xl">
      {urls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt={`${alt} — foto ${i + 1}`}
          className="aspect-video w-full shrink-0 snap-center rounded-xl object-cover"
        />
      ))}
    </div>
  );
}
