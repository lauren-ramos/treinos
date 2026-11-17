-- Meu Treino: login pelo Clerk (mesmo padrão do Plano CIAAR).
-- Rode DEPOIS de 0001_init.sql, no SQL Editor do projeto Supabase do Meu Treino. Pode rodar de novo.
--
-- Antes de usar, ligue o Clerk como provedor de login do Supabase:
--   1) Clerk Dashboard -> Integrations -> Supabase -> Activate (copie o "Clerk domain").
--   2) Supabase -> Authentication -> Sign In / Up -> Third-Party Auth -> Add provider -> Clerk (cole o domain).
-- O token de sessão do Clerk vale como login no Supabase; o id da usuária é o claim `sub` (texto, ex.: user_2abc...).
-- Por isso user_id deixa de ser uuid (auth.users) e passa a ser texto.

do $$
declare t text;
begin
  foreach t in array array['profiles','custom_exercises','planned_workouts','planned_items','sessions','session_exercises','session_sets','goals','achievements','videos']
  loop
    execute format('drop policy if exists "%1$s_select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$I', t);
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_user_id_fkey');
    execute format('alter table public.%I alter column user_id drop default', t);
    execute format('alter table public.%I alter column user_id type text using user_id::text', t);
    execute format('alter table public.%I alter column user_id set default (auth.jwt() ->> ''sub'')', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_select" on public.%1$I for select to authenticated using (user_id = (select auth.jwt() ->> ''sub''))', t);
    execute format('create policy "%1$s_insert" on public.%1$I for insert to authenticated with check (user_id = (select auth.jwt() ->> ''sub''))', t);
    execute format('create policy "%1$s_update" on public.%1$I for update to authenticated using (user_id = (select auth.jwt() ->> ''sub'')) with check (user_id = (select auth.jwt() ->> ''sub''))', t);
    execute format('create policy "%1$s_delete" on public.%1$I for delete to authenticated using (user_id = (select auth.jwt() ->> ''sub''))', t);
  end loop;
end $$;

-- o perfil usa o id do usuário (texto) como chave
alter table public.profiles alter column id type text using id::text;
