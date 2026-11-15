ALTER TYPE public.payment_kind ADD VALUE IF NOT EXISTS 'addon';
ALTER TABLE public.settings ADD COLUMN waiter_monthly_price numeric NOT NULL DEFAULT 0, ADD COLUMN waiter_annual_price numeric NOT NULL DEFAULT 0, ADD COLUMN menu_monthly_price numeric NOT NULL DEFAULT 0, ADD COLUMN menu_annual_price numeric NOT NULL DEFAULT 0;
CREATE TABLE public.addon_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  addon text NOT NULL CHECK (addon IN ('waiter','menu')),
  cycle text NOT NULL DEFAULT 'monthly' CHECK (cycle IN ('monthly','annual')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, addon)
);
ALTER TABLE public.addon_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.addon_subscriptions TO authenticated;
GRANT ALL ON public.addon_subscriptions TO service_role;
CREATE POLICY addon_select ON public.addon_subscriptions FOR SELECT TO authenticated USING (public.is_admin() OR public.owns_company(company_id));
CREATE POLICY addon_admin_write ON public.addon_subscriptions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT INSERT, UPDATE, DELETE ON public.addon_subscriptions TO authenticated;
ALTER TABLE public.payments ADD COLUMN addon_id uuid REFERENCES public.addon_subscriptions(id) ON DELETE SET NULL, ADD COLUMN addon_cycle text CHECK (addon_cycle IN ('monthly','annual')), ADD COLUMN addon_quantity integer;

CREATE OR REPLACE FUNCTION public.company_addons(_company_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE st public.settings%ROWTYPE; qty int; res jsonb := '{}'::jsonb; a text; r public.addon_subscriptions%ROWTYPE; free boolean; act boolean; pend uuid; full_access boolean;
BEGIN
  SELECT * INTO st FROM public.settings WHERE id=true;
  full_access := auth.uid() IS NOT NULL AND (public.is_admin() OR public.owns_company(_company_id));
  SELECT count(*) INTO qty FROM public.plates WHERE company_id=_company_id AND status='linked';
  FOREACH a IN ARRAY ARRAY['waiter','menu'] LOOP
    SELECT * INTO r FROM public.addon_subscriptions WHERE company_id=_company_id AND addon=a;
    free := CASE a WHEN 'waiter' THEN coalesce(st.waiter_monthly_price,0)=0 AND coalesce(st.waiter_annual_price,0)=0 ELSE coalesce(st.menu_monthly_price,0)=0 AND coalesce(st.menu_annual_price,0)=0 END;
    act := free OR (r.expires_at IS NOT NULL AND r.expires_at > now());
    IF full_access THEN
      SELECT id INTO pend FROM public.payments WHERE addon_id=r.id AND status='pending' LIMIT 1;
      res := res || jsonb_build_object(a, jsonb_build_object('active',act,'free',free,'expiresAt',r.expires_at,'cycle',r.cycle,'quantity',greatest(qty,1),'pending',pend IS NOT NULL,
        'monthly', CASE a WHEN 'waiter' THEN st.waiter_monthly_price ELSE st.menu_monthly_price END,
        'annual', CASE a WHEN 'waiter' THEN st.waiter_annual_price ELSE st.menu_annual_price END));
    ELSE
      res := res || jsonb_build_object(a, jsonb_build_object('active',act));
    END IF;
  END LOOP;
  RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.company_addons(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_addons(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.request_addon(_company_id uuid, _addon text, _cycle text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE st public.settings%ROWTYPE; qty int; unit numeric; aid uuid; pid uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.owns_company(_company_id) OR public.is_admin()) THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
  IF _addon NOT IN ('waiter','menu') OR _cycle NOT IN ('monthly','annual') THEN RAISE EXCEPTION 'Opção inválida.'; END IF;
  SELECT * INTO st FROM public.settings WHERE id=true;
  unit := CASE WHEN _addon='waiter' AND _cycle='monthly' THEN st.waiter_monthly_price WHEN _addon='waiter' THEN st.waiter_annual_price WHEN _cycle='monthly' THEN st.menu_monthly_price ELSE st.menu_annual_price END;
  IF coalesce(unit,0) <= 0 THEN RAISE EXCEPTION 'Este recurso não tem cobrança neste período.'; END IF;
  SELECT greatest(count(*),1) INTO qty FROM public.plates WHERE company_id=_company_id AND status='linked';
  INSERT INTO public.addon_subscriptions(company_id,addon,cycle,quantity,unit_price) VALUES(_company_id,_addon,_cycle,qty,unit)
    ON CONFLICT(company_id,addon) DO UPDATE SET updated_at=now() RETURNING id INTO aid;
  PERFORM 1 FROM public.addon_subscriptions WHERE id=aid FOR UPDATE;
  SELECT id INTO pid FROM public.payments WHERE addon_id=aid AND status='pending' LIMIT 1;
  IF pid IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'alreadyPending',true); END IF;
  INSERT INTO public.payments(company_id,kind,amount,status,addon_id,addon_cycle,addon_quantity) VALUES(_company_id,'addon',round(unit*qty,2),'pending',aid,_cycle,qty) RETURNING id INTO pid;
  INSERT INTO public.audit_logs(user_id,action,entity,entity_id,details) VALUES(auth.uid(),'addon.requested','companies',_company_id::text,jsonb_build_object('addon',_addon,'cycle',_cycle,'quantity',qty,'unit',unit));
  RETURN jsonb_build_object('ok',true,'alreadyPending',false,'amount',round(unit*qty,2),'quantity',qty);
END $$;
REVOKE ALL ON FUNCTION public.request_addon(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_addon(uuid,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.confirm_admin_payment(_payment_id uuid,_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$ DECLARE p public.payments%ROWTYPE; s public.subscriptions%ROWTYPE; sale public.sales%ROWTYPE; ad public.addon_subscriptions%ROWTYPE; orig uuid; expires timestamptz; pct numeric; received numeric; BEGIN IF auth.uid() IS NULL OR auth.uid()<>_user_id OR NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado.'; END IF; SELECT * INTO p FROM public.payments WHERE id=_payment_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento não encontrado.'; END IF; IF p.status='paid' THEN RETURN jsonb_build_object('ok',true,'already',true,'sellerMissing',false); END IF; IF p.status<>'pending' OR p.amount<=0 THEN RAISE EXCEPTION 'Somente pagamentos pendentes com valor positivo podem ser confirmados.'; END IF;
IF p.kind::text='addon' THEN SELECT * INTO ad FROM public.addon_subscriptions WHERE id=p.addon_id AND company_id=p.company_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Recurso adicional não encontrado.'; END IF; expires:=greatest(coalesce(ad.expires_at,now()),now())+CASE WHEN p.addon_cycle='annual' THEN interval '1 year' ELSE interval '1 month' END; UPDATE public.addon_subscriptions SET expires_at=expires,cycle=coalesce(p.addon_cycle,cycle),quantity=coalesce(p.addon_quantity,quantity),updated_at=now() WHERE id=ad.id; SELECT seller_id INTO orig FROM public.subscriptions WHERE company_id=p.company_id AND seller_id IS NOT NULL ORDER BY created_at LIMIT 1; SELECT commission_renewal_percent INTO pct FROM public.settings WHERE id=true; IF orig IS NOT NULL AND coalesce(pct,0)>0 THEN INSERT INTO public.commissions(seller_id,kind,payment_id,base_amount,percent,amount,status) VALUES(orig,'renewal',p.id,p.amount,pct,round(p.amount*pct/100,2),'pending') ON CONFLICT(payment_id) WHERE payment_id IS NOT NULL AND kind='renewal' DO NOTHING; END IF;
ELSIF p.kind='plate' THEN SELECT * INTO sale FROM public.sales WHERE id=p.sale_id AND company_id=p.company_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Vincule a venda da mesma empresa.'; END IF; SELECT coalesce(sum(amount),0) INTO received FROM public.payments WHERE sale_id=sale.id AND status='paid'; IF received+p.amount>sale.amount THEN RAISE EXCEPTION 'O recebimento ultrapassa o valor da venda.'; END IF; UPDATE public.sales SET payment_status=CASE WHEN received+p.amount=sale.amount THEN 'paid'::public.payment_status ELSE 'pending'::public.payment_status END WHERE id=sale.id; ELSE SELECT * INTO s FROM public.subscriptions WHERE id=p.subscription_id AND company_id=p.company_id AND status<>'cancelled' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Vincule uma assinatura válida da mesma empresa.'; END IF; expires:=greatest(s.expires_at,now())+interval '1 year'; UPDATE public.subscriptions SET expires_at=expires,status='active' WHERE id=s.id; SELECT commission_renewal_percent INTO pct FROM public.settings WHERE id=true; IF s.seller_id IS NOT NULL AND coalesce(pct,0)>0 THEN INSERT INTO public.commissions(seller_id,kind,subscription_id,payment_id,base_amount,percent,amount,status) VALUES(s.seller_id,'renewal',s.id,p.id,p.amount,pct,round(p.amount*pct/100,2),'pending') ON CONFLICT(payment_id) WHERE payment_id IS NOT NULL AND kind='renewal' DO NOTHING; END IF; END IF; UPDATE public.payments SET status='paid',paid_at=now() WHERE id=p.id; INSERT INTO public.audit_logs(user_id,action,entity,entity_id,details) VALUES(_user_id,'payment.confirm','payments',p.id::text,jsonb_build_object('amount',p.amount,'kind',p.kind)); RETURN jsonb_build_object('ok',true,'already',false,'sellerMissing',p.kind::text='plate' AND false,'expiresAt',expires); END $$;
REVOKE ALL ON FUNCTION public.confirm_admin_payment(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_admin_payment(uuid,uuid) TO authenticated,service_role;