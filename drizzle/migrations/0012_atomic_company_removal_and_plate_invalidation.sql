ALTER TABLE public.companies ADD COLUMN deleted_at timestamptz;
CREATE OR REPLACE FUNCTION public.owns_company(_company_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS (SELECT 1 FROM public.companies WHERE id=_company_id AND owner_id=auth.uid() AND deleted_at IS NULL); $$;
ALTER POLICY companies_select ON public.companies USING ((owner_id=auth.uid() AND deleted_at IS NULL) OR public.is_admin());
ALTER POLICY companies_owner_update ON public.companies USING ((owner_id=auth.uid() AND deleted_at IS NULL) OR public.is_admin()) WITH CHECK ((owner_id=auth.uid() AND deleted_at IS NULL) OR public.is_admin());
CREATE OR REPLACE FUNCTION public.remove_company(_company_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE company_row public.companies%ROWTYPE; invalidated integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito ao administrador.'; END IF;
 SELECT * INTO company_row FROM public.companies WHERE id=_company_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não encontrado.'; END IF;
 IF company_row.deleted_at IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'invalidated',0); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(company_row.owner_id::text,0));
 UPDATE public.plates SET status='cancelled',blocked_by_admin=true WHERE company_id=_company_id;
 GET DIAGNOSTICS invalidated=ROW_COUNT;
 DELETE FROM public.page_links WHERE page_id IN (SELECT id FROM public.pages WHERE company_id=_company_id);
 DELETE FROM public.pages WHERE company_id=_company_id;
 UPDATE public.companies SET deleted_at=now(),website_url=NULL,logo_url=NULL,contact='{}'::jsonb WHERE id=_company_id;
 INSERT INTO public.audit_logs(user_id,action,entity,entity_id,details) VALUES(auth.uid(),'companies.delete','companies',_company_id::text,jsonb_build_object('invalidated',invalidated,'financialHistoryPreserved',true));
 RETURN jsonb_build_object('ok',true,'invalidated',invalidated);
END; $$;
REVOKE ALL ON FUNCTION public.remove_company(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remove_company(uuid) TO authenticated;
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.activate_plate(text,text,text)'::regprocedure) INTO definition;
 definition:=replace(definition,'WHERE owner_id=actor ORDER BY created_at,id LIMIT 1','WHERE owner_id=actor AND deleted_at IS NULL ORDER BY created_at,id LIMIT 1');
 EXECUTE definition;
END $$;