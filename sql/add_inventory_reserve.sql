-- Separate operational stock from consumables stored on Bonus Consu classes.

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS reserve_quantity INT NOT NULL DEFAULT 0
  CHECK (reserve_quantity >= 0);

WITH reserve_seed(seed_key, category_slug, name, aliases, texture_path, sort_order) AS (
  VALUES
    ('consumable:reserve:int-pot', 'potions', 'Int Pot', '{}', '/inventory/consumables/pot/pot_str.png', 500),
    ('consumable:reserve:rhb-pot', 'potions', 'RHB Pot', '{}', '/inventory/consumables/pot/pot_rhb.png', 510),
    ('consumable:reserve:dex-pot', 'potions', 'Dex Pot', ARRAY['Dexterity Pot'], '/inventory/unassigned/pot_dex.png', 520),
    ('consumable:reserve:dex-scroll', 'scrolls', 'Dex Scroll', ARRAY['Dexterity Scroll'], '/inventory/consumables/scroll/scroll_dex.png', 500),
    ('consumable:reserve:ms-scroll', 'scrolls', 'MS Scroll', '{}', '/inventory/consumables/scroll/scroll_ms.png', 510),
    ('consumable:reserve:cat-food', 'food', 'Cat Food', '{}', '/inventory/consumables/food/food_mr.png', 500),
    ('consumable:reserve:ms-food', 'food', 'MS Food', '{}', '/inventory/consumables/food/food_ms.png', 510),
    ('consumable:reserve:neg-tier-food', 'food', 'Neg Tier Food', ARRAY['Negative Tier Food'], '/inventory/consumables/food/food_neg_tier.png', 520),
    ('consumable:reserve:rgb-food', 'food', 'RGB Food', '{}', '/inventory/consumables/food/food_rgb.png', 530)
)
INSERT INTO inventory_items (
  seed_key, kind, category_id, name, scan_key, aliases, quantity, reserve_quantity,
  desired_quantity, storage_bucket, notes, texture_path, sort_order
)
SELECT
  seed.seed_key, 'consumable', category.id, seed.name, seed.name, seed.aliases,
  0, 0, NULL, 'character_bank', 'Reserve stock from Bonus Consu scans.',
  seed.texture_path, seed.sort_order
FROM reserve_seed seed
JOIN inventory_categories category
  ON category.kind = 'consumable' AND category.slug = seed.category_slug
ON CONFLICT (seed_key) DO NOTHING;

UPDATE inventory_items
SET quantity = 0, reserve_quantity = 0
WHERE archived = TRUE;
