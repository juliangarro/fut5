// Comprime/redimensiona una imagen en el cliente antes de subirla (ver
// SPEC.md 10.8: "no subir archivos sin procesar directamente desde el
// cliente"). Mantiene legible el texto de un comprobante SINPE: dimensión
// máxima generosa (1920px) y calidad alta (0.85), solo baja el peso del
// archivo que suele venir directo de la cámara del teléfono.
const DIMENSION_MAXIMA = 1920;
const CALIDAD_JPEG = 0.85;

export async function comprimirImagen(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const escala = Math.min(1, DIMENSION_MAXIMA / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, ancho, alto);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPEG)
  );
  if (!blob || blob.size >= file.size) return file;

  const nombre = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], nombre, { type: "image/jpeg" });
}
