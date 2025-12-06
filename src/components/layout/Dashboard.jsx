"use client";

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

/**
 * Dashboard Component
 * Ana layout - Sidebar + Panel + Map
 */
export default function Dashboard() {
  const { activePanel, showLayerControl } = useMapStore();

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

        {/* Map */}
        <MapContainer className="absolute inset-0" />

        {/* Layer Control */}
        {showLayerControl && <LayerControl />}
      </div>
    </div>
  );
}
