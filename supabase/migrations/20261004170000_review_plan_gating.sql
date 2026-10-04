-- Gate review visibility behind the Professional plan.
-- Reviews can still be submitted by clients after completed appointments,
-- but Starter/Business salons cannot see them until Professional is active.

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'starter';

ALTER TABLE public.salons
  DROP CONSTRAINT IF EXISTS salons_plan_check;

ALTER TABLE public.salons
  ADD CONSTRAINT salons_plan_check
  CHECK (plan IN ('starter', 'professional', 'business'));

UPDATE public.salons
SET plan = 'starter'
WHERE plan IS NULL OR plan = '';

DROP POLICY IF EXISTS "reviews_public_read" ON public.reviews;
DROP POLICY IF EXISTS "reviews_public_professional_read" ON public.reviews;
DROP POLICY IF EXISTS "reviews_owner_professional_select" ON public.reviews;
DROP POLICY IF EXISTS "reviews_client_select" ON public.reviews;

CREATE POLICY "reviews_public_professional_read"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.salons s
    WHERE s.id = reviews.salon_id
      AND s.plan = 'professional'
  )
);

CREATE POLICY "reviews_owner_professional_select"
ON public.reviews
FOR SELECT
TO authenticated
USING (
  public.owns_salon(salon_id)
  AND EXISTS (
    SELECT 1
    FROM public.salons s
    WHERE s.id = reviews.salon_id
      AND s.plan = 'professional'
  )
);

CREATE POLICY "reviews_client_select"
ON public.reviews
FOR SELECT
TO authenticated
USING (client_id = (select auth.uid()));

-- The aggregate RPC must enforce the same plan gate as the UI/RLS.
CREATE OR REPLACE FUNCTION public.salon_rating(p_salon uuid)
RETURNS TABLE (avg_rating numeric, review_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT round(avg(r.rating)::numeric, 2), count(*)
  FROM public.reviews r
  JOIN public.salons s ON s.id = r.salon_id
  WHERE r.salon_id = p_salon
    AND s.plan = 'professional'
$$;
