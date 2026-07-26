-- Management-only ingredient and consumable stock tracking.
-- Seed values were transcribed from TAq Data.xlsx on 2026-07-26.

CREATE TABLE IF NOT EXISTS inventory_categories (
  id         BIGSERIAL   PRIMARY KEY,
  kind       TEXT        NOT NULL CHECK (kind IN ('ingredient', 'consumable')),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL,
  sort_order INT         NOT NULL DEFAULT 0,
  archived   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kind, slug)
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id               BIGSERIAL   PRIMARY KEY,
  seed_key         TEXT        UNIQUE,
  kind             TEXT        NOT NULL CHECK (kind IN ('ingredient', 'consumable')),
  category_id      BIGINT      NOT NULL REFERENCES inventory_categories(id),
  name             TEXT        NOT NULL,
  scan_key         TEXT        NOT NULL,
  aliases          TEXT[]      NOT NULL DEFAULT '{}',
  quantity         INT         NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  desired_quantity INT         CHECK (desired_quantity IS NULL OR desired_quantity >= 0),
  used_by          TEXT,
  bank_page        TEXT,
  charges          INT         CHECK (charges IS NULL OR charges >= 0),
  recipe_url       TEXT,
  storage_bucket   TEXT        NOT NULL DEFAULT 'misc_bucket'
                               CHECK (storage_bucket IN ('misc_bucket', 'account_bank', 'character_bank')),
  notes            TEXT,
  texture_path     TEXT,
  sort_order       INT         NOT NULL DEFAULT 0,
  archived         BOOLEAN     NOT NULL DEFAULT FALSE,
  archived_at      TIMESTAMPTZ,
  updated_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_active
  ON inventory_items(kind, category_id, sort_order) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_inventory_items_bucket
  ON inventory_items(storage_bucket) WHERE archived = FALSE;

CREATE TABLE IF NOT EXISTS inventory_scans (
  id                BIGSERIAL   PRIMARY KEY,
  scan_type         TEXT        NOT NULL
                                CHECK (scan_type IN ('misc_bucket', 'account_bank', 'character_bank')),
  uploaded_by       TEXT        NOT NULL,
  client_timestamp  TIMESTAMPTZ,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reported_items    INT         NOT NULL DEFAULT 0,
  matched_items     INT         NOT NULL DEFAULT 0,
  unknown_items     JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_inventory_scans_received
  ON inventory_scans(received_at DESC);

INSERT INTO inventory_categories (kind, name, slug, sort_order)
VALUES
  ('ingredient', 'Potion', 'potion', 10),
  ('ingredient', 'Scroll', 'scroll', 20),
  ('ingredient', 'Food', 'food', 30),
  ('consumable', 'Potions', 'potions', 10),
  ('consumable', 'Scrolls', 'scrolls', 20),
  ('consumable', 'Food', 'food', 30)
ON CONFLICT (kind, slug) DO UPDATE
SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

WITH seed(
  seed_key, category_slug, name, scan_key, aliases, quantity, desired_quantity,
  texture_slug, sort_order
) AS (
  VALUES
    ('ingredient:fairy-powder', 'potion', 'Fairy Powder', 'Fairy Powder', '{}', 5, 576, 'fairy-powder', 10),
    ('ingredient:glacial-anomaly', 'potion', 'Glacial Anomaly', 'Glacial Anomaly', '{}', 2068, 576, 'glacial-anomaly', 20),
    ('ingredient:serpent-tongue', 'potion', 'Serpent Tongue', 'Serpent Tongue', '{}', 1088, 576, 'serpent-tongue', 30),
    ('ingredient:creepvine-cluster', 'potion', 'Creepvine Cluster', 'Creepvine Cluster', '{}', 1743, 320, 'creepvine-cluster', 40),
    ('ingredient:evolving-spores', 'potion', 'Evolving Spores', 'Evolving Spores', '{}', 413, 192, 'evolving-spores', 50),
    ('ingredient:flow-of-fate', 'potion', 'Flow of Fate', 'Flow of Fate', '{}', 346, 576, 'flow-of-fate', 60),
    ('ingredient:undiscovered-plant', 'potion', 'Undiscovered Plant', 'Undiscovered Plant', '{}', 219, 576, 'undiscovered-plant', 70),
    ('ingredient:farcors-trust', 'potion', 'Farcor''s Trust', 'Farcor''s Trust', ARRAY['Farcor’s Trust'], 687, 320, 'farcors-trust', 80),
    ('ingredient:pride-of-the-heights', 'potion', 'Pride of the Heights', 'Pride of the Heights', '{}', 83, 192, 'pride-of-the-heights', 90),
    ('ingredient:colossus-shard', 'potion', 'Colossus'' Shard', 'Colossus'' Shard', ARRAY['Colossus’ Shard'], 227, 384, 'colossus-shard', 100),
    ('ingredient:nightmare-fuel', 'potion', 'Nightmare Fuel', 'Nightmare Fuel', '{}', 524, 576, 'nightmare-fuel', 110),
    ('ingredient:coalescence', 'potion', 'Coalescence', 'Coalescence', '{}', 0, 192, 'coalescence', 120),
    ('ingredient:ancient-heart', 'potion', 'Ancient Heart', 'Ancient Heart', '{}', 403, 192, 'ancient-heart', 130),
    ('ingredient:lashing-hellfire', 'potion', 'Lashing Hellfire', 'Lashing Hellfire', '{}', 393, 192, 'lashing-hellfire', 140),
    ('ingredient:frenetic-heart', 'potion', 'Frenetic Heart', 'Frenetic Heart', '{}', 245, 192, 'frenetic-heart', 150),
    ('ingredient:twisted-organ', 'potion', 'Twisted Organ', 'Twisted Organ', '{}', 359, 192, 'twisted-organ', 160),
    ('ingredient:bat-heart', 'potion', 'Bat Heart', 'Bat Heart', '{}', 56, 192, 'bat-heart', 170),
    ('ingredient:squid-brain', 'potion', 'Squid Brain', 'Squid Brain', '{}', 56, 192, 'squid-brain', 180),
    ('ingredient:blessed-heart', 'potion', 'Blessed Heart', 'Blessed Heart', '{}', 57, 192, 'blessed-heart', 190),
    ('ingredient:gilded-bark', 'potion', 'Gilded Bark', 'Gilded Bark', '{}', 74, 192, 'gilded-bark', 200),
    ('ingredient:dragon-aura', 'potion', 'Dragon Aura', 'Dragon Aura', '{}', 57, 192, 'dragon-aura', 210),
    ('ingredient:festering-face', 'potion', 'Festering Face', 'Festering Face', '{}', 655, 192, 'festering-face', 220),

    ('ingredient:earthly-aura', 'scroll', 'Earthly Aura', 'Earthly Aura', '{}', 598, 576, 'earthly-aura', 10),
    ('ingredient:watery-aura', 'scroll', 'Watery Aura', 'Watery Aura', '{}', 776, 576, 'watery-aura', 20),
    ('ingredient:fiery-aura', 'scroll', 'Fiery Aura', 'Fiery Aura', '{}', 558, 576, 'fiery-aura', 30),
    ('ingredient:windy-aura', 'scroll', 'Windy Aura', 'Windy Aura', '{}', 619, 576, 'windy-aura', 40),
    ('ingredient:haleva-plant', 'scroll', 'Haleva Plant', 'Haleva Plant', '{}', 301, 576, 'haleva-plant', 50),
    ('ingredient:plane-of-nonexistence', 'scroll', 'Plane of Nonexistence', 'Plane of Nonexistence', '{}', 431, 576, 'plane-of-nonexistence', 60),
    ('ingredient:prismatic-spores', 'scroll', 'Prismatic Spores', 'Prismatic Spores', '{}', 146, 192, 'prismatic-spores', 70),
    ('ingredient:aspect-of-the-void', 'scroll', 'Aspect of the Void', 'Aspect of the Void', '{}', 133, 192, 'aspect-of-the-void', 80),
    ('ingredient:kaian-scroll', 'scroll', 'Kaian Scroll', 'Kaian Scroll', '{}', 829, 576, 'kaian-scroll', 90),
    ('ingredient:peacock-plume', 'scroll', 'Peacock Plume', 'Peacock Plume', '{}', 0, NULL, 'peacock-plume', 100),
    ('ingredient:ancient-spring-water', 'scroll', 'Ancient Spring Water', 'Ancient Spring Water', '{}', 710, 576, 'ancient-spring-water', 110),
    ('ingredient:death-whistle-leaf', 'scroll', 'Death Whistle Leaf', 'Death Whistle Leaf', '{}', 403, 576, 'death-whistle-leaf', 120),
    ('ingredient:nivlan-honey', 'scroll', 'Nivlan Honey', 'Nivlan Honey', '{}', 354, 576, 'nivlan-honey', 130),
    ('ingredient:golden-avia-feathers', 'scroll', 'Golden Avia Feathers', 'Golden Avia Feathers', ARRAY['Golden Avia Feather'], 443, 576, 'golden-avia-feathers', 140),

    ('ingredient:bioluminescent-moss', 'food', 'Bioluminescent Moss', 'Bioluminescent Moss', '{}', 640, 576, 'bioluminescent-moss', 10),
    ('ingredient:throbbing-avos-heart', 'food', 'Throbbing Avos Heart', 'Throbbing Avos Heart', '{}', 469, 576, 'throbbing-avos-heart', 20),
    ('ingredient:mangrove-root', 'food', 'Mangrove Root', 'Mangrove Root', '{}', 474, 576, 'mangrove-root', 30),
    ('ingredient:cherry-sapling', 'food', 'Cherry Sapling', 'Cherry Sapling', '{}', 517, 576, 'cherry-sapling', 40),
    ('ingredient:tentacle', 'food', 'Tentacle', 'Tentacle', '{}', 692, 576, 'tentacle', 50),
    ('ingredient:cyclone-blue-leaves', 'food', 'Cyclone Blue Leaves', 'Cyclone Blue Leaves', '{}', 1048, 576, 'cyclone-blue-leaves', 60),
    ('ingredient:red-mercury', 'food', 'Red Mercury', 'Red Mercury', '{}', 974, 1152, 'red-mercury', 70),
    ('ingredient:kerasot-sporehead', 'food', 'Kerasot Sporehead', 'Kerasot Sporehead', '{}', 0, 320, 'kerasot-sporehead', 80),
    ('ingredient:secret-herb', 'food', 'Secret Herb', 'Secret Herb', '{}', 0, 192, 'secret-herb', 90),
    ('ingredient:borange-fluff', 'food', 'Borange Fluff', 'Borange Fluff', '{}', 0, 576, 'borange-fluff', 100),
    ('ingredient:etheric-fern', 'food', 'Etheric Fern', 'Etheric Fern', '{}', 784, 192, 'etheric-fern', 110),
    ('ingredient:unicorn-horn', 'food', 'Unicorn Horn', 'Unicorn Horn', '{}', 1265, 192, 'unicorn-horn', 120)
)
INSERT INTO inventory_items (
  seed_key, kind, category_id, name, scan_key, aliases, quantity, desired_quantity,
  storage_bucket, texture_path, sort_order
)
SELECT
  seed.seed_key, 'ingredient', category.id, seed.name, seed.scan_key, seed.aliases,
  seed.quantity, seed.desired_quantity, 'misc_bucket',
  '/inventory/ingredients/' || seed.texture_slug || '.png', seed.sort_order
FROM seed
JOIN inventory_categories category
  ON category.kind = 'ingredient' AND category.slug = seed.category_slug
ON CONFLICT (seed_key) DO NOTHING;

WITH seed(
  seed_key, category_slug, name, aliases, quantity, desired_quantity, used_by,
  bank_page, charges, storage_bucket, texture_file, sort_order
) AS (
  VALUES
    ('consumable:current:fairy-pot', 'potions', 'Fairy Pot', '{}', 27, 23, 'DPS', '2', 3, 'account_bank', 'pot/pot_fairy.png', 10),
    ('consumable:current:mr-pot', 'potions', 'MR Pot', '{}', 34, 23, 'DPS / Healer', '3', 3, 'account_bank', 'pot/pot_mr.png', 20),
    ('consumable:current:serpent-pot', 'potions', 'Serpent Pot', '{}', 8, 23, 'DPS', '4', 3, 'account_bank', 'pot/pot_serpent.png', 30),
    ('consumable:current:str-pot', 'potions', 'Str Pot', '{}', 16, 23, 'DPS', '5', 3, 'account_bank', 'pot/pot_str.png', 40),
    ('consumable:current:rgb-pot', 'potions', 'RGB Pot', '{}', 14, 23, 'DPS', '6', 4, 'account_bank', 'pot/pot_rgb.png', 50),
    ('consumable:current:wd-pot', 'potions', 'WD Pot', '{}', 24, 23, 'Healer', '7', 4, 'account_bank', 'pot/pot_wd.png', 60),
    ('consumable:current:plant-pot', 'potions', 'Plant Pot', '{}', 15, 23, 'Tank / Healer', '8', 3, 'account_bank', 'pot/pot_plant.png', 70),
    ('consumable:current:he-pot', 'potions', 'HE Pot', '{}', 9, 10, 'Healer', 'D1', 3, 'character_bank', 'pot/pot_he.png', 80),
    ('consumable:current:hard-dry-he-pot', 'potions', 'Hard Dry HE Pot', ARRAY['Dry HE Pot'], 3, 5, 'Healer', 'D1', 3, 'character_bank', 'pot/dry/pot_he_dry.png', 90),
    ('consumable:current:farcor-pot', 'potions', 'Farcor Pot', '{}', 21, 10, 'Tank / Healer', 'D1', 5, 'character_bank', 'pot/pot_farcor.png', 100),
    ('consumable:current:colossus-pot', 'potions', 'Colossus Pot', ARRAY['Collo Pot'], 3, 5, 'DPS', 'D2', 9, 'character_bank', 'pot/pot_colossus.png', 110),
    ('consumable:current:ms-pot', 'potions', 'MS Pot', '{}', 22, 15, 'DPS', 'D2', 3, 'character_bank', 'pot/pot_ms.png', 120),
    ('consumable:current:bat-pot', 'potions', 'Bat Pot', '{}', 12, 19, 'DPS', 'D3', 1, 'character_bank', 'pot/pot_bat.png', 130),
    ('consumable:current:bat-ws-cancel', 'potions', 'Bat WS Cancel', '{}', 9, 10, 'DPS', 'D4', 3, 'character_bank', 'pot/pot_bat_ws_cancel.png', 140),
    ('consumable:current:better-rgb-pot', 'potions', 'Better RGB Pot', '{}', 12, 5, 'DPS', 'D4', 5, 'character_bank', 'pot/pot_rgb_perf.png', 150),

    ('consumable:current:str-scroll', 'scrolls', 'Str Scroll', '{}', 35, 23, 'Any', '9', 3, 'account_bank', 'scroll/scroll_str.png', 10),
    ('consumable:current:int-scroll', 'scrolls', 'Int Scroll', '{}', 35, 23, 'Any', '10', 3, 'account_bank', 'scroll/scroll_int.png', 20),
    ('consumable:current:def-scroll', 'scrolls', 'Def Scroll', '{}', 37, 23, 'Any', '11', 3, 'account_bank', 'scroll/scroll_def.png', 30),
    ('consumable:current:agi-scroll', 'scrolls', 'Agi Scroll', '{}', 37, 23, 'Any', '12', 3, 'account_bank', 'scroll/scroll_agi.png', 40),
    ('consumable:current:mr-scroll', 'scrolls', 'MR Scroll', '{}', 36, 23, 'Any', '13', 3, 'account_bank', 'scroll/scroll_mr.png', 50),
    ('consumable:current:rgb-scroll', 'scrolls', 'RGB Scroll', '{}', 36, 23, 'Any', '14', 4, 'account_bank', 'scroll/scroll_rgb.png', 60),
    ('consumable:current:pris-scroll', 'scrolls', 'Pris Scroll', '{}', 42, 23, 'Any', '15', 5, 'account_bank', 'scroll/scroll_pris.png', 70),
    ('consumable:current:hp-scroll', 'scrolls', 'HP Scroll', '{}', 41, 10, 'Any', 'D5', 3, 'character_bank', 'scroll/scroll_hp.png', 80),
    ('consumable:current:sd-percent-scroll', 'scrolls', 'SD % Scroll', ARRAY['SD Percent Scroll'], 0, 13, 'DPS', 'D5', 2, 'character_bank', 'scroll/scroll_sd.png', 90),
    ('consumable:current:sd-raw-scroll', 'scrolls', 'SD Raw Scroll', '{}', 0, 13, 'DPS', 'D6', 2, 'character_bank', 'scroll/scroll_sd_raw.png', 100),

    ('consumable:current:dual-food', 'food', 'Dual Food', '{}', 29, 23, 'DPS', '16', 3, 'account_bank', 'food/food_dual.png', 10),
    ('consumable:current:sd-food', 'food', 'SD Food', '{}', 33, 23, 'DPS', '17', 3, 'account_bank', 'food/food_sd.png', 20),
    ('consumable:current:str-food', 'food', 'Str Food', '{}', 26, 23, 'DPS', '18', 3, 'account_bank', 'food/food_str.png', 30),
    ('consumable:current:int-food', 'food', 'Int Food', '{}', 38, 23, 'Healer', '19', 3, 'account_bank', 'food/food_int.png', 40),
    ('consumable:current:jh-food', 'food', 'JH Food', '{}', 25, 23, 'Any', '20', 5, 'account_bank', 'food/food_jh.png', 50),
    ('consumable:current:hp-food', 'food', 'HP Food', '{}', 24, 23, 'Tank / Healer', '21', 3, 'account_bank', 'food/food_hp.png', 60),
    ('consumable:current:he-food', 'food', 'HE Food', '{}', 18, 13, 'Healer', 'D7', 3, 'character_bank', 'food/food_he.png', 70),
    ('consumable:current:mr-food', 'food', 'MR Food', '{}', 8, 10, 'Healer', 'D7', 3, 'character_bank', 'food/food_mr.png', 80),
    ('consumable:current:twisted-food', 'food', 'Twisted Food', '{}', 21, 13, 'DPS', 'D8', 3, 'character_bank', 'food/food_twisted.png', 90),
    ('consumable:current:twisted-mr-cancel', 'food', 'Twisted MR Cancel', '{}', 12, 10, 'DPS', 'D8', 3, 'character_bank', 'food/food_twisted_mr_cancel.png', 100),
    ('consumable:current:healer-neg-tier-food', 'food', 'Healer Neg Tier Food', ARRAY['Dry Healer Neg Tier Food'], 6, 5, 'Healer', 'D9', 6, 'character_bank', 'food/food_neg_tier.png', 110),
    ('consumable:current:str-int-food', 'food', 'Str Int Food', ARRAY['STR INT Food'], 24, 13, 'DPS', 'D9', 4, 'character_bank', 'food/food_str_int.png', 120)
)
INSERT INTO inventory_items (
  seed_key, kind, category_id, name, scan_key, aliases, quantity, desired_quantity,
  used_by, bank_page, charges, recipe_url, storage_bucket, texture_path, sort_order
)
SELECT
  seed.seed_key, 'consumable', category.id, seed.name, seed.name, seed.aliases,
  seed.quantity, seed.desired_quantity, seed.used_by, seed.bank_page, seed.charges,
  CASE
    WHEN seed.seed_key = 'consumable:current:twisted-food'
      THEN 'https://hppeng-wynn.github.io/crafter/'
    ELSE 'https://wynnbuilder.github.io/crafter/'
  END,
  seed.storage_bucket,
  '/inventory/consumables/' || seed.texture_file, seed.sort_order
FROM seed
JOIN inventory_categories category
  ON category.kind = 'consumable' AND category.slug = seed.category_slug
ON CONFLICT (seed_key) DO NOTHING;

WITH seed(seed_key, category_slug, name, notes, texture_file, sort_order) AS (
  VALUES
    ('consumable:archive:mr-pot-borange', 'potions', 'MR Pot', 'MR pot with Borange Fluff.', 'pot/pot_mr.png', 1000),
    ('consumable:archive:colossus-pot-old', 'potions', 'Colossus Pot', 'Purest Tear replaced with Ancient Heart.', 'pot/pot_colossus.png', 1010),
    ('consumable:archive:rgb-scroll-old', 'scrolls', 'RGB Scroll', 'No longer used RGB Scroll recipe.', 'scroll/scroll_rgb.png', 1020),
    ('consumable:archive:mr-food-old', 'food', 'MR Food', 'Expensive MR food with better mana regeneration.', 'food/food_mr.png', 1030),
    ('consumable:archive:cat-food', 'food', 'Cat Food', 'MR food for poor people.', 'food/food_mr.png', 1040),
    ('consumable:archive:ms-food-cheap', 'food', 'MS Food', 'Cheaper MS food.', 'food/food_ms.png', 1050),
    ('consumable:archive:int-pot', 'potions', 'Int Pot', 'No longer used Int pot recipe.', 'pot/pot_str.png', 1060),
    ('consumable:archive:pris-scroll-old', 'scrolls', 'Pris Scroll', 'Replaced Death Whistle Leaf with Borange Fluff and T1 materials with T2 materials.', 'scroll/scroll_pris.png', 1070),
    ('consumable:archive:rhb-pot', 'potions', 'RHB Pot', 'No longer used RHB pot recipe.', 'pot/pot_rhb.png', 1080),
    ('consumable:archive:ms-pot-old', 'potions', 'MS Pot', 'No longer used MS pot recipe.', 'pot/pot_ms.png', 1090),
    ('consumable:archive:dex-scroll', 'scrolls', 'Dex Scroll', 'Dex scroll.', 'scroll/scroll_dex.png', 1100),
    ('consumable:archive:ms-scroll', 'scrolls', 'MS Scroll', 'No longer used MS scroll recipe.', 'scroll/scroll_ms.png', 1110),
    ('consumable:archive:neg-tier-food', 'food', 'Neg Tier Food', 'No longer used negative tier attack speed food.', 'food/food_neg_tier.png', 1120),
    ('consumable:archive:rgb-food', 'food', 'RGB Food', 'No longer used RGB food.', 'food/food_rgb.png', 1130),
    ('consumable:archive:ms-food-old', 'food', 'MS Food', 'No longer used MS food.', 'food/food_ms.png', 1140)
)
INSERT INTO inventory_items (
  seed_key, kind, category_id, name, scan_key, quantity, recipe_url, storage_bucket,
  notes, texture_path, sort_order, archived, archived_at
)
SELECT
  seed.seed_key, 'consumable', category.id, seed.name, seed.name, 0,
  'https://wynnbuilder.github.io/crafter/', 'character_bank', seed.notes,
  '/inventory/consumables/' || seed.texture_file, seed.sort_order, TRUE, NOW()
FROM seed
JOIN inventory_categories category
  ON category.kind = 'consumable' AND category.slug = seed.category_slug
ON CONFLICT (seed_key) DO NOTHING;

COMMENT ON COLUMN inventory_items.charges IS
  'Number of consumable uses per crafted item; this is not currency.';
COMMENT ON COLUMN inventory_items.bank_page IS
  'Woealer account-bank page number or character-bank marker such as D4.';
