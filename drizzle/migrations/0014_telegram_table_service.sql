CREATE TABLE public.telegram_service_settings (company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE, chat_id text NOT NULL, waiter_enabled boolean NOT NULL DEFAULT false);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.telegram_service_settings TO authenticated;
GRANT ALL ON public.telegram_service_settings TO service_role;
ALTER TABLE public.telegram_service_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_owner ON public.telegram_service_settings TO authenticated USING (public.owns_company(company_id) OR public.is_admin()) WITH CHECK (public.owns_company(company_id) OR public.is_admin());
CREATE TABLE public.table_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plate_id uuid NOT NULL REFERENCES public.plates(id) ON DELETE CASCADE, company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE, started_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '90 minutes', closed_at timestamptz);
GRANT ALL ON public.table_sessions TO service_role;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX table_sessions_plate ON public.table_sessions(plate_id,started_at DESC);
CREATE TABLE public.table_visitors (token uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE);
GRANT ALL ON public.table_visitors TO service_role;
ALTER TABLE public.table_visitors ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.table_requests (id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE, kind text NOT NULL CHECK(kind IN ('waiter','menu')), items jsonb NOT NULL DEFAULT '[]', subtotal numeric NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'pending', message_id bigint, chat_id text NOT NULL, actor text, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.table_requests TO service_role;
ALTER TABLE public.table_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX table_requests_session ON public.table_requests(session_id,created_at);
CREATE OR REPLACE FUNCTION public.open_table_session(_code text, _token uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.plates%ROWTYPE; s public.table_sessions%ROWTYPE; t uuid; BEGIN
SELECT * INTO p FROM public.plates WHERE qr_code=_code FOR UPDATE;
IF NOT FOUND OR p.status<>'linked' OR p.blocked_by_admin OR p.blocked_by_client OR NOT EXISTS(SELECT 1 FROM public.companies WHERE id=p.company_id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Plaquinha indisponível'; END IF;
IF _token IS NOT NULL THEN SELECT ts.* INTO s FROM public.table_sessions ts JOIN public.table_visitors v ON v.session_id=ts.id WHERE v.token=_token AND ts.plate_id=p.id;
IF NOT FOUND OR s.closed_at IS NOT NULL OR s.expires_at<=now() THEN RAISE EXCEPTION 'Sessão encerrada ou expirada. Solicite à equipe um novo atendimento.'; END IF; t:=_token;
ELSE SELECT * INTO s FROM public.table_sessions WHERE plate_id=p.id AND closed_at IS NULL AND expires_at>now() ORDER BY started_at DESC LIMIT 1;
IF NOT FOUND THEN INSERT INTO public.table_sessions(plate_id,company_id) VALUES(p.id,p.company_id) RETURNING * INTO s; END IF;
INSERT INTO public.table_visitors(session_id) VALUES(s.id) RETURNING token INTO t;
END IF;
RETURN jsonb_build_object('token',t,'expiresAt',s.expires_at,'total',coalesce((SELECT sum(subtotal) FROM public.table_requests WHERE session_id=s.id AND status NOT IN ('pending','failed')),0)); END $$;
REVOKE ALL ON FUNCTION public.open_table_session(text,uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.open_table_session(text,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.create_table_request(_code text,_token uuid,_id uuid,_kind text,_items jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.table_sessions%ROWTYPE; p public.plates%ROWTYPE; pg public.pages%ROWTYPE; cfg public.telegram_service_settings%ROWTYPE; r public.table_requests%ROWTYPE; a jsonb; x jsonb; it jsonb; result_items jsonb:='[]'; sub numeric:=0; q int; idx int; total numeric; count_orders int; BEGIN
SELECT ts.* INTO s FROM public.table_sessions ts JOIN public.table_visitors v ON v.session_id=ts.id WHERE v.token=_token FOR UPDATE OF ts;
IF NOT FOUND OR s.closed_at IS NOT NULL OR s.expires_at<=now() THEN RAISE EXCEPTION 'Sessão encerrada ou expirada. Solicite à equipe um novo atendimento.'; END IF;
SELECT * INTO p FROM public.plates WHERE id=s.plate_id AND qr_code=_code;
IF NOT FOUND OR p.status<>'linked' OR p.blocked_by_admin OR p.blocked_by_client OR NOT EXISTS(SELECT 1 FROM public.companies WHERE id=s.company_id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Plaquinha indisponível'; END IF;
SELECT * INTO r FROM public.table_requests WHERE id=_id;
IF FOUND THEN IF r.session_id<>s.id THEN RAISE EXCEPTION 'Pedido inválido'; END IF; RETURN jsonb_build_object('duplicate',true,'status',r.status); END IF;
IF NOT public.is_company_subscription_active(s.company_id) THEN RAISE EXCEPTION 'Recursos pausados: assinatura vencida'; END IF;
a:=public.company_addons(s.company_id);
IF _kind NOT IN ('waiter','menu') OR NOT coalesce((a->_kind->>'active')::boolean,false) THEN RAISE EXCEPTION 'Recurso pausado'; END IF;
SELECT * INTO cfg FROM public.telegram_service_settings WHERE company_id=s.company_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Telegram não configurado pelo estabelecimento'; END IF;
SELECT * INTO pg FROM public.pages WHERE company_id=s.company_id ORDER BY (plate_id=p.id) DESC,created_at LIMIT 1;
IF _kind='waiter' AND NOT cfg.waiter_enabled AND NOT EXISTS(SELECT 1 FROM public.page_links WHERE page_id=pg.id AND kind='waiter' AND active) THEN RAISE EXCEPTION 'Chamados não habilitados'; END IF;
IF EXISTS(SELECT 1 FROM public.table_requests WHERE session_id=s.id AND status='pending' AND created_at>now()-interval '30 seconds') THEN RAISE EXCEPTION 'Envio em andamento. Aguarde alguns segundos.'; END IF;
IF _kind='menu' THEN
IF NOT pg.menu_enabled OR jsonb_array_length(_items)=0 OR jsonb_array_length(_items)>150 THEN RAISE EXCEPTION 'Pedido inválido'; END IF;
FOR x IN SELECT value FROM jsonb_array_elements(_items) LOOP idx:=(x->>'index')::int; q:=(x->>'quantity')::int; IF idx<0 OR idx>=jsonb_array_length(pg.menu) OR q<1 OR q>99 THEN RAISE EXCEPTION 'Item inválido'; END IF;
it:=pg.menu->idx; sub:=sub+round((it->>'p')::numeric,2)*q; result_items:=result_items||jsonb_build_array(jsonb_build_object('n',it->>'n','p',round((it->>'p')::numeric,2),'q',q)); END LOOP;
END IF;
INSERT INTO public.table_requests(id,session_id,kind,items,subtotal,chat_id) VALUES(_id,s.id,_kind,result_items,sub,cfg.chat_id);
SELECT coalesce(sum(subtotal),0),count(*) FILTER(WHERE kind='menu') INTO total,count_orders FROM public.table_requests WHERE session_id=s.id AND status NOT IN ('failed','pending');
RETURN jsonb_build_object('duplicate',false,'chatId',cfg.chat_id,'sessionId',s.id,'label',coalesce(p.label,p.qr_code),'items',result_items,'subtotal',sub,'total',total+sub,'orderCount',count_orders+CASE WHEN _kind='menu' THEN 1 ELSE 0 END); END $$;
REVOKE ALL ON FUNCTION public.create_table_request(text,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.create_table_request(text,uuid,uuid,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.telegram_table_action(_id uuid,_chat text,_message bigint,_action text,_actor text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.table_requests%ROWTYPE; s public.table_sessions%ROWTYPE; ns text; BEGIN
SELECT * INTO r FROM public.table_requests WHERE id=_id FOR UPDATE;
IF NOT FOUND OR r.chat_id<>_chat OR r.message_id<>_message OR NOT EXISTS(SELECT 1 FROM public.telegram_service_settings cfg JOIN public.table_sessions ts ON ts.company_id=cfg.company_id WHERE ts.id=r.session_id AND cfg.chat_id=_chat) THEN RAISE EXCEPTION 'Atendimento não autorizado'; END IF;
SELECT * INTO s FROM public.table_sessions WHERE id=r.session_id FOR UPDATE;
IF s.closed_at IS NOT NULL OR s.expires_at<=now() THEN RETURN jsonb_build_object('status','closed'); END IF;
IF _action='close' THEN UPDATE public.table_sessions SET closed_at=now() WHERE id=s.id; RETURN jsonb_build_object('status','closed'); END IF;
ns:=CASE WHEN r.kind='waiter' AND r.status='sent' AND _action='claim' THEN 'claimed' WHEN r.kind='waiter' AND r.status='claimed' AND _action='done' THEN 'done' WHEN r.kind='menu' AND r.status='sent' AND _action='prepare' THEN 'preparing' WHEN r.kind='menu' AND r.status='preparing' AND _action='deliver' THEN 'delivered' END;
IF ns IS NULL THEN RETURN jsonb_build_object('status',r.status,'actor',r.actor); END IF;
UPDATE public.table_requests SET status=ns,actor=left(_actor,80) WHERE id=r.id; RETURN jsonb_build_object('status',ns,'actor',left(_actor,80)); END $$;
REVOKE ALL ON FUNCTION public.telegram_table_action(uuid,text,bigint,text,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.telegram_table_action(uuid,text,bigint,text,text) TO service_role;