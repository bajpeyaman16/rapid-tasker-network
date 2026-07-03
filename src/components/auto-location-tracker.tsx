import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Runs globally for signed-in users. On mount:
 *   1. Reads the user's role (customer | worker) from user_roles.
 *   2. Requests device geolocation permission (once).
 *   3. Continuously watches position and pushes it to the correct table:
 *        - workers  -> worker_locations
 *        - customers-> customer_locations
 *   Both maps (worker's & customer's) subscribe to these tables in realtime.
 */
export function AutoLocationTracker() {
  const [role, setRole] = useState<"customer" | "worker" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastPush = useRef(0);
  const askedRef = useRef(false);

  // Resolve user + role
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!mounted || !u.user) return;
      setUserId(u.user.id);
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", u.user.id).limit(1);
      const r = roles?.[0]?.role;
      if (r === "customer" || r === "worker") setRole(r);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!role || !userId) return;
    if (!("geolocation" in navigator)) return;
    if (askedRef.current) return;
    askedRef.current = true;

    const pushWorker = async (pos: GeolocationPosition) => {
      // pick current active job (if any) to associate
      const { data: activeJob } = await supabase
        .from("jobs")
        .select("id")
        .eq("assigned_worker_id", userId)
        .in("status", ["accepted", "on_the_way", "started", "in_progress"])
        .limit(1)
        .maybeSingle();
      await supabase.from("worker_locations").upsert({
        worker_id: userId,
        job_id: activeJob?.id ?? null,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading ?? null,
        speed: pos.coords.speed ?? null,
        accuracy: pos.coords.accuracy ?? null,
        updated_at: new Date().toISOString(),
      });
    };

    const pushCustomer = async (pos: GeolocationPosition) => {
      await supabase.from("customer_locations").upsert({
        customer_id: userId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading ?? null,
        speed: pos.coords.speed ?? null,
        accuracy: pos.coords.accuracy ?? null,
        updated_at: new Date().toISOString(),
      });
    };

    const onPos = (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastPush.current < 8000) return; // throttle ~8s
      lastPush.current = now;
      const p = role === "worker" ? pushWorker(pos) : pushCustomer(pos);
      p.catch((err) => console.error("location push failed", err));
    };

    const onErr = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        toast.error("Location permission denied. Enable it to use live tracking.");
      }
    };

    watchId.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000,
    });

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [role, userId]);

  return null;
}
