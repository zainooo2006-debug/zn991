
-- Reusable trigger (safe to re-create)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 1) website_pages
CREATE TABLE public.website_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  page_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.website_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_pages TO authenticated;
GRANT ALL ON public.website_pages TO service_role;
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published pages" ON public.website_pages FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "admins manage pages" ON public.website_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_website_pages_updated BEFORE UPDATE ON public.website_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) website_components
CREATE TABLE public.website_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.website_components TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_components TO authenticated;
GRANT ALL ON public.website_components TO service_role;
ALTER TABLE public.website_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read components" ON public.website_components FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage components" ON public.website_components FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_website_components_updated BEFORE UPDATE ON public.website_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) website_layouts
CREATE TABLE public.website_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.website_layouts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_layouts TO authenticated;
GRANT ALL ON public.website_layouts TO service_role;
ALTER TABLE public.website_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read layouts" ON public.website_layouts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage layouts" ON public.website_layouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_website_layouts_updated BEFORE UPDATE ON public.website_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) website_themes
CREATE TABLE public.website_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  theme_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.website_themes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_themes TO authenticated;
GRANT ALL ON public.website_themes TO service_role;
ALTER TABLE public.website_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read themes" ON public.website_themes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage themes" ON public.website_themes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_website_themes_updated BEFORE UPDATE ON public.website_themes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) website_templates
CREATE TABLE public.website_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'section' CHECK (type IN ('section','page')),
  category TEXT DEFAULT 'general',
  template_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_templates TO authenticated;
GRANT ALL ON public.website_templates TO service_role;
ALTER TABLE public.website_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage templates" ON public.website_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_website_templates_updated BEFORE UPDATE ON public.website_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) website_media
CREATE TABLE public.website_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url TEXT NOT NULL,
  folder TEXT DEFAULT 'root',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.website_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_media TO authenticated;
GRANT ALL ON public.website_media TO service_role;
ALTER TABLE public.website_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read media" ON public.website_media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage media" ON public.website_media FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 7) website_menus
CREATE TABLE public.website_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT DEFAULT 'header',
  menu_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.website_menus TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_menus TO authenticated;
GRANT ALL ON public.website_menus TO service_role;
ALTER TABLE public.website_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read menus" ON public.website_menus FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage menus" ON public.website_menus FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_website_menus_updated BEFORE UPDATE ON public.website_menus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) website_settings (singleton row + custom code)
CREATE TABLE public.website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_html TEXT DEFAULT '',
  custom_css TEXT DEFAULT '',
  custom_js TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.website_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_settings TO authenticated;
GRANT ALL ON public.website_settings TO service_role;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.website_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage settings" ON public.website_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_website_settings_updated BEFORE UPDATE ON public.website_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.website_settings (settings_json) VALUES ('{}'::jsonb);

-- 9) website_backups
CREATE TABLE public.website_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_backups TO authenticated;
GRANT ALL ON public.website_backups TO service_role;
ALTER TABLE public.website_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage backups" ON public.website_backups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
