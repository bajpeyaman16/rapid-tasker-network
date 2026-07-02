import { useEffect, useState } from "react";

declare global {
  interface Window {
    google: any;
    __lovableGmapsInit?: () => void;
    __lovableGmapsReady?: boolean;
    __lovableGmapsPromise?: Promise<void>;
  }
}

/**
 * Load the Google Maps JS API once and reuse across components.
 */
export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.__lovableGmapsReady) return Promise.resolve();
  if (window.__lovableGmapsPromise) return window.__lovableGmapsPromise;

  window.__lovableGmapsPromise = new Promise<void>((resolve, reject) => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) return reject(new Error("Google Maps browser key missing"));

    window.__lovableGmapsInit = () => {
      window.__lovableGmapsReady = true;
      resolve();
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__lovableGmapsInit&libraries=geometry${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return window.__lovableGmapsPromise;
}

export function useGoogleMaps() {
  const [ready, setReady] = useState<boolean>(!!(typeof window !== "undefined" && window.__lovableGmapsReady));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancel = false;
    loadGoogleMaps()
      .then(() => { if (!cancel) setReady(true); })
      .catch((e) => { if (!cancel) setError(e.message); });
    return () => { cancel = true; };
  }, []);
  return { ready, error };
}
