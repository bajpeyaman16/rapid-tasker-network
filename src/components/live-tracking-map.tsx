import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleMaps } from "@/lib/use-google-maps";
import { computeRoute, geocodeJobAddress } from "@/lib/maps.functions";
import { Navigation, Loader2, MapPin } from "lucide-react";

type Job = {
  id: string;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  assigned_worker_id: string | null;
};

type WorkerLoc = { lat: number; lng: number; updated_at: string } | null;

/**
 * Live map showing:
 *   - worker's current position (realtime updates)
 *   - job destination
 *   - driving route + ETA
 */
export function LiveTrackingMap({ job }: { job: Job }) {
  const { ready, error } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<any>(null);
  const workerMarker = useRef<any>(null);
  const destMarker = useRef<any>(null);
  const routeLine = useRef<any>(null);

  const [workerLoc, setWorkerLoc] = useState<WorkerLoc>(null);
  const [dest, setDest] = useState<{ lat: number; lng: number } | null>(
    job.location_lat != null && job.location_lng != null
      ? { lat: job.location_lat, lng: job.location_lng }
      : null,
  );
  const [eta, setEta] = useState<{ mins: number; km: number } | null>(null);
  const geocode = useServerFn(geocodeJobAddress);
  const routeFn = useServerFn(computeRoute);

  // Geocode destination if we don't have coords yet
  useEffect(() => {
    if (dest || !job.location) return;
    geocode({ data: { jobId: job.id } })
      .then((r) => setDest({ lat: r.lat, lng: r.lng }))
      .catch(() => {});
  }, [dest, job.id, job.location, geocode]);

  // Initial worker location + realtime subscription
  useEffect(() => {
    if (!job.assigned_worker_id) return;
    let mounted = true;
    supabase
      .from("worker_locations")
      .select("lat,lng,updated_at")
      .eq("worker_id", job.assigned_worker_id)
      .maybeSingle()
      .then(({ data }) => { if (mounted && data) setWorkerLoc(data as WorkerLoc); });

    const channel = supabase
      .channel(`worker-loc-${job.assigned_worker_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "worker_locations", filter: `worker_id=eq.${job.assigned_worker_id}` },
        (payload: any) => {
          const row = (payload.new ?? payload.record) as WorkerLoc;
          if (row) setWorkerLoc(row);
        },
      )
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [job.assigned_worker_id]);

  // Init map when script is ready and we have at least one point
  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return;
    const center = workerLoc ?? dest;
    if (!center) return;
    mapObj.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
    });
  }, [ready, workerLoc, dest]);

  // Update destination marker
  useEffect(() => {
    if (!mapObj.current || !dest) return;
    if (!destMarker.current) {
      destMarker.current = new window.google.maps.Marker({
        position: dest, map: mapObj.current, title: "Job location",
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#ef4444", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      });
    } else {
      destMarker.current.setPosition(dest);
    }
  }, [dest]);

  // Update worker marker + route
  useEffect(() => {
    if (!mapObj.current || !workerLoc) return;
    const pos = { lat: workerLoc.lat, lng: workerLoc.lng };
    if (!workerMarker.current) {
      workerMarker.current = new window.google.maps.Marker({
        position: pos, map: mapObj.current, title: "Worker",
        icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 6, fillColor: "#2563eb", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      });
    } else {
      workerMarker.current.setPosition(pos);
    }

    // Fit both markers
    if (dest) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(pos); bounds.extend(dest);
      mapObj.current.fitBounds(bounds, 80);

      // Fetch route (throttled — only refresh every ~30s or when worker moves a lot)
      routeFn({ data: { originLat: pos.lat, originLng: pos.lng, destLat: dest.lat, destLng: dest.lng } })
        .then((r) => {
          setEta({ mins: Math.max(1, Math.round(r.durationSeconds / 60)), km: +(r.distanceMeters / 1000).toFixed(1) });
          const path = window.google.maps.geometry.encoding.decodePath(r.encodedPolyline);
          if (routeLine.current) routeLine.current.setMap(null);
          routeLine.current = new window.google.maps.Polyline({
            path, map: mapObj.current, strokeColor: "#2563eb", strokeOpacity: 0.85, strokeWeight: 5,
          });
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerLoc, dest]);

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <MapPin className="mb-2 h-5 w-5" /> Map unavailable: {error}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold text-ink">Live tracking</h3>
        </div>
        {eta ? (
          <span className="text-xs text-muted-foreground">
            ETA <span className="font-semibold text-ink">~{eta.mins} min</span> · {eta.km} km
          </span>
        ) : workerLoc ? (
          <span className="text-xs text-muted-foreground">Locating…</span>
        ) : (
          <span className="text-xs text-muted-foreground">Waiting for worker to share location…</span>
        )}
      </div>
      <div ref={mapRef} className="h-[360px] w-full overflow-hidden rounded-xl bg-secondary">
        {!ready && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>
      {workerLoc && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Last update: {new Date(workerLoc.updated_at).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
