# 🏗️ FireMap Navigator - Sistem Arxitekturası

## Yüksək Səviyyəli Arxitektura Diagramı

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FireMap Navigator                                  │
│                        (Next.js Web Application)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│   DATA LAYER  │         │ PROCESSING    │         │ VISUALIZATION │
│               │         │    LAYER      │         │     LAYER     │
├───────────────┤         ├───────────────┤         ├───────────────┤
│ • NASA FIRMS  │         │ • QGIS        │         │ • Leaflet Map │
│ • Sentinel Hub│    ◄────│ • NBR/dNBR    │────►    │ • Kepler.gl   │
│ • OpenRoute   │         │ • Polygonize  │         │ • Charts      │
│   Service     │         │ • Area Calc   │         │ • Reports     │
└───────────────┘         └───────────────┘         └───────────────┘
        │                                                   │
        └───────────────────────┬───────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    REPORTING LAYER    │
                    ├───────────────────────┤
                    │ • PDF Export          │
                    │ • CSV Export          │
                    │ • GeoJSON Export      │
                    └───────────────────────┘
```

## Layer Təsvirləri

### 1. Data Layer (Məlumat Qatı)

#### NASA FIRMS API
- **Məqsəd**: Real-time yanğın hotspot məlumatları
- **Endpoint**: `https://firms.modaps.eosdis.nasa.gov/api/area/`
- **Data Source**: VIIRS (375m), MODIS (1km), Landsat (30m)
- **Output**: CSV/GeoJSON hotspot nöqtələri

#### Sentinel Hub API
- **Məqsəd**: Peyk görüntüləri (Before/After)
- **Endpoint**: `https://services.sentinel-hub.com/api/v1/process`
- **Bands**: B08 (NIR), B12 (SWIR2), B04, B03, B02
- **Output**: RGB görüntülər, NBR vizualizasiyası

#### OpenRouteService API
- **Məqsəd**: Marşrut hesablaması
- **Endpoint**: `https://api.openrouteservice.org/v2/directions/`
- **Features**: Avoid polygons, alternative routes
- **Output**: GeoJSON route

### 2. Processing Layer (İşləmə Qatı)

#### QGIS Workflow
```
Sentinel Rasters (Pre/Post)
         │
         ▼
┌─────────────────────┐
│ NBR Calculation     │
│ NBR = (B08-B12)/    │
│       (B08+B12)     │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ dNBR Calculation    │
│ dNBR = NBR_pre -    │
│        NBR_post     │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Threshold Apply     │
│ dNBR > 0.1          │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Polygonize          │
│ + Area Calculation  │
└─────────────────────┘
         │
         ▼
    GeoJSON Output
```

### 3. Visualization Layer (Vizualizasiya Qatı)

#### Web App (React/Leaflet)
- Interactive xəritə
- AOI çəkmə tools
- Layer controls
- Before/After slider

#### Kepler.gl Integration
- Advanced analytics
- 3D visualization
- Time-series animation
- Custom color scales

### 4. Reporting Layer (Hesabat Qatı)

- **PDF**: jsPDF ilə professional hesabat
- **CSV**: Hotspot və polygon data export
- **GeoJSON**: QGIS/Kepler.gl üçün export

---

## Komponent Arxitekturası

```
src/
├── app/                    # Next.js App Router
│   ├── page.js            # Ana səhifə (Dashboard)
│   ├── layout.js          # Root layout
│   └── globals.css        # Global styles
│
├── components/
│   ├── ui/                # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   └── Select.jsx
│   │
│   ├── map/               # Xəritə components
│   │   ├── MapContainer.jsx
│   │   ├── MapView.jsx
│   │   ├── DrawControls.jsx
│   │   ├── HotspotLayer.jsx
│   │   ├── BurnPolygonLayer.jsx
│   │   └── RouteLayer.jsx
│   │
│   ├── panels/            # Sidebar panels
│   │   ├── Sidebar.jsx
│   │   ├── HotspotsPanel.jsx
│   │   ├── ImageryPanel.jsx
│   │   ├── AnalysisPanel.jsx
│   │   ├── RoutePanel.jsx
│   │   └── ReportPanel.jsx
│   │
│   └── layout/            # Layout components
│       ├── Dashboard.jsx
│       ├── LayerControl.jsx
│       └── MapToolbar.jsx
│
├── services/              # API service layer
│   ├── firms.service.js   # NASA FIRMS API
│   ├── sentinel.service.js # Sentinel Hub API
│   └── routing.service.js # OpenRouteService API
│
├── store/                 # State management
│   └── useMapStore.js     # Zustand store
│
├── lib/                   # Utilities
│   └── utils.js
│
└── docs/                  # Documentation
```

---

## Data Flow

```
User Action          →  Store Update    →  API Call       →  State Update    →  UI Render
─────────────────────────────────────────────────────────────────────────────────────────
Draw AOI            →  setAOI()        →  -              →  aoi state       →  AOI polygon
Fetch Hotspots      →  setLoading()    →  FIRMS API     →  setHotspots()   →  Red dots
Upload Polygons     →  setLoading()    →  File parse    →  setBurnPolygons →  Colored areas
Calculate Route     →  setLoading()    →  ORS API       →  setRoute()      →  Route line
Generate Report     →  generateReport()→  Data compile  →  PDF/CSV        →  Download
```

---

## API Integration Flows

### FIRMS Hotspot Flow
```
1. User seçir AOI (polygon/rectangle)
2. "Hotspotları Yüklə" click
3. firms.service.js → getBoundingBox(AOI)
4. FIRMS API call → CSV response
5. csvToGeoJSON() → FeatureCollection
6. Store update → setHotspots(data)
7. HotspotLayer renders CircleMarkers
```

### Sentinel Imagery Flow
```
1. User seçir pre/post dates
2. "Görüntüləri Yüklə" click
3. sentinel.service.js → getAccessToken()
4. Process API call → evalscript execution
5. Base64 image response
6. Store update → setSentinelImages()
7. Before/After slider renders
```

### Safe Route Flow
```
1. User seçir start/end points
2. "Marşrut Hesabla" click
3. routing.service.js → findSafeAlternativeRoute()
4. First try: Direct route with avoid_polygons
5. If fails: Calculate detour waypoint
6. ORS API → GeoJSON route
7. RouteLayer renders LineString
```

---

## Confidence Scoring Logic

```javascript
// Burn polygon confidence hesablama

FOR each burnPolygon:
    intersectingHotspots = hotspots.filter(point IN polygon)
    
    IF intersectingHotspots.count > 0:
        IF any hotspot.confidence === "high":
            polygon.confidence = "HIGH"
        ELSE:
            polygon.confidence = "MEDIUM"
    ELSE:
        polygon.confidence = "LOW"
```

---

## Texnologiya Stack

| Qat | Texnologiya | Versiya | Məqsəd |
|-----|-------------|---------|--------|
| Frontend | Next.js | 16.x | SSR, Routing |
| Styling | TailwindCSS | 4.x | UI styling |
| State | Zustand | 5.x | Global state |
| Maps | Leaflet | 1.9.x | Interactive maps |
| Drawing | Leaflet-Draw | 1.0.x | AOI tools |
| Geo | Turf.js | 7.x | Spatial analysis |
| Charts | Recharts | 2.x | Data viz |
| PDF | jsPDF | 2.x | Report export |
| HTTP | Axios | 1.x | API calls |

---

## Performance Mülahizələri

1. **Lazy Loading**: Map components dynamic import ilə
2. **State Persistence**: Zustand persist middleware
3. **Debouncing**: Tez-tez update olunan state-lər üçün
4. **Memoization**: Heavy calculations üçün useMemo/useCallback
5. **Virtual Lists**: Çox sayda hotspot üçün windowing
