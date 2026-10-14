-- Which code name list a pot uses (see src/codenames.ts). Older pots get the default list.
ALTER TABLE pots ADD COLUMN code_name_list TEXT NOT NULL DEFAULT 'schauspiel';
