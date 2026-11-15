ALTER TABLE public.plates ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE public.plates ADD CONSTRAINT plates_label_len CHECK (label IS NULL OR char_length(label) <= 40);
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS menu_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS menu jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.pages ADD CONSTRAINT pages_menu_size CHECK (pg_column_size(menu) <= 32000);