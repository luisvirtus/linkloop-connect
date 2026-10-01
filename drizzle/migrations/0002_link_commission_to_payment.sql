ALTER TABLE public.commissions
  ADD COLUMN payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX commissions_one_renewal_per_payment_idx
  ON public.commissions(payment_id)
  WHERE payment_id IS NOT NULL AND kind = 'renewal';

COMMENT ON COLUMN public.commissions.payment_id IS 'Pagamento confirmado que originou a comissão de renovação.';