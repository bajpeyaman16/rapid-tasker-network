
CREATE TABLE public.worker_locations (
  worker_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  heading double precision,
  speed double precision,
  accuracy double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_locations TO authenticated;
GRANT ALL ON public.worker_locations TO service_role;

ALTER TABLE public.worker_locations ENABLE ROW LEVEL SECURITY;

-- Worker manages own row
CREATE POLICY "worker manages own location"
ON public.worker_locations
FOR ALL
TO authenticated
USING (auth.uid() = worker_id)
WITH CHECK (auth.uid() = worker_id);

-- Customer of the assigned active job can view worker's live location
CREATE POLICY "customer views assigned worker location"
ON public.worker_locations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.assigned_worker_id = worker_locations.worker_id
      AND j.customer_id = auth.uid()
      AND j.status IN ('accepted','on_the_way','started','in_progress')
  )
);

CREATE TRIGGER trg_worker_locations_updated_at
BEFORE UPDATE ON public.worker_locations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_locations;
ALTER TABLE public.worker_locations REPLICA IDENTITY FULL;
