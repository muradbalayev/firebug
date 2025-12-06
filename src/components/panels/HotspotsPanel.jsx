"use client";

import { useState, useCallback } from "react";
import { useMapStore } from "@/store/useMapStore";
import { getHotspots, calculateHotspotStats, FIRMS_SOURCES } from "@/services/firms.service";
import { Button, Card, CardHeader, CardTitle, CardContent, Select } from "@/components/ui";
import { getBoundingBox } from "@/lib/utils";
import { 
  Flame, 
  RefreshCw, 
  AlertCircle, 
  MapPin,
  Thermometer,
  Calendar,
  Filter
} from "lucide-react";

/**
 * HotspotsPanel Component
 * FIRMS hotspot data yükləmə və göstərmə paneli
 */
export default function HotspotsPanel() {
  const { 
    aoi, 
    hotspots,
    hotspotsLoading, 
    hotspotsError,
    hotspotFilters,
    setHotspots,
    setHotspotsLoading,
    setHotspotsError,
    setHotspotFilters
  } = useMapStore();

  const [localDayRange, setLocalDayRange] = useState(hotspotFilters.dayRange);

  // Hotspotları yüklə
  const fetchHotspots = useCallback(async () => {
    if (!aoi) {
      setHotspotsError("Əvvəlcə xəritədə AOI (ərazi) seçin");
      return;
    }

    setHotspotsLoading(true);
    setHotspotsError(null);

    try {
      const bbox = getBoundingBox(aoi);
      const data = await getHotspots({
        bbox,
        source: hotspotFilters.source,
        dayRange: localDayRange
      });

      setHotspots(data);
      setHotspotFilters({ dayRange: localDayRange });

    } catch (error) {
      setHotspotsError(error.message);
    }
  }, [aoi, hotspotFilters.source, localDayRange, setHotspots, setHotspotsLoading, setHotspotsError, setHotspotFilters]);

  // Statistikalar
  const stats = hotspots ? calculateHotspotStats(hotspots) : null;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
          <Flame className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Yanğın Hotspotları
          </h2>
          <p className="text-sm text-gray-500">NASA FIRMS real-time data</p>
        </div>
      </div>

      {/* AOI Warning */}
      {!aoi && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  AOI seçilməyib
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                  Xəritədə polygon və ya düzbucaq çəkərək analiz etmək istədiyiniz ərazini seçin.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtrlər
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            label="Data mənbəyi"
            value={hotspotFilters.source}
            onChange={(e) => setHotspotFilters({ source: e.target.value })}
            options={[
              { value: "VIIRS_NOAA20_NRT", label: "VIIRS NOAA-20 (375m)" },
              { value: "VIIRS_SNPP_NRT", label: "VIIRS SNPP (375m)" },
              { value: "MODIS_NRT", label: "MODIS (1km)" },
              { value: "LANDSAT_NRT", label: "Landsat (30m)" }
            ]}
          />

          <Select
            label="Zaman aralığı"
            value={localDayRange}
            onChange={(e) => setLocalDayRange(Number(e.target.value))}
            options={[
              { value: 1, label: "Son 24 saat" },
              { value: 2, label: "Son 48 saat" },
              { value: 3, label: "Son 3 gün" },
              { value: 7, label: "Son 1 həftə" }
            ]}
          />

          <Select
            label="Minimum confidence"
            value={hotspotFilters.minConfidence}
            onChange={(e) => setHotspotFilters({ minConfidence: e.target.value })}
            options={[
              { value: "low", label: "Hamısı" },
              { value: "nominal", label: "Nominal + High" },
              { value: "high", label: "Yalnız High" }
            ]}
          />
        </CardContent>
      </Card>

      {/* Fetch Button */}
      <Button
        onClick={fetchHotspots}
        disabled={!aoi || hotspotsLoading}
        loading={hotspotsLoading}
        leftIcon={<RefreshCw className="w-4 h-4" />}
        className="w-full"
      >
        {hotspotsLoading ? "Yüklənir..." : "Hotspotları Yüklə"}
      </Button>

      {/* Error */}
      {hotspotsError && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{hotspotsError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Statistikalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <StatItem
                icon={<MapPin className="w-4 h-4" />}
                label="Toplam hotspot"
                value={stats.total}
                color="text-red-600"
              />
              <StatItem
                icon={<Thermometer className="w-4 h-4" />}
                label="Orta parlaqlıq"
                value={`${stats.avgBrightness}K`}
                color="text-orange-600"
              />
              <StatItem
                icon={<Flame className="w-4 h-4" />}
                label="Yüksək confidence"
                value={stats.highConfidence}
                color="text-red-500"
              />
              <StatItem
                icon={<Calendar className="w-4 h-4" />}
                label="Orta FRP"
                value={`${stats.avgFRP} MW`}
                color="text-amber-600"
              />
            </div>

            {/* Confidence Breakdown */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 mb-2">Confidence dağılımı</p>
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                {stats.total > 0 && (
                  <>
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${(stats.highConfidence / stats.total) * 100}%` }}
                    />
                    <div 
                      className="bg-amber-500" 
                      style={{ width: `${(stats.nominalConfidence / stats.total) * 100}%` }}
                    />
                    <div 
                      className="bg-green-500" 
                      style={{ width: `${(stats.lowConfidence / stats.total) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>High: {stats.highConfidence}</span>
                <span>Nominal: {stats.nominalConfidence}</span>
                <span>Low: {stats.lowConfidence}</span>
              </div>
            </div>

            {/* Demo Warning */}
            {hotspots?.metadata?.isDemo && (
              <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ Demo data göstərilir. Real data üçün FIRMS API key əlavə edin.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Stat Item Component
 */
function StatItem({ icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className={color}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
