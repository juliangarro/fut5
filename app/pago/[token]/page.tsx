import { PaginaAporte } from "@/components/pago/PaginaAporte";

// Ruta pública, fuera de /futbolero — sin auth. El amigo llega acá desde un
// link de WhatsApp; el fetch de datos y las escrituras van todas contra
// /api/pago/[token]/... (service role, ver esos Route Handlers). El único
// trabajo del Server Component es pasar el token; todo lo demás es cliente
// porque necesita estado de formulario e interacción inmediata.
export default async function PaginaPagoPublica({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PaginaAporte token={token} />;
}
