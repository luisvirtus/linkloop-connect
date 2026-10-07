CREATE OR REPLACE FUNCTION public.activate_plate(_code text, _company_name text, _review_url text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
  plate_row public.plates%ROWTYPE;
  config public.settings%ROWTYPE;
  company_row public.companies%ROWTYPE;
  page_id uuid; sale_id uuid; sub_id uuid;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
  IF length(trim(_company_name)) NOT BETWEEN 1 AND 200 OR _code !~ '^[A-Z0-9]{6}$' THEN RAISE EXCEPTION 'Confira o código e o nome da empresa.'; END IF;
  IF _review_url IS NOT NULL AND (_review_url !~ '^https?://' OR length(_review_url)>2048) THEN RAISE EXCEPTION 'Link de avaliação inválido.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  SELECT * INTO plate_row FROM public.plates WHERE qr_code=_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plaquinha não encontrada. Confira o código.'; END IF;
  IF plate_row.status <> 'available' OR plate_row.company_id IS NOT NULL OR plate_row.blocked_by_client OR plate_row.blocked_by_admin THEN RAISE EXCEPTION 'Esta plaquinha não está disponível para vinculação.'; END IF;
  SELECT * INTO config FROM public.settings WHERE id=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Configurações comerciais não encontradas.'; END IF;
  SELECT * INTO company_row FROM public.companies WHERE owner_id=actor ORDER BY created_at,id LIMIT 1;
  IF company_row.id IS NULL THEN
    INSERT INTO public.companies(owner_id,name) VALUES(actor,trim(_company_name)) RETURNING * INTO company_row;
  END IF;
  UPDATE public.plates SET company_id=company_row.id,status='linked',linked_at=now(),sold_at=now(),price=config.plate_price WHERE id=plate_row.id;
  INSERT INTO public.pages(plate_id,company_id,title,google_review_url) VALUES(plate_row.id,company_row.id,trim(_company_name),_review_url) RETURNING id INTO page_id;
  INSERT INTO public.sales(plate_id,company_id,seller_id,amount,cost,payment_status) VALUES(plate_row.id,company_row.id,plate_row.seller_id,config.plate_price,plate_row.cost,'pending') RETURNING id INTO sale_id;
  INSERT INTO public.subscriptions(company_id,plate_id,seller_id,starts_at,expires_at,amount,status) VALUES(company_row.id,plate_row.id,plate_row.seller_id,now(),now()+interval '1 year',config.subscription_price,'active') RETURNING id INTO sub_id;
  IF plate_row.seller_id IS NOT NULL THEN
    INSERT INTO public.commissions(seller_id,kind,sale_id,base_amount,percent,amount,status) VALUES(plate_row.seller_id,'sale',sale_id,config.plate_price,config.commission_sale_percent,round(config.plate_price*config.commission_sale_percent/100,2),'pending');
  END IF;
  INSERT INTO public.audit_logs(user_id,action,entity,entity_id,details) VALUES(actor,'plate.link','plates',plate_row.id::text,jsonb_build_object('code',_code,'company',company_row.name,'subscription',sub_id));
  RETURN jsonb_build_object('ok',true,'companyId',company_row.id,'pageId',page_id);
END; $$;
REVOKE ALL ON FUNCTION public.activate_plate(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.activate_plate(text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.public_company_by_code(_code text) RETURNS TABLE(name text, website_url text, logo_url text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT c.name,c.website_url,c.logo_url FROM public.companies c JOIN public.plates p ON p.company_id=c.id WHERE p.qr_code=_code AND p.status='linked' AND NOT p.blocked_by_client AND NOT p.blocked_by_admin LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.public_company_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_company_by_code(text) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.seller_company_names() RETURNS TABLE(id uuid,name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT c.id,c.name FROM public.companies c WHERE EXISTS(SELECT 1 FROM public.sales s JOIN public.sellers v ON v.id=s.seller_id WHERE s.company_id=c.id AND v.user_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.seller_company_names() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.seller_company_names() TO authenticated;
ALTER POLICY companies_public_select ON public.companies USING(false);
ALTER POLICY companies_select ON public.companies USING(owner_id=auth.uid() OR public.is_admin());
ALTER POLICY settings_select ON public.settings USING(public.is_admin());