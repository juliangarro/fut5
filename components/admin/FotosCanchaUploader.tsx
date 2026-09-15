"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen } from "@/lib/comprimirImagen";
import { Button } from "@/components/ui/button";

const MAX_FOTOS = 8;

export function FotosCanchaUploader({
  canchaId,
  fotosIniciales,
}: {
  canchaId: string;
  fotosIniciales: string[];
}) {
  const [fotos, setFotos] = useState(fotosIniciales);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  function urlPublica(path: string) {
    return supabase.storage.from("fotos-cancha").getPublicUrl(path).data.publicUrl;
  }

  async function guardarFotos(nuevaLista: string[]) {
    const { error } = await supabase.from("canchas").update({ fotos: nuevaLista }).eq("id", canchaId);
    if (error) {
      toast.error("No se pudo guardar el cambio: " + error.message);
      return false;
    }
    return true;
  }

  async function agregarFotos(files: FileList) {
    const disponibles = MAX_FOTOS - fotos.length;
    if (disponibles <= 0) {
      toast.error(`Máximo ${MAX_FOTOS} fotos por cancha.`);
      return;
    }
    setSubiendo(true);
    const archivos = Array.from(files).slice(0, disponibles);
    const nuevasRutas: string[] = [];

    for (const file of archivos) {
      const comprimido = await comprimirImagen(file);
      const extension = comprimido.type === "image/png" ? "png" : "jpg";
      const path = `${canchaId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("fotos-cancha")
        .upload(path, comprimido, { contentType: comprimido.type });
      if (error) {
        toast.error(`No se pudo subir una foto: ${error.message}`);
        continue;
      }
      nuevasRutas.push(path);
    }

    if (nuevasRutas.length) {
      const actualizadas = [...fotos, ...nuevasRutas];
      if (await guardarFotos(actualizadas)) {
        setFotos(actualizadas);
        toast.success(`${nuevasRutas.length} foto${nuevasRutas.length > 1 ? "s" : ""} agregada${nuevasRutas.length > 1 ? "s" : ""}`);
      }
    }
    setSubiendo(false);
  }

  async function borrarFoto(path: string) {
    const actualizadas = fotos.filter((f) => f !== path);
    if (await guardarFotos(actualizadas)) {
      setFotos(actualizadas);
      await supabase.storage.from("fotos-cancha").remove([path]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {fotos.map((path) => (
          <div key={path} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlPublica(path)} alt="Foto de la cancha" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => borrarFoto(path)}
              aria-label="Quitar foto"
              className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        {fotos.length < MAX_FOTOS && (
          <button
            type="button"
            disabled={subiendo}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            {subiendo ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
            <span className="text-xs">{subiendo ? "Subiendo…" : "Agregar"}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) agregarFotos(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">
        Hasta {MAX_FOTOS} fotos. La primera es la que se muestra en la búsqueda.
      </p>
      {fotos.length === 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={subiendo}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus />
          Subir fotos
        </Button>
      )}
    </div>
  );
}
