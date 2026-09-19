-- Cierra un gap de autorización de code review: las políticas RLS
-- `reservas_update_futbolero` / `reservas_update_admin` (00000000000003)
-- solo verifican propiedad de fila (`futbolero_id = auth.uid()` /
-- `es_admin_de_slot`), no qué columnas ni qué transición de estado es
-- válida. Eso se documentó como validado "en las rutas API de Next.js",
-- pero esa capa es evitable: cualquier futbolero puede llamar al cliente
-- Supabase directamente desde el browser con su propia sesión y hacer
-- `update({ estado: 'confirmada' })` sobre su propia reserva, saltándose
-- por completo la validación manual del comprobante SINPE (y quedándose
-- además el slot como 'reservado', vía el trigger sincronizar_estado_reserva).
--
-- Este trigger es la capa de autorización real (RLS ya limita la fila;
-- esto limita la transición). Corre ANTES que `reservas_sincronizar_estado`
-- (orden alfabético de nombre de trigger: "autorizar" < "sincronizar"),
-- así valida lo que el cliente mandó, no el estado ya reescrito por ese
-- otro trigger.
--
-- No aplica a escrituras del service role (cron de expiración, etc.):
-- auth.uid() es null en ese contexto porque el JWT del service role no
-- trae un `sub` de auth.users.
create function autorizar_transicion_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.futbolero_id <> old.futbolero_id
    or new.slot_id <> old.slot_id
    or new.monto <> old.monto
  then
    raise exception 'No se puede modificar este campo de la reserva';
  end if;

  if es_admin_de_slot(old.slot_id) then
    if new.estado <> old.estado and not (
      old.estado = 'pendiente_validacion' and new.estado in ('confirmada', 'rechazada')
    ) then
      raise exception 'Transición de estado no permitida';
    end if;
    return new;
  end if;

  -- Dueño de la reserva (futbolero): solo puede cancelar desde 'creada' o
  -- subir el comprobante una vez (comprobante_url null -> valor, lo que
  -- dispara reservas_sincronizar_estado y no requiere tocar `estado` a mano).
  if old.futbolero_id = auth.uid() then
    if new.estado <> old.estado and not (old.estado = 'creada' and new.estado = 'cancelada') then
      raise exception 'Transición de estado no permitida';
    end if;
    if old.comprobante_url is not null and new.comprobante_url <> old.comprobante_url then
      raise exception 'El comprobante ya fue subido';
    end if;
    return new;
  end if;

  raise exception 'No autorizado';
end;
$$;

create trigger reservas_autorizar_transicion
  before update on reservas
  for each row execute function autorizar_transicion_reserva();
