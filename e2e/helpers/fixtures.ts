// PNG 1x1 real y decodible — comprimirImagen() llama a createImageBitmap
// sobre el archivo antes de subirlo; con bytes arbitrarios fallaría el
// decode (silenciosamente cae al archivo original, per su propio catch),
// así que mejor usar una imagen real para ejercitar el camino completo.
export const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export function comprobanteDePrueba() {
  return {
    name: "comprobante.png",
    mimeType: "image/png",
    buffer: Buffer.from(PNG_1X1_BASE64, "base64"),
  };
}
