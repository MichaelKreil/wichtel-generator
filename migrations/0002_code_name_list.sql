-- Which code name list a pot uses (see src/codenames.ts). Older pots used all names.
ALTER TABLE pots ADD COLUMN code_name_list TEXT NOT NULL DEFAULT 'gemischt';
