-- Habilita Realtime (postgres_changes) sobre reservas: el Futbolero necesita
-- ver el cambio de estado de su Reserva sin recargar (ver SPEC.md 3.1.7) y el
-- AdminCancha necesita ver aparecer nuevas reservas pendientes_validacion en
-- su cola en vivo. Realtime respeta las políticas RLS ya definidas.
alter publication supabase_realtime add table reservas;
