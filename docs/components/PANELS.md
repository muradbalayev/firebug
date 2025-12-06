# 📊 Panel Components Documentation

## Ümumi Baxış

Panel komponentləri istifadəçi interfeysinin sol tərəfindəki idarəetmə panellərini təmsil edir. Hər panel spesifik funksionallıq üçün nəzərdə tutulub.

---

## Sidebar.jsx

### Məqsəd
Sol navigasiya paneli - bütün panellər arasında keçid.

### Menu Items
| ID | Label | Icon | Təsvir |
|----|-------|------|--------|
| hotspots | Hotspotlar | Flame | FIRMS data |
| imagery | Peyk Görüntüləri | Satellite | Before/After |
| analysis | Analiz | BarChart3 | Burn detection |
| route | Marşrut | Route | Safe routing |
| report | Hesabat | FileText | Export |

### Features
- Collapse/expand toggle
- Active state highlighting
- Layer control shortcut

### State
```javascript
const { activePanel, setActivePanel } = useMapStore();
const [isCollapsed, setIsCollapsed] = useState(false);
```

---

## HotspotsPanel.jsx

### Məqsəd
FIRMS hotspot data yükləmə və filtrlama.

### Sections

#### 1. Filter Section
```javascript
// Available filters
- Data source: VIIRS_NOAA20, VIIRS_SNPP, MODIS, LANDSAT
- Day range: 1, 2, 3, 7 days
- Min confidence: low, nominal, high
```

#### 2. Action Section
```jsx
<Button onClick={fetchHotspots} loading={hotspotsLoading}>
  Hotspotları Yüklə
</Button>
```

#### 3. Statistics Section
| Stat | Calculation |
|------|-------------|
| Total | features.length |
| High Confidence | filter by "high" |
| Avg Brightness | sum / count |
| Avg FRP | sum / count |

### Error States
- AOI seçilməyib
- API xətası
- Demo data warning

---

## ImageryPanel.jsx

### Məqsəd
Sentinel-2 peyk görüntülərini yükləmək və Before/After müqayisə.

### Sections

#### 1. Date Selection
```jsx
<Input type="date" label="Pre-fire" />
<Input type="date" label="Post-fire" />
```

#### 2. Available Images List
```javascript
// Catalog API-dən mövcud görüntülər
[{ id, date, cloudCover, satellite }]
```

#### 3. Before/After Slider
```jsx
// Interactive slider component
<div style={{ width: `${sliderValue}%` }}>
  <img src={preImage} />
</div>
<img src={postImage} />
<input type="range" value={sliderValue} />
```

### Functions
| Function | Məqsəd |
|----------|--------|
| searchImages | Catalog-dan görüntü axtarışı |
| fetchImages | Pre/post görüntüləri yükləmə |

---

## AnalysisPanel.jsx

### Məqsəd
Burn polygon upload və analiz.

### Sections

#### 1. Upload Section
```jsx
<input type="file" accept=".json,.geojson" />
<Button>Fayl Seç</Button>
<Button>Demo Data</Button>
```

#### 2. Statistics Section
| Metric | Calculation |
|--------|-------------|
| Total Area | sum of area_ha |
| Polygon Count | features.length |
| Confidence Distribution | count by confidence |
| Largest Polygons | sorted by area |

#### 3. QGIS Instructions
Step-by-step QGIS workflow göstəricisi.

### GeoJSON Processing
```javascript
// Upload zamanı processing
const processedFeatures = features.map(f => ({
  ...f,
  properties: {
    ...f.properties,
    id: f.properties?.id || `burn_${idx}`,
    area_ha: calculateAreaHectares(f.geometry),
    date: new Date().toISOString().split("T")[0]
  }
}));
```

### Confidence Calculation
```javascript
// Hotspot intersection ilə confidence
calculateBurnConfidence(); // Store action
```

---

## RoutePanel.jsx

### Məqsəd
Təhlükəsiz marşrut planlaması.

### Sections

#### 1. Input Mode Toggle
```jsx
// Two modes
- "map": Shift+Click / Ctrl+Click
- "manual": Lat/Lng input
```

#### 2. Route Points Display
```jsx
// Start point (green)
{routeStart && <div>A: {lat}, {lng}</div>}

// End point (red)
{routeEnd && <div>B: {lat}, {lng}</div>}
```

#### 3. Profile Selection
```jsx
// Visual profile buttons
[Avtomobil] [Velosiped] [Piyada]
```

#### 4. Route Result Card
| Route Type | Style | Message |
|------------|-------|---------|
| Direct | Green | Təhlükəsiz |
| Avoided | Green | Burn area-dan yan keçdi |
| Detour | Amber | Waypoint əlavə edildi |
| Unsafe | Red | Xəbərdarlıq! |

### Route Info Display
```jsx
// Distance and duration
<div>{formatDistance(metadata.distance)}</div>
<div>{formatDuration(metadata.duration)}</div>
```

---

## ReportPanel.jsx

### Məqsəd
PDF və CSV hesabat generasiyası.

### Sections

#### 1. Data Summary
```jsx
// Mövcud data status
- AOI: Seçilib ✓
- Hotspotlar: 45
- Burn polygonlar: 8
- Tarix: 2024-12-01 → 2024-12-06
```

#### 2. Report Options
```javascript
const [reportOptions, setReportOptions] = useState({
  includeMap: true,
  includeHotspots: true,
  includeBurnArea: true,
  includeConfidence: true,
  includeDates: true
});
```

#### 3. Export Buttons
```jsx
<Button onClick={generatePDF}>PDF Yüklə</Button>
<Button onClick={exportCSV}>CSV</Button>
<Button onClick={exportGeoJSON}>GeoJSON</Button>
```

### PDF Generation
```javascript
// jsPDF ilə professional PDF
const doc = new jsPDF();
doc.setFillColor(249, 115, 22); // Orange header
doc.text("FireMap Navigator", 20, 25);
doc.autoTable({ ... }); // Tables for data
doc.save("firemap-report.pdf");
```

### Export Functions
| Function | Output |
|----------|--------|
| generatePDF | PDF file download |
| exportCSV | hotspots.csv, burn_polygons.csv |
| exportGeoJSON | .geojson files |

---

## Panel State Management

Bütün panellər Zustand store ilə əlaqəlidir:

```javascript
// Panel-specific state
const {
  // Data
  hotspots, burnPolygons, currentRoute,
  // Loading states
  hotspotsLoading, sentinelLoading, routeLoading,
  // Errors
  hotspotsError,
  // Actions
  setHotspots, setBurnPolygons, setCurrentRoute
} = useMapStore();
```

---

## Styling Pattern

Bütün panellər eyni styling pattern-ini istifadə edir:

```jsx
<div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
  {/* Header */}
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 bg-{color}-100 rounded-lg">
      <Icon />
    </div>
    <div>
      <h2>Title</h2>
      <p>Subtitle</p>
    </div>
  </div>

  {/* Content Cards */}
  <Card>
    <CardHeader>...</CardHeader>
    <CardContent>...</CardContent>
  </Card>
</div>
```
