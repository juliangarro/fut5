import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parsearAmenidades } from "@/lib/amenidades";
import { SelectorCancha } from "@/components/admin/SelectorCancha";
import { FotosCanchaUploader } from "@/components/admin/FotosCanchaUploader";
import { InfoCanchaForm } from "./InfoCanchaForm";
import { Card } from "@/components/ui/card";

export default async function InfoCanchaPage({
  params,
}: {
  params: Promise<{ canchaId: string }>;
}) {
  const { canchaId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: cancha } = await supabase
    .from("canchas")
    .select("id, admin_id, nombre, numero_sinpe, descripcion, politica_cancelacion, amenidades, fotos")
    .eq("id", canchaId)
    .single();

  if (!cancha || cancha.admin_id !== user.id) notFound();

  const { data: misCanchas } = await supabase
    .from("canchas")
    .select("id, nombre")
    .eq("admin_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Información de la cancha</h1>
        <SelectorCancha
          canchas={misCanchas ?? []}
          canchaActualId={canchaId}
          sufijoRuta="info"
        />
      </div>

      <Card className="gap-3 px-4">
        <h2 className="font-medium">Fotos</h2>
        <FotosCanchaUploader canchaId={canchaId} fotosIniciales={cancha.fotos ?? []} />
      </Card>

      <Card className="px-4">
        <InfoCanchaForm
          canchaId={canchaId}
          cancha={{
            nombre: cancha.nombre,
            numero_sinpe: cancha.numero_sinpe,
            descripcion: cancha.descripcion,
            politica_cancelacion: cancha.politica_cancelacion,
            amenidades: parsearAmenidades(cancha.amenidades),
          }}
        />
      </Card>
    </div>
  );
}
