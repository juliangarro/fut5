// Tipos escritos a mano a partir de supabase/migrations/. Regenerar con
// `npx supabase gen types typescript --project-id <ref> > lib/types/database.ts`
// una vez exista un proyecto Supabase real, y luego reemplazar este archivo.
//
// Nota: cada tabla incluye `Relationships: []` aunque no se usen embeds de
// PostgREST (ver DECISIONS.md) porque supabase-js lo requiere estructuralmente
// para tipar bien `.from().select()/.insert()/.update()` — sin este campo la
// inferencia de tipos colapsa a `never` en vez de dar el tipo esperado.

export type RolUsuario = "futbolero" | "admin_cancha";
export type EstadoSlot = "disponible" | "retenido" | "reservado" | "bloqueado";
export type EstadoReserva =
  | "creada"
  | "pendiente_validacion"
  | "confirmada"
  | "rechazada"
  | "expirada"
  | "cancelada";
export type CanalNotificacion = "push" | "email";
export type EstadoEnvioNotificacion = "pendiente" | "enviada" | "fallida";
export type ModoCobro = "individual" | "grupal";
export type EstadoAporte = "pendiente" | "comprobante_subido" | "confirmado" | "rechazado";
export type TierSuscripcion = "pro" | "pro_plus";
export type EstadoSuscripcion = "activa" | "en_gracia" | "vencida";
export type AddonSuscripcion = "destacado" | "moderacion_reportes";
export type EstadoAddon = "activo" | "vencido";

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          rol: RolUsuario;
          nombre: string;
          telefono: string | null;
          email: string;
          auth_provider: string;
          created_at: string;
        };
        Insert: Record<string, never>; // se crea vía trigger on_auth_user_created
        Update: Partial<{ nombre: string; telefono: string | null }>;
        Relationships: [];
      };
      canchas: {
        Row: {
          id: string;
          admin_id: string;
          nombre: string;
          ubicacion: string | null; // geography(point) como WKT/GeoJSON según el select
          descripcion: string | null;
          amenidades: unknown;
          fotos: string[];
          numero_sinpe: string;
          politica_cancelacion: string | null;
          rating_promedio: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          nombre: string;
          descripcion?: string | null;
          amenidades?: unknown;
          fotos?: string[];
          numero_sinpe: string;
          politica_cancelacion?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["canchas"]["Insert"]>;
        Relationships: [];
      };
      slots: {
        Row: {
          id: string;
          cancha_id: string;
          fecha: string;
          hora_inicio: string;
          hora_fin: string;
          precio: number;
          estado: EstadoSlot;
          regla_recurrente_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cancha_id: string;
          fecha: string;
          hora_inicio: string;
          hora_fin: string;
          precio: number;
          estado?: EstadoSlot;
          regla_recurrente_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["slots"]["Insert"]>;
        Relationships: [];
      };
      reservas: {
        Row: {
          id: string;
          futbolero_id: string;
          slot_id: string;
          estado: EstadoReserva;
          comprobante_url: string | null;
          monto: number;
          motivo_rechazo: string | null;
          creada_at: string;
          comprobante_subido_at: string | null;
          expira_at: string | null;
          resuelta_at: string | null;
          modo_cobro: ModoCobro;
          token_cobro: string | null;
          cantidad_aportes: number | null;
        };
        Insert: {
          id?: string;
          futbolero_id: string;
          slot_id: string;
          monto: number;
        };
        Update: Partial<{
          comprobante_url: string;
          estado: EstadoReserva;
          motivo_rechazo: string;
          modo_cobro: ModoCobro;
          token_cobro: string;
          cantidad_aportes: number;
        }>;
        Relationships: [];
      };
      aportes: {
        Row: {
          id: string;
          reserva_id: string;
          nombre: string;
          telefono: string | null;
          monto: number;
          estado: EstadoAporte;
          motivo_rechazo: string | null;
          comprobante_url: string | null;
          comprobante_subido_at: string | null;
          resuelto_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reserva_id: string;
          nombre: string;
          telefono?: string | null;
          monto: number;
        };
        Update: Partial<{
          estado: EstadoAporte;
          motivo_rechazo: string | null;
          comprobante_url: string;
          comprobante_subido_at: string;
          resuelto_at: string;
        }>;
        Relationships: [];
      };
      configuracion: {
        Row: { clave: string; valor: string };
        Insert: { clave: string; valor: string };
        Update: Partial<{ valor: string }>;
        Relationships: [];
      };
      suscripciones: {
        Row: {
          admin_id: string;
          tier: TierSuscripcion;
          estado: EstadoSuscripcion;
          periodo_actual_fin: string;
          gracia_hasta: string | null;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          admin_id: string;
          tier: TierSuscripcion;
          periodo_actual_fin: string;
          estado?: EstadoSuscripcion;
          gracia_hasta?: string | null;
          notas?: string | null;
        };
        Update: Partial<{
          tier: TierSuscripcion;
          estado: EstadoSuscripcion;
          periodo_actual_fin: string;
          gracia_hasta: string | null;
          notas: string | null;
        }>;
        Relationships: [];
      };
      addons_suscripcion: {
        Row: {
          id: string;
          admin_id: string;
          addon: AddonSuscripcion;
          cancha_id: string | null;
          estado: EstadoAddon;
          periodo_actual_fin: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          addon: AddonSuscripcion;
          cancha_id?: string | null;
          periodo_actual_fin: string;
          estado?: EstadoAddon;
        };
        Update: Partial<{
          estado: EstadoAddon;
          periodo_actual_fin: string;
        }>;
        Relationships: [];
      };
      calificaciones: {
        Row: {
          id: string;
          cancha_id: string;
          futbolero_id: string;
          reserva_id: string;
          puntaje: number;
          comentario: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cancha_id: string;
          futbolero_id: string;
          reserva_id: string;
          puntaje: number;
          comentario?: string | null;
        };
        Update: Partial<{ puntaje: number; comentario: string | null }>;
        Relationships: [];
      };
      notificaciones: {
        Row: {
          id: string;
          user_id: string;
          tipo: string;
          canal: CanalNotificacion;
          estado_envio: EstadoEnvioNotificacion;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tipo: string;
          canal: CanalNotificacion;
          estado_envio?: EstadoEnvioNotificacion;
        };
        Update: Partial<{ estado_envio: EstadoEnvioNotificacion }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      expirar_reservas_vencidas: {
        Args: Record<string, never>;
        Returns: void;
      };
      vencer_suscripciones_y_addons: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
  };
}
