import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function gatewayHeaders(): HeadersInit {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !gmKey) throw new Error("Missing Google Maps credentials");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gmKey,
    "Content-Type": "application/json",
  };
}

/**
 * Geocode a free-text address to lat/lng and persist it on the job row
 * so future map loads are instant. Only the assigned worker or customer can
 * trigger this (RLS on jobs enforces read/update permissions).
 */
export const geocodeJobAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: job, error } = await supabase
      .from("jobs")
      .select("id, location, location_lat, location_lng")
      .eq("id", data.jobId)
      .maybeSingle();
    if (error) throw error;
    if (!job) throw new Error("Job not found");
    if (job.location_lat != null && job.location_lng != null) {
      return { lat: job.location_lat, lng: job.location_lng, cached: true };
    }
    if (!job.location) throw new Error("Job has no address to geocode");

    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(job.location)}`;
    const res = await fetch(url, { headers: gatewayHeaders() });
    if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
    const body = (await res.json()) as {
      status: string;
      results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };
    if (body.status !== "OK" || !body.results.length) {
      throw new Error(`Geocoding failed: ${body.status}`);
    }
    const { lat, lng } = body.results[0].geometry.location;
    await supabase.from("jobs").update({ location_lat: lat, location_lng: lng }).eq("id", job.id);
    return { lat, lng, cached: false };
  });

/**
 * Compute a driving route between two points using Routes API v2.
 * Returns encoded polyline + duration + distance.
 */
export const computeRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { originLat: number; originLng: number; destLat: number; destLng: number }) => d)
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        ...gatewayHeaders(),
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: data.originLat, longitude: data.originLng } } },
        destination: { location: { latLng: { latitude: data.destLat, longitude: data.destLng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Routes API failed: ${res.status} ${t}`);
    }
    const body = (await res.json()) as {
      routes?: Array<{
        duration?: string;
        distanceMeters?: number;
        polyline?: { encodedPolyline?: string };
      }>;
    };
    const r = body.routes?.[0];
    if (!r?.polyline?.encodedPolyline) throw new Error("No route found");
    // duration like "1234s"
    const seconds = r.duration ? parseInt(r.duration.replace(/[^\d]/g, ""), 10) : 0;
    return {
      encodedPolyline: r.polyline.encodedPolyline,
      distanceMeters: r.distanceMeters ?? 0,
      durationSeconds: seconds,
    };
  });
