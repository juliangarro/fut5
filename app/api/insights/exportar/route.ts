import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rangoPeriodo, PERIODOS, type PeriodoKey } from "@/lib/insights";

function csvEscape(valor: string) {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const periodoParam = (request.nextUrl.searchParams.get("periodo") ?? "30") as PeriodoKey;
  const dias = PERIODOS[periodoParam] ?? 30;
  const { desde, hasta } = rangoPeriodo(dias);

  const { data: canchas } = await supabase.from("canchas").select("id, nombre").eq("admin_id", user.id);
  const canchaIds = (canchas ?? []).map((c) => c.id);
  const canchaPorId = new Map((canchas ?? []).map((c) => [c.id, c.nombre]));
  if (canchaIds.length === 0) {
    return new NextResponse("cancha,fecha,hora,futbolero,estado,monto\n", {
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  const { data: slots } = await supabase
    .from("slots")
    .select("id, fecha, hora_inicio, cancha_id")
    .in("cancha_id", canchaIds)
    .gte("fecha", desde)
    .lte("fecha", hasta);
  const slotPorId = new Map((slots ?? []).map((s) => [s.id, s]));
  const slotIds = (slots ?? []).map((s) => s.id);

  const { data: reservas } = slotIds.length
    ? await supabase
        .from("reservas")
        .select("futbolero_id, estado, monto, slot_id")
        .in("slot_id", slotIds)
        .order("slot_id")
    : { data: [] };

  const futboleroIds = [...new Set((reservas ?? []).map((r) => r.futbolero_id))];
  const { data: futboleros } = futboleroIds.length
    ? await supabase.from("usuarios").select("id, nombre").in("id", futboleroIds)
    : { data: [] };
  const nombrePorId = new Map((futboleros ?? []).map((f) => [f.id, f.nombre]));

  const filas = (reservas ?? []).map((r) => {
    const slot = slotPorId.get(r.slot_id);
    return [
      csvEscape(canchaPorId.get(slot?.cancha_id ?? "") ?? ""),
      slot?.fecha ?? "",
      slot?.hora_inicio.slice(0, 5) ?? "",
      csvEscape(nombrePorId.get(r.futbolero_id) ?? ""),
      r.estado,
      String(r.monto),
    ].join(",");
  });

  const csv = ["cancha,fecha,hora,futbolero,estado,monto", ...filas].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservas_${desde}_a_${hasta}.csv"`,
    },
  });
}
