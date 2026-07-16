-- Estado intermedio de seguridad: RLS activo, sin policies para
-- anon/authenticated. El acceso queda reservado a la service_role key
-- (servidor, n8n, scripts de Code) hasta que se implemente Supabase Auth
-- con roles reales (Admin / Celador por aula / Finanzas — ver USERS en
-- attendance-store.ts para el mapeo de roles ya definido en el frontend).
--
-- Esto es intencional, no un olvido: documentamos el estado actual en vez
-- de dejarlo implícito.

comment on table public.aulas is
  'RLS activo sin policies — acceso solo vía service_role hasta implementar Auth.';
comment on table public.participantes is
  'RLS activo sin policies — acceso solo vía service_role hasta implementar Auth.';
comment on table public.aula_participantes is
  'RLS activo sin policies — acceso solo vía service_role hasta implementar Auth.';
comment on table public.asistencias is
  'RLS activo sin policies — acceso solo vía service_role hasta implementar Auth.';
comment on table public.temas is
  'RLS activo sin policies — acceso solo vía service_role hasta implementar Auth.';

-- Scaffold para cuando se implemente Auth (NO activar todavía — queda
-- comentado a propósito, es referencia para la tarea futura):
--
-- create policy "admin_full_access" on public.asistencias
--   for all using (
--     exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
--   );
--
-- create policy "celador_solo_su_aula" on public.asistencias
--   for select using (
--     exists (
--       select 1 from public.profiles p
--       join public.aula_participantes ap on ap.aula_id = asistencias.aula_id
--       where p.id = auth.uid() and p.role = 'celador' and p.aula_id = asistencias.aula_id
--     )
--   );
