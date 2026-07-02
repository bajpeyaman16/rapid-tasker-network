import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Radio, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Button worker taps once accepted job is active. Uses the browser's
 * geolocation watch and upserts to worker_locations. Customer's map
 * receives the updates via Realtime.
 */
export function WorkerLocationShare({ jobId, workerId }: { jobId: string; workerId: string }) {
  const [sharing, setSharing] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastPush = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (watchId.current != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  async function pushLocation(pos: GeolocationPosition) {
    const now = Date.now();
    if (now - lastPush.current < 8000) return; // throttle ~8s
    lastPush.current = now;
    const { error } = await supabase.from("worker_locations").upsert({
      worker_id: workerId,
      job_id: jobId,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      heading: pos.coords.heading ?? null,
      speed: pos.coords.speed ?? null,
      accuracy: pos.coords.accuracy ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("location upsert failed", error);
  }

  function start() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => { void pushLocation(pos); },
      (err) => { toast.error(err.message); setSharing(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    setSharing(true);
    toast.success("Sharing live location with the customer");
  }

  async function stop() {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setSharing(false);
    await supabase.from("worker_locations").delete().eq("worker_id", workerId);
    toast.success("Stopped sharing location");
  }

  return sharing ? (
    <Button variant="outline" onClick={stop} className="w-full">
      <Square className="h-4 w-4" /> Stop sharing location
    </Button>
  ) : (
    <Button onClick={start} className="w-full">
      <Radio className="h-4 w-4" /> Share live location
    </Button>
  );
}
