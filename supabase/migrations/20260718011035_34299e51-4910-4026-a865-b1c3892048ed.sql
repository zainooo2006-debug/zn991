
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_theme_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_theme_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read site settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a single row (singleton) with an empty theme scaffold
INSERT INTO public.site_settings (active_theme_json, default_theme_json) VALUES (
  '{"theme":{"colors":{},"fonts":{},"spacing":{}},"layout":{"header":{},"sections":[],"footer":{}},"components":{"buttons":{},"cards":{}}}'::jsonb,
  '{"theme":{"colors":{},"fonts":{},"spacing":{}},"layout":{"header":{},"sections":[],"footer":{}},"components":{"buttons":{},"cards":{}}}'::jsonb
);
