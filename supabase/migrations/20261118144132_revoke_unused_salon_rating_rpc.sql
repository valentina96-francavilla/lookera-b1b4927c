-- The frontend reads reviews through the reviews table and does not call salon_rating().
-- Keep the function available to database owners, but remove it from the public Data API.
REVOKE ALL ON FUNCTION public.salon_rating(uuid) FROM PUBLIC, anon, authenticated;
