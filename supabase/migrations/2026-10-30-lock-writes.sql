-- Lock down writes so only the owner (matched by JWT email) can modify data.
-- Reads stay public. Signed-in visitors see everything but cannot change anything.

create or replace function is_owner() returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'meghajain@outlook.com'
$$;

do $$
declare t text;
begin
  foreach t in array array['recipes','weeks','meal_plan_items','shopping_items','prep_sessions','prep_items']
  loop
    execute format('drop policy if exists "owner insert" on %I', t);
    execute format('drop policy if exists "owner update" on %I', t);
    execute format('drop policy if exists "owner delete" on %I', t);
    execute format('create policy "owner insert" on %I for insert with check (is_owner())', t);
    execute format('create policy "owner update" on %I for update using (is_owner()) with check (is_owner())', t);
    execute format('create policy "owner delete" on %I for delete using (is_owner())', t);
  end loop;
end $$;

-- Expose actual_eating_log as public-read so visitors see the full demo
-- experience ("Ate the whole meal" / "Ate something else" marks).
-- Writes remain restricted to the row owner by the existing policies.
drop policy if exists "own rows read" on actual_eating_log;
create policy "public read" on actual_eating_log for select using (true);
