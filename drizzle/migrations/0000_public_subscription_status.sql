CREATE OR REPLACE FUNCTION public.is_company_subscription_active(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE company_id = _company_id
      AND expires_at > now()
      AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_company_subscription_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_subscription_active(uuid) TO anon, authenticated, service_role;