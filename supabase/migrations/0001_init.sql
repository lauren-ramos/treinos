-- Meu Treino: esquema inicial
-- Cada tabela espelha uma tabela local (IndexedDB) do app. O app gera os UUIDs no aparelho e usa upsert por id,
-- então reenviar dados nunca duplica registros. A exclusão é lógica (deleted = true) para propagar entre aparelhos.
-- Segurança: RLS ativo em todas as tabelas; cada usuário só enxerga e altera as próprias linhas.

-- ---------------------------------------------------------------- grupos musculares (referência, somente leitura)
create table if not exists public.muscle_groups (
  id text primary key,
  name text not null,
  position int not null default 0
);
insert into public.muscle_groups (id, name, position) values
  ('peito','Peito',1),('costas','Costas',2),('ombros','Ombros',3),('biceps','Bíceps',4),('triceps','Tríceps',5),
  ('quadriceps','Quadríceps',6),('posteriores','Posteriores',7),('gluteos','Glúteos',8),('panturrilhas','Panturrilhas',9),
  ('abdomen','Abdômen',10),('corpo-todo','Corpo todo',11)
on conflict (id) do nothing;
alter table public.muscle_groups enable row level security;
drop policy if exists "muscle_groups_read" on public.muscle_groups;
create policy "muscle_groups_read" on public.muscle_groups for select to authenticated using (true);

-- ---------------------------------------------------------------- tabelas do usuário
-- profiles.id = auth.uid()
create table if not exists public.profiles (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default '',
  photo text not null default '',
  goal_text text not null default '',
  preferred_location text not null default 'ambos',
  available_days jsonb not null default '[1,3,5]',
  theme text not null default 'system',
  default_rest int not null default 60,
  auto_rest boolean not null default true,
  sound boolean not null default true,
  vibrate boolean not null default true,
  notifications boolean not null default false,
  keep_awake boolean not null default true,
  onboarded boolean not null default false,
  deleted boolean not null default false,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);

create table if not exists public.custom_exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text not null default '',
  secondary jsonb not null default '[]',
  description text not null default '',
  equipment jsonb not null default '[]',
  sets int not null default 3,
  reps text not null default '10',
  unit text not null default 'reps',
  rest int not null default 60,
  load text not null default '',
  difficulty text not null default 'iniciante',
  location jsonb not null default '["academia","casa"]',
  notes text not null default '',
  steps jsonb not null default '[]',
  demo text not null default '',
  deleted boolean not null default false,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);

-- planejamento semanal: treinos planejados (date nulo + template = modelo salvo)
create table if not exists public.planned_workouts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date,
  name text not null default 'Treino',
  kind text not null default '',
  location text not null default 'academia',
  cancelled boolean not null default false,
  template boolean not null default false,
  notes text not null default '',
  video_id uuid,
  deleted boolean not null default false,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);
create index if not exists planned_workouts_user_date on public.planned_workouts (user_id, date);

create table if not exists public.planned_items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workout_id uuid not null,
  position int not null default 0,
  exercise_id text not null,
  name text not null,
  muscle_group text not null default '',
  sets int not null default 3,
  reps text not null default '10',
  unit text not null default 'reps',
  rest int not null default 60,
  load text not null default '',
  notes text not null default '',
  group_id uuid,
  group_kind text,
  deleted boolean not null default false,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);
create index if not exists planned_items_workout on public.planned_items (workout_id);

-- treinos executados (histórico)
create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  planned_workout_id uuid,
  date date not null,
  name text not null default '',
  kind text not null default '',
  location text not null default 'academia',
  status text not null default 'active',
  started_at bigint not null,
  ended_at bigint,
  paused_at bigint,
  paused_total_ms bigint not null default 0,
  rest_end_at bigint,
  rest_left_ms bigint,
  rest_total_s int not null default 0,
  rest_label text not null default '',
  current_index int not null default 0,
  notes text not null default '',
  deleted boolean not null default false,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);
create index if not exists sessions_user_date on public.sessions (user_id, date);

create table if not exists public.session_exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null,
  position int not null default 0,
  exercise_id text not null,
  name text not null,
  muscle_group text not null default '',
  target_sets int not null default 3,
  target_reps text not null default '10',
  unit text not null default 'reps',
  target_load text not null default '',
  rest int not null default 60,
  status text not null default 'pending',
  group_id uuid,
  group_kind text,
  replaced_from text not null default '',
  planned boolean not null default true,
  notes text not null default '',
  deleted boolean not null default false,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);
create index if not exists session_exercises_session on public.session_exercises (session_id);

create table if not exists public.session_sets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null,
  session_exercise_id uuid not null,
  exercise_id text not null,
  exercise_name text not null default '',
  date date not null,
  set_index int not null default 0,
  reps int,
  load numeric,
  done boolean not null default false,
  done_at bigint,
  deleted boolean not null default false,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);
create index if not exists session_sets_exercise on public.session_sets (user_id, exercise_id);
create index if not exists session_sets_session on public.session_sets (session_id);

create table if not exists public.goals (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  target numeric not null,
  exercise_id text not null default '',
  exercise_name text not null default '',
  active boolean not null default true,
  created_on date not null default current_date,
  achieved_at timestamptz,
  deleted boolean not null default false,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  unlocked_at timestamptz not null,
  deleted boolean not null default false,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url text not null,
  youtube_id text not null default '',
  title text not null default '',
  transcript text not null default '',
  transcript_status text not null default 'manual',
  exercises jsonb not null default '[]',
  notes text not null default '',
  deleted boolean not null default false,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- resolução de conflitos + segurança
-- Recusa (silenciosamente) gravações mais antigas que o registro já salvo: "o mais recente vence".
-- Impede trocar o dono de uma linha e carimba synced_at (usado pelo app para baixar só o que mudou).
create or replace function public.sync_guard() returns trigger
language plpgsql security invoker as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'não é permitido alterar o dono do registro';
    end if;
    if new.updated_at < old.updated_at then
      return null;
    end if;
  end if;
  new.synced_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','custom_exercises','planned_workouts','planned_items','sessions','session_exercises','session_sets','goals','achievements','videos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s_select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$I', t);
    execute format('create policy "%1$s_select" on public.%1$I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_insert" on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_update" on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_delete" on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
    execute format('drop trigger if exists %1$s_guard on public.%1$I', t);
    execute format('create trigger %1$s_guard before insert or update on public.%1$I for each row execute function public.sync_guard()', t);
    execute format('create index if not exists %1$s_synced on public.%1$I (user_id, synced_at)', t);
  end loop;
end $$;
