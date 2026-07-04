
-- 1) Restrict profiles SELECT to own row (phone no longer exposed to all authenticated users)
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Provide a public-safe view exposing only non-sensitive columns (no phone).
-- security_invoker = false so the view bypasses profiles RLS for its safe projection.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, full_name, avatar_url, city
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- 2) Tighten job_offers UPDATE: workers can only move own offers between safe statuses;
--    customers can accept/reject offers on jobs they own.
DROP POLICY IF EXISTS "Workers update own offers" ON public.job_offers;
CREATE POLICY "Workers update own offers"
ON public.job_offers
FOR UPDATE
TO authenticated
USING (worker_id = auth.uid())
WITH CHECK (
  worker_id = auth.uid()
  AND status IN ('pending'::offer_status, 'withdrawn'::offer_status)
);

CREATE POLICY "Customers update offers on own jobs"
ON public.job_offers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_offers.job_id AND j.customer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_offers.job_id AND j.customer_id = auth.uid()
  )
  AND status IN ('accepted'::offer_status, 'rejected'::offer_status)
);

-- 3) Prevent workers from self-assigning trust fields on worker_profiles
--    (is_verified, rating, reviews_count, completed_jobs). Admins may still change them.
CREATE OR REPLACE FUNCTION public.protect_worker_trust_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin'::app_role);
BEGIN
  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_verified   := false;
    NEW.rating        := 0;
    NEW.reviews_count := 0;
    NEW.completed_jobs := 0;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.is_verified    := OLD.is_verified;
    NEW.rating         := OLD.rating;
    NEW.reviews_count  := OLD.reviews_count;
    NEW.completed_jobs := OLD.completed_jobs;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS worker_profiles_protect_trust_ins ON public.worker_profiles;
CREATE TRIGGER worker_profiles_protect_trust_ins
BEFORE INSERT ON public.worker_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_worker_trust_fields();

DROP TRIGGER IF EXISTS worker_profiles_protect_trust_upd ON public.worker_profiles;
CREATE TRIGGER worker_profiles_protect_trust_upd
BEFORE UPDATE ON public.worker_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_worker_trust_fields();
