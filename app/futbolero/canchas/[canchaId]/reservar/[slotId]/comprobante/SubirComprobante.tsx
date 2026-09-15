"use client";

import { useRouter } from "next/navigation";
import { ComprobanteUploader } from "@/components/shared/ComprobanteUploader";

export function SubirComprobante({ reservaId }: { reservaId: string }) {
  const router = useRouter();
  return (
    <ComprobanteUploader
      reservaId={reservaId}
      onExito={() => router.push(`/futbolero/reservas/${reservaId}`)}
    />
  );
}
