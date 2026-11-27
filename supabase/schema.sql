-- Orbit / Waqty cloud schema.
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Every local collection gets one table with the same shape:
--   (user_id, id) -> jsonb payload + last-write timestamp + optional tombstone.
-- Row Level Security is enabled on every table and anon has no direct access.
-- Use only the publishable/anon key in the app; never ship the service-role key.

-- A client clock can send an older timestamp; never let that revive a row or
-- roll an existing row back. LWW still applies to genuinely newer edits.
create or replace function public.protect_sync_row()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at < old.updated_at then
      new.updated_at := old.updated_at;
    end if;
    if old.deleted_at is not null
       and new.deleted_at is null
       and new.updated_at <= old.deleted_at then
      new.deleted_at := old.deleted_at;
      new.data := old.data;
    end if;
  end if;
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'tasks',
    'goals',
    'plans',
    'recurring_plans',
    'habits',
    'reviews',
    'pomodoros',
    'reminders',
    'weekly_reviews',
    'task_templates',
    'settings',
    'notif_settings'
  ] loop
    execute format($sql$
      create table if not exists public.%I (
        user_id uuid not null references auth.users(id) on delete cascade,
        id text not null,
        data jsonb not null,
        updated_at timestamptz not null default now(),
        deleted_at timestamptz,
        primary key (user_id, id)
      );

      create index if not exists %I on public.%I (user_id, updated_at desc);

      alter table public.%I enable row level security;
      revoke all on public.%I from anon;
      grant select, insert, update, delete on public.%I to authenticated;

      drop trigger if exists protect_sync_row on public.%I;
      create trigger protect_sync_row before update on public.%I
        for each row execute function public.protect_sync_row();

      drop policy if exists "Users manage their own rows" on public.%I;
      create policy "Users manage their own rows" on public.%I
        for all to authenticated
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
    $sql$,
      t,
      'idx_' || t || '_user_updated',
      t,
      t,
      t,
      t,
      t,
      t,
      t,
      t
    );
  end loop;
end $$;
