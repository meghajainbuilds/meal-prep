-- Separate real recipes from plate components (plain yogurt, rice, roti,
-- fruit, simple lunch vegetables, daily seed mix). Owner's requirements
-- say these should stay usable in menus but not clutter the Recipes grid.
alter table recipes add column if not exists is_plate_component boolean not null default false;

update recipes set is_plate_component = true where lower(name) in (
  'rice',
  'whole-wheat roti',
  'simple lunch vegetables',
  'greek yogurt',
  'daily soaked seed mix'
);
