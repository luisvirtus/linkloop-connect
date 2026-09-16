-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','seller','client');
CREATE TYPE public.plate_status AS ENUM ('available','reserved','sold','linked','donated','lost','blocked','cancelled');
CREATE TYPE public.plate_size AS ENUM ('small','medium','large');
CREATE TYPE public.subscription_status AS ENUM ('active','expired','cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','refunded');
CREATE TYPE public.payment_kind AS ENUM ('plate','subscription','renewal');
CREATE TYPE public.commission_kind AS ENUM ('sale','renewal');
CREATE TYPE public.commission_status AS ENUM ('pending','paid','cancelled');

-- UPDATED_AT HELPER
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

-- SELLERS
CREATE TABLE public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER sellers_updated BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.current_seller_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.sellers WHERE user_id = auth.uid() LIMIT 1;
$$;

-- COMPANIES
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT ON public.companies TO anon;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- BATCHES
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  size public.plate_size NOT NULL DEFAULT 'medium',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batches TO authenticated;
GRANT ALL ON public.batches TO service_role;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- PLATES
CREATE SEQUENCE public.plate_serial_seq;
CREATE TABLE public.plates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial BIGINT NOT NULL UNIQUE DEFAULT nextval('public.plate_serial_seq'),
  qr_code TEXT NOT NULL UNIQUE,
  size public.plate_size NOT NULL DEFAULT 'medium',
  status public.plate_status NOT NULL DEFAULT 'available',
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  price NUMERIC(10,2),
  blocked_by_client BOOLEAN NOT NULL DEFAULT false,
  blocked_by_admin BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  linked_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX plates_company_idx ON public.plates(company_id);
CREATE INDEX plates_seller_idx ON public.plates(seller_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plates TO authenticated;
GRANT SELECT ON public.plates TO anon;
GRANT ALL ON public.plates TO service_role;
ALTER TABLE public.plates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER plates_updated BEFORE UPDATE ON public.plates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.owns_company(_company_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.companies WHERE id = _company_id AND owner_id = auth.uid());
$$;

-- PAGES
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_id UUID NOT NULL UNIQUE REFERENCES public.plates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  logo_url TEXT,
  google_review_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages TO authenticated;
GRANT SELECT ON public.pages TO anon;
GRANT ALL ON public.pages TO service_role;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER pages_updated BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PAGE LINKS
CREATE TABLE public.page_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'other',
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX page_links_page_idx ON public.page_links(page_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_links TO authenticated;
GRANT SELECT ON public.page_links TO anon;
GRANT ALL ON public.page_links TO service_role;
ALTER TABLE public.page_links ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER page_links_updated BEFORE UPDATE ON public.page_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SALES
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_id UUID NOT NULL UNIQUE REFERENCES public.plates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plate_id UUID REFERENCES public.plates(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.subscription_status NOT NULL DEFAULT 'active',
  stripe_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_company_idx ON public.subscriptions(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PAYMENTS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  kind public.payment_kind NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.payment_status NOT NULL DEFAULT 'pending',
  stripe_reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- COMMISSIONS
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  kind public.commission_kind NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  base_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.commission_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX commissions_seller_idx ON public.commissions(seller_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- SETTINGS (singleton)
CREATE TABLE public.settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  plate_price NUMERIC(10,2) NOT NULL DEFAULT 80.00,
  plate_cost NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  subscription_price NUMERIC(10,2) NOT NULL DEFAULT 99.00,
  commission_sale_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  commission_renewal_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.settings (id) VALUES (true);

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_idx ON public.audit_logs(created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY profiles_self_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_self_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());

CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY sellers_select ON public.sellers FOR SELECT TO authenticated USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY sellers_admin_write ON public.sellers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY companies_public_select ON public.companies FOR SELECT TO anon USING (true);
CREATE POLICY companies_select ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY companies_owner_insert ON public.companies FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY companies_owner_update ON public.companies FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_admin()) WITH CHECK (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY companies_admin_delete ON public.companies FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY batches_admin ON public.batches FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY plates_public_select ON public.plates FOR SELECT TO anon USING (status = 'linked' AND blocked_by_client = false AND blocked_by_admin = false);
CREATE POLICY plates_select ON public.plates FOR SELECT TO authenticated USING (
  public.is_admin()
  OR seller_id = public.current_seller_id()
  OR (company_id IS NOT NULL AND public.owns_company(company_id))
  OR status = 'available'
);
CREATE POLICY plates_admin_write ON public.plates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY plates_owner_update ON public.plates FOR UPDATE TO authenticated USING (company_id IS NOT NULL AND public.owns_company(company_id)) WITH CHECK (company_id IS NOT NULL AND public.owns_company(company_id));

CREATE POLICY pages_public_select ON public.pages FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.plates p WHERE p.id = pages.plate_id AND p.status = 'linked' AND p.blocked_by_client = false AND p.blocked_by_admin = false)
);
CREATE POLICY pages_select ON public.pages FOR SELECT TO authenticated USING (public.is_admin() OR public.owns_company(company_id));
CREATE POLICY pages_write ON public.pages FOR ALL TO authenticated USING (public.is_admin() OR public.owns_company(company_id)) WITH CHECK (public.is_admin() OR public.owns_company(company_id));

CREATE POLICY page_links_public_select ON public.page_links FOR SELECT TO anon USING (
  active AND EXISTS (
    SELECT 1 FROM public.pages pg JOIN public.plates p ON p.id = pg.plate_id
    WHERE pg.id = page_links.page_id AND p.status = 'linked' AND p.blocked_by_client = false AND p.blocked_by_admin = false
  )
);
CREATE POLICY page_links_select ON public.page_links FOR SELECT TO authenticated USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.pages pg WHERE pg.id = page_links.page_id AND public.owns_company(pg.company_id))
);
CREATE POLICY page_links_write ON public.page_links FOR ALL TO authenticated USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.pages pg WHERE pg.id = page_links.page_id AND public.owns_company(pg.company_id))
) WITH CHECK (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.pages pg WHERE pg.id = page_links.page_id AND public.owns_company(pg.company_id))
);

CREATE POLICY sales_select ON public.sales FOR SELECT TO authenticated USING (
  public.is_admin() OR seller_id = public.current_seller_id() OR public.owns_company(company_id)
);
CREATE POLICY sales_admin_write ON public.sales FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT TO authenticated USING (public.is_admin() OR public.owns_company(company_id));
CREATE POLICY subscriptions_admin_write ON public.subscriptions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY payments_select ON public.payments FOR SELECT TO authenticated USING (public.is_admin() OR (company_id IS NOT NULL AND public.owns_company(company_id)));
CREATE POLICY payments_admin_write ON public.payments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY commissions_select ON public.commissions FOR SELECT TO authenticated USING (public.is_admin() OR seller_id = public.current_seller_id());
CREATE POLICY commissions_admin_write ON public.commissions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY settings_select ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_admin_update ON public.settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY audit_select ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- NEW USER HANDLER
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();