-- Follow-up migration for management inventory/accounting revisions.
-- Safe to re-run: the schema operations are guarded and recipe URLs are
-- corrected by stable seed keys.

ALTER TABLE le_balance_log
  ADD COLUMN IF NOT EXISTS author TEXT;

CREATE TABLE IF NOT EXISTS inventory_texture_assets (
  id          BIGSERIAL    PRIMARY KEY,
  name        TEXT         NOT NULL,
  s3_key      TEXT         NOT NULL UNIQUE,
  created_by  TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_texture_assets_created_at
  ON inventory_texture_assets(created_at DESC);

WITH recipe_urls(seed_key, recipe_url) AS (
  VALUES
    ('consumable:current:fairy-pot', 'https://wynnbuilder.github.io/crafter/#4eQeQCqeQeQCqqc00'),
    ('consumable:current:str-scroll', 'https://wynnbuilder.github.io/crafter/#4WEWEWEWEWEWE8d81'),
    ('consumable:current:dual-food', 'https://wynnbuilder.github.io/crafter/#4iqiqiqiqiqiqac00'),
    ('consumable:current:int-scroll', 'https://wynnbuilder.github.io/crafter/#44N4N4N4N4N4N8d00'),
    ('consumable:current:sd-food', 'https://wynnbuilder.github.io/crafter/#4aMaMaMaMaMaMac00'),
    ('consumable:current:def-scroll', 'https://wynnbuilder.github.io/crafter/#4yEyEyEyEyEyE8d00'),
    ('consumable:current:str-food', 'https://wynnbuilder.github.io/crafter/#4O8O8SeSeSeSeac00'),
    ('consumable:current:int-food', 'https://wynnbuilder.github.io/crafter/#4OMOMOMOMOMOMac00'),
    ('consumable:current:mr-pot', 'https://wynnbuilder.github.io/crafter/#4SbSbSbSbSbSbqc40'),
    ('consumable:current:jh-food', 'https://wynnbuilder.github.io/crafter/#4KPKPKPKPKaKaac00'),
    ('consumable:current:serpent-pot', 'https://wynnbuilder.github.io/crafter/#4mWmWCqmWmWCqqc00'),
    ('consumable:current:hp-food', 'https://wynnbuilder.github.io/crafter/#4WKWKWKWKWKWKac00'),
    ('consumable:current:str-pot', 'https://wynnbuilder.github.io/crafter/#4iUiUiUiUiUiUqc00'),
    ('consumable:current:agi-scroll', 'https://wynnbuilder.github.io/crafter/#48N8N8N8N8N8N8d00'),
    ('consumable:current:rgb-pot', 'https://wynnbuilder.github.io/crafter/#44e4e4eKaWR8cqcW0'),
    ('consumable:current:mr-scroll', 'https://wynnbuilder.github.io/crafter/#16y6y6y6y6y6y9o11'),
    ('consumable:current:wd-pot', 'https://wynnbuilder.github.io/crafter/#44R4RCq4R4RCqqc00'),
    ('consumable:current:rgb-scroll', 'https://wynnbuilder.github.io/crafter/#4KdKdaZKaCZCZ8da0'),
    ('consumable:current:plant-pot', 'https://wynnbuilder.github.io/crafter/#4aoaoCqaoaoCqqc00'),
    ('consumable:current:pris-scroll', 'https://wynnbuilder.github.io/crafter/#44n4nKaKaCZCZ8da0'),
    ('consumable:current:he-food', 'https://wynnbuilder.github.io/crafter/#4KqKqKqKqKqKqac00'),
    ('consumable:current:mr-food', 'https://wynnbuilder.github.io/crafter/#4WbaZWbaZaZ0eac00'),
    ('consumable:current:twisted-food', 'https://hppeng-wynn.github.io/crafter/#1AY8Y8Y8Y8Y8Y9f41'),
    ('consumable:current:he-pot', 'https://wynnbuilder.github.io/crafter/#4KqKqKqKqKqKqqc00'),
    ('consumable:current:hp-scroll', 'https://wynnbuilder.github.io/crafter/#4yQyQyQCqCZCZ8da0'),
    ('consumable:current:hard-dry-he-pot', 'https://wynnbuilder.github.io/crafter/#4mmqZmmqZac4Sqca0'),
    ('consumable:current:sd-percent-scroll', 'https://wynnbuilder.github.io/crafter/#4eXeXeXeX8cCZ8da0'),
    ('consumable:current:str-int-food', 'https://wynnbuilder.github.io/crafter/#4uOuOuOuOuOKaac00'),
    ('consumable:current:farcor-pot', 'https://wynnbuilder.github.io/crafter/#19I9uCW9I9I8k9j51'),
    ('consumable:current:sd-raw-scroll', 'https://wynnbuilder.github.io/crafter/#4iPiPiPCqiP8c8d40'),
    ('consumable:current:colossus-pot', 'https://wynnbuilder.github.io/crafter/#19095CW90908k9j51'),
    ('consumable:current:ms-pot', 'https://wynnbuilder.github.io/crafter/#4qHqHqHqHqHqHqc00'),
    ('consumable:current:bat-pot', 'https://wynnbuilder.github.io/crafter/#4qZGZqZGZqZGZqc00'),
    ('consumable:current:better-rgb-pot', 'https://wynnbuilder.github.io/crafter/#44eWd0o4e4euYqcW0'),
    ('consumable:archive:mr-pot-borange', 'https://wynnbuilder.github.io/crafter/#4SbSbSbSbSbaZqcW0'),
    ('consumable:archive:colossus-pot-old', 'https://wynnbuilder.github.io/crafter/#48cuYuY0a0a0aqc00'),
    ('consumable:archive:rgb-scroll-old', 'https://wynnbuilder.github.io/crafter/#4KdKaKdKaKdWR8d40'),
    ('consumable:archive:mr-food-old', 'https://wynnbuilder.github.io/crafter/#4WbWbWbWaWa8gac40'),
    ('consumable:archive:cat-food', 'https://wynnbuilder.github.io/crafter/#4mOmOmOmOmOmOac00'),
    ('consumable:archive:ms-food-cheap', 'https://wynnbuilder.github.io/crafter/#4eUeUeUeUeUKaacW0'),
    ('consumable:archive:int-pot', 'https://wynnbuilder.github.io/crafter/#4WYWYWYWYWYKaub00'),
    ('consumable:archive:pris-scroll-old', 'https://wynnbuilder.github.io/crafter/#44n4naZaZCZCZ8da0'),
    ('consumable:archive:rhb-pot', 'https://wynnbuilder.github.io/crafter/#4aKaKaKaKaKaKqc00'),
    ('consumable:archive:ms-pot-old', 'https://wynnbuilder.github.io/crafter/#4qHqHqHqHqHqHqc00'),
    ('consumable:archive:dex-scroll', 'https://wynnbuilder.github.io/crafter/#4OGOGOGOGOGOG8d00'),
    ('consumable:archive:ms-scroll', 'https://wynnbuilder.github.io/crafter/#4SXSXSXSXSXKa8d00'),
    ('consumable:archive:neg-tier-food', 'https://wynnbuilder.github.io/crafter/#4SZaZKaybybybac00'),
    ('consumable:archive:rgb-food', 'https://wynnbuilder.github.io/crafter/#4uGuGuGuGuGuGac00'),
    ('consumable:archive:ms-food-old', 'https://wynnbuilder.github.io/crafter/#4GbKaKa0eGb0eac00')
)
UPDATE inventory_items AS item
SET recipe_url = recipe_urls.recipe_url,
    updated_at = NOW()
FROM recipe_urls
WHERE item.seed_key = recipe_urls.seed_key;

UPDATE inventory_items
SET recipe_url = NULL,
    updated_at = NOW()
WHERE seed_key IN (
  'consumable:current:bat-ws-cancel',
  'consumable:current:twisted-mr-cancel',
  'consumable:current:healer-neg-tier-food'
);
