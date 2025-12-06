"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// SSR-safe mount detection
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}

// Leaflet SSR ilə uyğun deyil, dynamic import lazımdır
const MapView = dynamic(
  () => import("./MapView").then(mod => {
    console.log("MapView loaded successfully");
    return mod;
  }).catch(err => {
    console.error("MapView load error:", err);
    throw err;
  }), 
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="text-sm text-gray-500">Loading map...</span>
        </div>
      </div>
    )
  }
);

/**
 * MapContainer Component
 * Leaflet xəritəsini wrap edən konteyner
 */
export default function MapContainer({ className = "" }) {
  const isMounted = useIsMounted();

  if (!isMounted) {
    return (
      <div className={`w-full h-full bg-gray-100 dark:bg-gray-900 ${className}`}>
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <MapView />
    </div>
  );
}
