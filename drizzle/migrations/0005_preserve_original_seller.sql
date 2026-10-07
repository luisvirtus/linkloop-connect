CREATE OR REPLACE FUNCTION public.preserve_original_seller() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF OLD.seller_id IS NOT NULL AND NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN RAISE EXCEPTION 'O vendedor da venda original não pode ser alterado.'; END IF;
 IF TG_TABLE_NAME='subscriptions' AND OLD.seller_id IS NOT NULL AND (NEW.plate_id IS DISTINCT FROM OLD.plate_id OR NEW.company_id IS DISTINCT FROM OLD.company_id) THEN RAISE EXCEPTION 'O vínculo da assinatura original não pode ser alterado.'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER subscription_original_seller BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.preserve_original_seller();
CREATE TRIGGER sale_original_seller BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.preserve_original_seller();
REVOKE ALL ON FUNCTION public.preserve_original_seller() FROM PUBLIC,anon,authenticated;