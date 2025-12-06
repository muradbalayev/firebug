"use client";

import { useState, useEffect } from "react";
import { useMapStore } from "@/store/useMapStore";
import { MapContainer } from "@/components/map";
import { 
  Sidebar, 
  HotspotsPanel, 
  ImageryPanel, 
  AnalysisPanel, 
  RoutePanel, 
  ReportPanel 
} from "@/components/panels";
import LayerControl from "./LayerControl";
import MapToolbar from "./MapToolbar";
import dynamic from "next/dynamic";

// Dynamic import with proper module resolution
const Map3DView = dynamic(
  async () => {
    const mod = await import("@/components/map/Map3D");
    return mod.default || mod;
  },
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p>Loading 3D View...</p>
        </div>
      </div>
    )
  }
);

/**
 * Dashboard Component
 * Main layout - Sidebar + Panel + Map
 * Production-ready government fire monitoring dashboard
 */
export default function Dashboard() {
  const { activePanel, showLayerControl } = useMapStore();
  const [show3D, setShow3D] = useState(false);

  // Panel renderer
  const renderPanel = () => {
    switch (activePanel) {
      case "hotspots":
        return <HotspotsPanel />;
      case "imagery":
        return <ImageryPanel />;
      case "analysis":
        return <AnalysisPanel />;
      case "route":
        return <RoutePanel />;
      case "report":
        return <ReportPanel />;
      default:
        return <HotspotsPanel />;
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-100 dark:bg-gray-950">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Active Panel */}
      <div className="w-80 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shrink-0 overflow-hidden">
        {renderPanel()}
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {/* Map Toolbar */}
        <MapToolbar />

        {/* 3D Toggle Button */}
        <button
          onClick={() => setShow3D(!show3D)}
          className={`absolute top-4 right-4 z-50 px-4 py-2 rounded-lg font-medium text-sm shadow-lg transition-all ${
            show3D 
              ? "bg-purple-600 text-white hover:bg-purple-700" 
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          {show3D ? "2D View" : "3D View"}
        </button>

        {/* Map - 2D or 3D */}
        {show3D ? (
          <Map3DView className="absolute inset-0" />
        ) : (
          <MapContainer className="absolute inset-0" />
        )}

        {/* Layer Control */}
        {showLayerControl && !show3D && <LayerControl />}
      </div>
    </div>
  );
}
