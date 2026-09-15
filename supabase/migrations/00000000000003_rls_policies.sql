-- Row Level Security. Toda autorización de escritura y todo acceso a un
-- Comprobante se valida acá, no solo en el frontend (ver SPEC.md 2 y 10.1).
--
-- Nota de diseño (ver 10.7): RLS acá garantiza los límites de propiedad de fila
-- (nadie toca filas que no le pertenecen). Qué transición de estado de Reserva
-- es válida para cada rol (ej. un futbolero no puede poner estado=confirmada)
-- se valida además en las API routes de Next.js, que son las únicas que deben
-- escribir `reservas.estado` directamente — ver DECISIONS.md.

-- Evitar que un usuario se autopromueva de futbolero a admin_cancha por UPDATE directo.
create function evitar_cambio_de_rol()
returns trigger
language plpgsql
as $$
begin
  if new.rol <> old.rol then
    raise exception 'No se puede cambiar el rol de un usuario existente';
  end if;
  return new;
end;
$$;

create trigger usuarios_evitar_cambio_rol
  before update on usuarios
  for each row execute function evitar_cambio_de_rol();

create function rol_actual()
returns rol_usuario
language sql
stable
as $$
  select rol from usuarios where id = auth.uid();
$$;

create function es_admin_de_cancha(p_cancha_id uuid)
returns boolean
language sql
stable
as $$
  select exists (select 1 from canchas where id = p_cancha_id and admin_id = auth.uid());
$$;

create function es_admin_de_slot(p_slot_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from slots s
    join canchas c on c.id = s.cancha_id
    where s.id = p_slot_id and c.admin_id = auth.uid()
  );
$$;

alter table usuarios enable row level security;
alter table canchas enable row level security;
alter table reglas_horario enable row level security;
alter table slots enable row level security;
alter table reservas enable row level security;
alter table calificaciones enable row level security;
alter table notificaciones enable row level security;

-- usuarios ------------------------------------------------------------
create policy usuarios_select_propio on usuarios
  for select using (id = auth.uid());

create policy usuarios_select_admin_de_sus_futboleros on usuarios
  for select using (
    exists (
      select 1 from reservas r
      join slots s on s.id = r.slot_id
      join canchas c on c.id = s.cancha_id
      where r.futbolero_id = usuarios.id and c.admin_id = auth.uid()
    )
  );

create policy usuarios_update_propio on usuarios
  for update using (id = auth.uid()) with check (id = auth.uid());

-- canchas ---------------------------------------------------------------
create policy canchas_select_publico on canchas
  for select using (true);

create policy canchas_insert_admin on canchas
  for insert with check (admin_id = auth.uid() and rol_actual() = 'admin_cancha');

create policy canchas_update_propia on canchas
  for update using (admin_id = auth.uid()) with check (admin_id = auth.uid());

create policy canchas_delete_propia on canchas
  for delete using (admin_id = auth.uid());

-- reglas_horario ----------------------------------------------------------
create policy reglas_horario_select_propia on reglas_horario
  for select using (es_admin_de_cancha(cancha_id));

create policy reglas_horario_insert_propia on reglas_horario
  for insert with check (es_admin_de_cancha(cancha_id));

create policy reglas_horario_update_propia on reglas_horario
  for update using (es_admin_de_cancha(cancha_id)) with check (es_admin_de_cancha(cancha_id));

create policy reglas_horario_delete_propia on reglas_horario
  for delete using (es_admin_de_cancha(cancha_id));

-- slots -------------------------------------------------------------------
create policy slots_select_publico on slots
  for select using (true);

create policy slots_insert_admin on slots
  for insert with check (es_admin_de_cancha(cancha_id));

create policy slots_update_admin on slots
  for update using (es_admin_de_cancha(cancha_id)) with check (es_admin_de_cancha(cancha_id));

create policy slots_delete_admin on slots
  for delete using (es_admin_de_cancha(cancha_id));

-- reservas ------------------------------------------------------------------
create policy reservas_select_propia_o_admin on reservas
  for select using (futbolero_id = auth.uid() or es_admin_de_slot(slot_id));

create policy reservas_insert_futbolero on reservas
  for insert with check (futbolero_id = auth.uid() and rol_actual() = 'futbolero');

create policy reservas_update_futbolero on reservas
  for update using (futbolero_id = auth.uid()) with check (futbolero_id = auth.uid());

create policy reservas_update_admin on reservas
  for update using (es_admin_de_slot(slot_id)) with check (es_admin_de_slot(slot_id));

-- calificaciones --------------------------------------------------------------
create policy calificaciones_select_publico on calificaciones
  for select using (true);

create policy calificaciones_insert_propia on calificaciones
  for insert with check (
    futbolero_id = auth.uid()
    and exists (
      select 1 from reservas r
      join slots s on s.id = r.slot_id
      where r.id = reserva_id
        and r.futbolero_id = auth.uid()
        and r.estado = 'confirmada'
        and s.fecha < current_date
    )
  );

create policy calificaciones_update_propia on calificaciones
  for update using (futbolero_id = auth.uid()) with check (futbolero_id = auth.uid());

create policy calificaciones_delete_propia on calificaciones
  for delete using (futbolero_id = auth.uid());

-- notificaciones ------------------------------------------------------------
-- Sin políticas de insert/update: solo el backend (service role) las escribe,
-- y el service role bypassea RLS.
create policy notificaciones_select_propia on notificaciones
  for select using (user_id = auth.uid());
