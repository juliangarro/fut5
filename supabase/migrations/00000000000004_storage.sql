-- Buckets de Storage: fotos de cancha (públicas) y comprobantes (privados).
-- Convención de paths (ver DECISIONS.md):
--   fotos-cancha/{cancha_id}/{archivo}
--   comprobantes/{reserva_id}/{archivo}
-- El primer segmento del path es lo que las policies usan para resolver
-- propiedad — nunca servir un Comprobante por URL pública sin autenticación
-- (ver SPEC.md 5.2 y 10.1).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-cancha', 'fotos-cancha', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- fotos-cancha: lectura pública, escritura solo del admin dueño de la cancha.
create policy fotos_cancha_select_publico on storage.objects
  for select using (bucket_id = 'fotos-cancha');

create policy fotos_cancha_insert_admin on storage.objects
  for insert with check (
    bucket_id = 'fotos-cancha'
    and es_admin_de_cancha(((storage.foldername(name))[1])::uuid)
  );

create policy fotos_cancha_delete_admin on storage.objects
  for delete using (
    bucket_id = 'fotos-cancha'
    and es_admin_de_cancha(((storage.foldername(name))[1])::uuid)
  );

-- comprobantes: privado. Solo el futbolero dueño de la reserva y el admin de
-- esa cancha pueden ver o subir el archivo. Nunca público, nunca indexado.
create policy comprobantes_select_dueno on storage.objects
  for select using (
    bucket_id = 'comprobantes'
    and exists (
      select 1 from reservas r
      join slots s on s.id = r.slot_id
      join canchas c on c.id = s.cancha_id
      where r.id = ((storage.foldername(name))[1])::uuid
        and (r.futbolero_id = auth.uid() or c.admin_id = auth.uid())
    )
  );

create policy comprobantes_insert_dueno on storage.objects
  for insert with check (
    bucket_id = 'comprobantes'
    and exists (
      select 1 from reservas r
      where r.id = ((storage.foldername(name))[1])::uuid
        and r.futbolero_id = auth.uid()
        and r.estado = 'creada'
    )
  );
