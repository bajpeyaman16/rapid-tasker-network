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
  customer_id: string | null;
};

type LatLng = { lat: number; lng: number; updated_at?: string } | null;

/**
 * Live map:
 *   - worker's real-time position (from worker_locations)
 *   - customer's real-time position (from customer_locations), preferred as destination
 *   - fallback destination: geocoded job address (job.location)
 *   - driving route worker -> customer + ETA
 */
export function LiveTrackingMap({ job }: { job: Job }) {
  const { ready, error } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<any>(null);
  const workerMarker = useRef<any>(null);
  const destMarker = useRef<any>(null);
  const routeLine = useRef<any>(null);
  const lastRouteAt = useRef(0);

  const [workerLoc, setWorkerLoc] = useState<LatLng>(null);
  const [customerLoc, setCustomerLoc] = useState<LatLng>(null);
  const [mapReady, setMapReady] = useState(false);
  const [jobDest, setJobDest] = useState<LatLng>(
    job.location_lat != null && job.location_lng != null
      ? { lat: job.location_lat, lng: job.location_lng }
      : null,
  );
  const [eta, setEta] = useState<{ mins: number; km: number } | null>(null);
  const geocode = useServerFn(geocodeJobAddress);
  const routeFn = useServerFn(computeRoute);

  // Destination = customer live location if we have it, else job address
  const dest: LatLng = customerLoc ?? jobDest;

  // Geocode fallback job address once
  useEffect(() => {
    if (jobDest || !job.location) return;
    geocode({ data: { jobId: job.id } })
      .then((r) => setJobDest({ lat: r.lat, lng: r.lng }))
      .catch(() => {});
  }, [jobDest, job.id, job.location, geocode]);

  // Worker realtime
  useEffect(() => {
    if (!job.assigned_worker_id) return;
    let mounted = true;
    supabase
      .from("worker_locations")
      .select("lat,lng,updated_at")
      .eq("worker_id", job.assigned_worker_id)
      .maybeSingle()
      .then(({ data }) => { if (mounted && data) setWorkerLoc(data as LatLng); });

    const channel = supabase
      .channel(`wloc-${job.assigned_worker_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "worker_locations", filter: `worker_id=eq.${job.assigned_worker_id}` },
        (payload: any) => {
          const row = (payload.new ?? payload.record) as LatLng;
          if (row) setWorkerLoc(row);
        },
      )
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [job.assigned_worker_id]);

  // Customer realtime
  useEffect(() => {
    if (!job.customer_id) return;
    let mounted = true;
    supabase
      .from("customer_locations")
      .select("lat,lng,updated_at")
      .eq("customer_id", job.customer_id)
      .maybeSingle()
      .then(({ data }) => { if (mounted && data) setCustomerLoc(data as LatLng); });

    const channel = supabase
      .channel(`cloc-${job.customer_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_locations", filter: `customer_id=eq.${job.customer_id}` },
        (payload: any) => {
          const row = (payload.new ?? payload.record) as LatLng;
          if (row) setCustomerLoc(row);
        },
      )
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [job.customer_id]);

  // Init map
  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return;
    const center = workerLoc ?? dest ?? { lat: 20.5937, lng: 78.9629 };
    mapObj.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom: workerLoc || dest ? 14 : 5,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
    });
    setMapReady(true);
  }, [ready, workerLoc, dest]);

  // Destination marker
  useEffect(() => {
    if (!mapReady || !mapObj.current || !dest) return;
    if (!destMarker.current) {
      destMarker.current = new window.google.maps.Marker({
        position: dest, map: mapObj.current,
        title: customerLoc ? "Customer" : "Job location",
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#ef4444", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      });
    } else {
      destMarker.current.setPosition(dest);
      destMarker.current.setTitle(customerLoc ? "Customer" : "Job location");
    }
  }, [dest, customerLoc, mapReady]);

  // Worker marker + route
  useEffect(() => {
    if (!mapReady || !mapObj.current || !workerLoc) return;
    const pos = { lat: workerLoc.lat, lng: workerLoc.lng };
    if (!workerMarker.current) {
      workerMarker.current = new window.google.maps.Marker({
        position: pos, map: mapObj.current, title: "Worker",
        icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 6, fillColor: "#2563eb", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      });
    } else {
      workerMarker.current.setPosition(pos);
    }

    if (dest) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(pos); bounds.extend(dest);
      mapObj.current.fitBounds(bounds, 80);

      // throttle route recompute to once per ~25s
      const now = Date.now();
      if (now - lastRouteAt.current < 25000) return;
      lastRouteAt.current = now;

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
          <h3 className="font-display text-sm font-semibold text-ink">
            Live tracking {customerLoc ? "· using customer's live location" : ""}
          </h3>
        </div>
        {eta ? (
          <span className="text-xs text-muted-foreground">
            ETA <span className="font-semibold text-ink">~{eta.mins} min</span> · {eta.km} km
          </span>
        ) : workerLoc ? (
          <span className="text-xs text-muted-foreground">Locating…</span>
        ) : (
          <span className="text-xs text-muted-foreground">Waiting for worker's location…</span>
        )}
      </div>
      <div ref={mapRef} className="h-[360px] w-full overflow-hidden rounded-xl bg-secondary">
        {!ready && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        {workerLoc && <span>Worker updated: {new Date(workerLoc.updated_at ?? "").toLocaleTimeString()}</span>}
        {customerLoc && <span>Customer updated: {new Date(customerLoc.updated_at ?? "").toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}
