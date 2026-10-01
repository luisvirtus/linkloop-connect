CREATE OR REPLACE FUNCTION public.confirm_admin_payment(_payment_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  payment_row public.payments%ROWTYPE;
  subscription_row public.subscriptions%ROWTYPE;
  renewal_percent numeric;
  commission_amount numeric;
  new_expiry timestamptz;
  seller_missing boolean := false;
BEGIN
  SELECT * INTO payment_row
  FROM public.payments
  WHERE id = _payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado.';
  END IF;

  IF payment_row.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'sellerMissing', false);
  END IF;

  IF payment_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Somente pagamentos pendentes podem ser confirmados.';
  END IF;

  IF payment_row.kind IN ('renewal', 'subscription') THEN
    IF payment_row.subscription_id IS NOT NULL THEN
      SELECT * INTO subscription_row
      FROM public.subscriptions
      WHERE id = payment_row.subscription_id
        AND company_id = payment_row.company_id
        AND status <> 'cancelled'
      FOR UPDATE;
    ELSE
      SELECT * INTO subscription_row
      FROM public.subscriptions
      WHERE company_id = payment_row.company_id
        AND status <> 'cancelled'
      ORDER BY expires_at DESC
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF subscription_row.id IS NULL THEN
      RAISE EXCEPTION 'Vincule uma assinatura válida antes de confirmar este pagamento.';
    END IF;
  END IF;

  UPDATE public.payments
  SET status = 'paid', paid_at = now(), subscription_id = COALESCE(payment_row.subscription_id, subscription_row.id)
  WHERE id = payment_row.id;

  IF payment_row.kind IN ('renewal', 'subscription') THEN
    new_expiry := GREATEST(subscription_row.expires_at, now()) + interval '1 year';
    UPDATE public.subscriptions
    SET expires_at = new_expiry, status = 'active'
    WHERE id = subscription_row.id;

    SELECT commission_renewal_percent INTO renewal_percent
    FROM public.settings
    WHERE id = true;

    seller_missing := subscription_row.seller_id IS NULL;
    IF subscription_row.seller_id IS NOT NULL AND COALESCE(renewal_percent, 0) > 0 THEN
      commission_amount := round((payment_row.amount * renewal_percent) / 100, 2);
      INSERT INTO public.commissions (
        seller_id, kind, subscription_id, payment_id,
        base_amount, percent, amount, status
      ) VALUES (
        subscription_row.seller_id, 'renewal', subscription_row.id, payment_row.id,
        payment_row.amount, renewal_percent, commission_amount, 'pending'
      ) ON CONFLICT (payment_id) WHERE payment_id IS NOT NULL AND kind = 'renewal' DO NOTHING;
    END IF;
  ELSIF payment_row.kind = 'plate' AND payment_row.sale_id IS NOT NULL THEN
    UPDATE public.sales SET payment_status = 'paid' WHERE id = payment_row.sale_id;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
  VALUES (
    _user_id,
    'payment.confirm',
    'payments',
    payment_row.id::text,
    jsonb_build_object(
      'amount', payment_row.amount,
      'subscription_id', subscription_row.id,
      'seller_id', subscription_row.seller_id,
      'seller_missing', seller_missing
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'already', false,
    'sellerMissing', seller_missing,
    'subscriptionId', subscription_row.id,
    'expiresAt', new_expiry
  );
END;
$$;