-- meal-prep schema v1
-- Owner-only write everywhere. Planned content is also public-read.
-- Actual-eating logs and owner profile are owner-only.

create extension if not exists pgcrypto;

-- Shared updated_at trigger
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ---------- Evergreen recipe library ----------
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_link text,
  source_chef text,
  description text,
  ingredients jsonb not null default '[]'::jsonb,
  method text,
  tags text[] not null default '{}',
  image_url text,
  is_favorite boolean not null default false,
  favorite_reason text,
  adaptations text,
  sesame_safe boolean not null default true,
  cuisine text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_recipes_updated_at on recipes;
create trigger trg_recipes_updated_at before update on recipes
  for each row execute function set_updated_at();

-- ---------- Evergreen ingredient catalog (prep reuse) ----------
create table if not exists ingredient_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  default_quantity text,
  default_cut_style text,
  image_url text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_ingredient_catalog_updated_at on ingredient_catalog;
create trigger trg_ingredient_catalog_updated_at before update on ingredient_catalog
  for each row execute function set_updated_at();

-- ---------- Weeks ----------
create table if not exists weeks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  version int not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_start, version)
);
drop trigger if exists trg_weeks_updated_at on weeks;
create trigger trg_weeks_updated_at before update on weeks
  for each row execute function set_updated_at();

-- ---------- Meal plan (one row per slot per day in a week) ----------
create table if not exists meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  day_date date not null,
  slot text not null check (slot in ('breakfast','midmorning','lunch','dinner','evening')),
  recipe_id uuid references recipes(id) on delete set null,
  display_name text,
  custom_notes text,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_meal_plan_week on meal_plan_items(week_id);
create index if not exists idx_meal_plan_day on meal_plan_items(day_date);
drop trigger if exists trg_meal_plan_items_updated_at on meal_plan_items;
create trigger trg_meal_plan_items_updated_at before update on meal_plan_items
  for each row execute function set_updated_at();

-- ---------- Shopping list ----------
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  name text not null,
  category text,
  quantity text,
  unit text,
  have boolean not null default false,
  image_url text,
  used_in_recipes jsonb not null default '[]'::jsonb,
  is_pantry boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_shopping_week on shopping_items(week_id);
drop trigger if exists trg_shopping_items_updated_at on shopping_items;
create trigger trg_shopping_items_updated_at before update on shopping_items
  for each row execute function set_updated_at();

-- ---------- Prep sessions ----------
create table if not exists prep_sessions (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  session_number int not null check (session_number in (1,2)),
  day_hint text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_id, session_number)
);
drop trigger if exists trg_prep_sessions_updated_at on prep_sessions;
create trigger trg_prep_sessions_updated_at before update on prep_sessions
  for each row execute function set_updated_at();

create table if not exists prep_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references prep_sessions(id) on delete cascade,
  ingredient_name text not null,
  total_quantity text,
  cut_style text,
  action text not null check (action in ('chop','roast','cook')),
  image_url text,
  order_index int not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table prep_items add column if not exists done boolean not null default false;
create index if not exists idx_prep_items_session on prep_items(session_id);
drop trigger if exists trg_prep_items_updated_at on prep_items;
create trigger trg_prep_items_updated_at before update on prep_items
  for each row execute function set_updated_at();

-- ---------- Private: actual-eating logs ----------
create table if not exists actual_eating_log (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  day_date date not null,
  slot text not null check (slot in ('breakfast','midmorning','lunch','dinner','evening','other')),
  item_name text not null,
  status text not null check (status in ('as_planned','substituted','other','skipped')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_actual_log_day on actual_eating_log(day_date);
drop trigger if exists trg_actual_eating_log_updated_at on actual_eating_log;
create trigger trg_actual_eating_log_updated_at before update on actual_eating_log
  for each row execute function set_updated_at();

-- ---------- Private: owner profile / targets / inventory snapshots ----------
create table if not exists owner_profile (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  requirements_md text,
  nutrition_targets jsonb,
  current_inventory jsonb,
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_owner_profile_updated_at on owner_profile;
create trigger trg_owner_profile_updated_at before update on owner_profile
  for each row execute function set_updated_at();

-- ---------- RLS ----------
alter table recipes             enable row level security;
alter table ingredient_catalog  enable row level security;
alter table weeks               enable row level security;
alter table meal_plan_items     enable row level security;
alter table shopping_items      enable row level security;
alter table prep_sessions       enable row level security;
alter table prep_items          enable row level security;
alter table actual_eating_log   enable row level security;
alter table owner_profile       enable row level security;

-- Planned content: anyone can read, only signed-in owner can write.
-- Single-user app: any authenticated user is treated as the owner.
do $$ declare t text; begin
  for t in select unnest(array[
    'recipes','ingredient_catalog','weeks','meal_plan_items',
    'shopping_items','prep_sessions','prep_items'
  ]) loop
    execute format('drop policy if exists "public read" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('drop policy if exists "owner insert" on %I', t);
    execute format('create policy "owner insert" on %I for insert with check (auth.uid() is not null)', t);
    execute format('drop policy if exists "owner update" on %I', t);
    execute format('create policy "owner update" on %I for update using (auth.uid() is not null)', t);
    execute format('drop policy if exists "owner delete" on %I', t);
    execute format('create policy "owner delete" on %I for delete using (auth.uid() is not null)', t);
  end loop;
end $$;

-- Private tables: owner-only, keyed by auth.uid()
drop policy if exists "own rows read"   on actual_eating_log;
drop policy if exists "own rows write"  on actual_eating_log;
drop policy if exists "own rows update" on actual_eating_log;
drop policy if exists "own rows delete" on actual_eating_log;
create policy "own rows read"   on actual_eating_log for select using (owner = auth.uid());
create policy "own rows write"  on actual_eating_log for insert with check (owner = auth.uid());
create policy "own rows update" on actual_eating_log for update using (owner = auth.uid());
create policy "own rows delete" on actual_eating_log for delete using (owner = auth.uid());

drop policy if exists "own rows read"   on owner_profile;
drop policy if exists "own rows write"  on owner_profile;
drop policy if exists "own rows update" on owner_profile;
drop policy if exists "own rows delete" on owner_profile;
create policy "own rows read"   on owner_profile for select using (owner = auth.uid());
create policy "own rows write"  on owner_profile for insert with check (owner = auth.uid());
create policy "own rows update" on owner_profile for update using (owner = auth.uid());
create policy "own rows delete" on owner_profile for delete using (owner = auth.uid());
