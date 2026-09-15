import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Bypasea RLS. Usar únicamente en Route Handlers server-side para operaciones
// que un usuario autenticado no puede hacer por diseño (ej. expirar reservas
// vencidas, insertar notificaciones). Nunca importar desde código de cliente.
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
