ALTER TABLE public.subscriptions
  ADD COLUMN seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

CREATE INDEX subscriptions_seller_id_idx ON public.subscriptions(seller_id);

UPDATE public.subscriptions AS sub
SET seller_id = COALESCE(
  (
    SELECT sale.seller_id
    FROM public.sales AS sale
    WHERE sale.company_id = sub.company_id
      AND (sub.plate_id IS NULL OR sale.plate_id = sub.plate_id)
      AND sale.seller_id IS NOT NULL
    ORDER BY sale.sold_at ASC, sale.created_at ASC
    LIMIT 1
  ),
  (
    SELECT plate.seller_id
    FROM public.plates AS plate
    WHERE plate.company_id = sub.company_id
      AND (sub.plate_id IS NULL OR plate.id = sub.plate_id)
      AND plate.seller_id IS NOT NULL
    ORDER BY plate.linked_at ASC NULLS LAST, plate.generated_at ASC
    LIMIT 1
  )
)
WHERE sub.seller_id IS NULL;

COMMENT ON COLUMN public.subscriptions.seller_id IS 'Vendedor da venda original, preservado para comissões de renovação.';