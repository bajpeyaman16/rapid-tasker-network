
CREATE TABLE public.customer_locations (
  customer_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  heading double precision,
  speed double precision,
  accuracy double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_locations TO authenticated;
GRANT ALL ON public.customer_locations TO service_role;

ALTER TABLE public.customer_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer manages own location"
ON public.customer_locations
FOR ALL
TO authenticated
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "assigned worker views customer location"
ON public.customer_locations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.customer_id = customer_locations.customer_id
      AND j.assigned_worker_id = auth.uid()
      AND j.status IN ('accepted','on_the_way','started','in_progress')
  )
);

CREATE TRIGGER trg_customer_locations_updated_at
BEFORE UPDATE ON public.customer_locations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_locations;
ALTER TABLE public.customer_locations REPLICA IDENTITY FULL;
