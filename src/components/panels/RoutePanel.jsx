"use client";

import { useState, useCallback } from "react";
import { useMapStore } from "@/store/useMapStore";
import { findSafeAlternativeRoute, formatDistance, formatDuration, ROUTE_PROFILES } from "@/services/routing.service";
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select } from "@/components/ui";
import { 
  Route, 
  MapPin, 
  Navigation,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Car,
  Bike,
  Footprints
} from "lucide-react";

const PROFILE_OPTIONS = [
  { value: "driving-car", label: "Car", icon: Car },
  { value: "cycling-regular", label: "Bicycle", icon: Bike },
  { value: "foot-walking", label: "Walking", icon: Footprints }
];

/**
 * RoutePanel Component
 * Safe evacuation route planning avoiding fire zones
 */
export default function RoutePanel() {
  const { 
    routeStart,
    routeEnd,
    currentRoute,
    routeLoading,
    routeProfile,
    burnPolygons,
    setRouteStart,
    setRouteEnd,
    setCurrentRoute,
    setRouteLoading,
    setRouteProfile,
    clearRoute
  } = useMapStore();

  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [inputMode, setInputMode] = useState("map"); // "map" or "manual"

  // Parse coordinate input
  const parseCoordinate = (input) => {
    const parts = input.split(",").map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      // Convert from lat, lng to lng, lat format
      return [parts[1], parts[0]];
    }
    return null;
  };

  // Set manual coordinates
  const handleSetStart = () => {
    const coord = parseCoordinate(startInput);
    if (coord) setRouteStart(coord);
  };

  const handleSetEnd = () => {
    const coord = parseCoordinate(endInput);
    if (coord) setRouteEnd(coord);
  };

  // Calculate route
  const calculateRoute = useCallback(async () => {
    if (!routeStart || !routeEnd) return;

    setRouteLoading(true);
    try {
      const route = await findSafeAlternativeRoute({
        start: routeStart,
        end: routeEnd,
        burnPolygons,
        profile: routeProfile
      });
      setCurrentRoute(route);
    } catch (error) {
      console.error("Route calculation error:", error);
    }
  }, [routeStart, routeEnd, burnPolygons, routeProfile, setRouteLoading, setCurrentRoute]);

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <Route className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Safe Route
          </h2>
          <p className="text-sm text-gray-500">Evacuation route avoiding fire zones</p>
        </div>
      </div>

      {/* Input Mode Toggle */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        <button
          onClick={() => setInputMode("map")}
          className={`flex-1 py-2 text-sm rounded-md transition ${
            inputMode === "map" 
              ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white" 
              : "text-gray-500"
          }`}
        >
          Select on Map
        </button>
        <button
          onClick={() => setInputMode("manual")}
          className={`flex-1 py-2 text-sm rounded-md transition ${
            inputMode === "manual" 
              ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white" 
              : "text-gray-500"
          }`}
        >
          Manual Input
        </button>
      </div>

      {/* Route Points */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Route Points
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inputMode === "map" ? (
            <>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Start Point (A)
                  </span>
                </div>
                {routeStart ? (
                  <p className="text-xs font-mono text-green-600">
                    {routeStart[1].toFixed(5)}, {routeStart[0].toFixed(5)}
                  </p>
                ) : (
                  <p className="text-xs text-green-500">
                    Click on map (Shift + Click)
                  </p>
                )}
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    End Point (B)
                  </span>
                </div>
                {routeEnd ? (
                  <p className="text-xs font-mono text-red-600">
                    {routeEnd[1].toFixed(5)}, {routeEnd[0].toFixed(5)}
                  </p>
                ) : (
                  <p className="text-xs text-red-500">
                    Click on map (Ctrl + Click)
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="40.4093, 49.8671"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  helperText="lat, lng formatı"
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSetStart}>Set</Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="40.3777, 49.8920"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  helperText="lat, lng formatı"
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSetEnd}>Set</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Profile Selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Transport Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {PROFILE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setRouteProfile(opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition ${
                    routeProfile === opt.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${
                    routeProfile === opt.value ? "text-blue-600" : "text-gray-400"
                  }`} />
                  <span className={`text-xs ${
                    routeProfile === opt.value ? "text-blue-600 font-medium" : "text-gray-500"
                  }`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={calculateRoute}
          disabled={!routeStart || !routeEnd || routeLoading}
          loading={routeLoading}
          leftIcon={<Navigation className="w-4 h-4" />}
          className="flex-1"
        >
          Calculate Route
        </Button>
        <Button
          variant="ghost"
          onClick={clearRoute}
          disabled={!routeStart && !routeEnd}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Route Result */}
      {currentRoute && (
        <Card className={
          currentRoute.isSafe === false 
            ? "border-red-300 bg-red-50 dark:bg-red-900/20" 
            : currentRoute.type === "detour"
              ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20"
              : "border-green-300 bg-green-50 dark:bg-green-900/20"
        }>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {currentRoute.isSafe === false ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-red-700">Dangerous Route</span>
                </>
              ) : currentRoute.type === "detour" ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-700">Alternative Route</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">Safe Route</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatDistance(currentRoute.metadata?.distance || 0)}
                </p>
                <p className="text-xs text-gray-500">Distance</p>
              </div>
              <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatDuration(currentRoute.metadata?.duration || 0)}
                </p>
                <p className="text-xs text-gray-500">Duration</p>
              </div>
            </div>

            {currentRoute.warning && (
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                ⚠️ {currentRoute.warning}
              </p>
            )}

            {currentRoute.type === "detour" && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                📍 Waypoint added to avoid burned area.
              </p>
            )}

            {currentRoute.metadata?.isDemo && (
              <p className="text-xs text-gray-500 mt-2">
                ⚠️ Demo route. Add ORS API key for real routing.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      {burnPolygons?.features?.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
          <CardContent className="py-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 {burnPolygons.features.length} burn polygon(s) used as avoid areas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
