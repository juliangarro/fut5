import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cobroGrupalHabilitado } from "@/lib/featureFlags";

// Genera (o devuelve, si ya existe) el link público de cobro grupal para
// esta reserva. `cantidadAportes` es el número de pagos que se van a
// recolectar por el link — no necesariamente amigos distintos, y no incluye
// al organizador salvo que también quiera pagar su parte por ahí. El monto
// por aporte se reparte parejo (redondeado hacia arriba) para que la suma
// nunca quede por debajo del monto de la reserva.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reservaId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Defensa en profundidad: la UI ya oculta el botón que llega acá cuando el
  // flag está apagado (ver page.tsx de la reserva), esto cubre un cliente
  // viejo cacheado. Reservas que YA están en modo grupal no se tocan — el
  // flag solo bloquea arrancar una nueva (ver 00000000000008_flag_cobro_grupal.sql).
  if (!(await cobroGrupalHabilitado(supabase))) {
    return NextResponse.json({ error: "El cobro grupal no está disponible en este momento." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const cantidadAportes = Number(body?.cantidadAportes);
  if (!Number.isInteger(cantidadAportes) || cantidadAportes < 2 || cantidadAportes > 30) {
    return NextResponse.json({ error: "La cantidad debe ser un número entre 2 y 30." }, { status: 400 });
  }

  const { data: reserva, error: errorReserva } = await supabase
    .from("reservas")
    .select("id, futbolero_id, estado, modo_cobro, token_cobro")
    .eq("id", reservaId)
    .single();

  if (errorReserva || !reserva) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }
  if (reserva.futbolero_id !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (reserva.estado !== "creada") {
    return NextResponse.json(
      { error: "Ya no se puede abrir un cobro grupal para esta reserva." },
      { status: 409 }
    );
  }
  if (reserva.modo_cobro === "grupal" && reserva.token_cobro) {
    return NextResponse.json({ token: reserva.token_cobro });
  }

  const token = crypto.randomUUID();
  const { error: errorUpdate } = await supabase
    .from("reservas")
    .update({ modo_cobro: "grupal", token_cobro: token, cantidad_aportes: cantidadAportes })
    .eq("id", reservaId);

  if (errorUpdate) {
    return NextResponse.json({ error: errorUpdate.message }, { status: 500 });
  }

  return NextResponse.json({ token });
}
