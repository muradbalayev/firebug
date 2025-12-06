# 🗺️ Map Components Documentation

## Ümumi Baxış

Map komponentləri Leaflet kitabxanası əsasında qurulub və AOI seçimi, hotspot vizualizasiyası, burn polygon göstərimi və marşrut planlaması funksionallığını təmin edir.

---

## MapContainer.jsx

### Məqsəd
Leaflet xəritəsinin SSR-safe wrapper komponenti. Next.js ilə uyğunluq üçün dynamic import istifadə edir.

### Props
| Prop | Type | Default | Təsvir |
|------|------|---------|--------|
| className | string | "" | Əlavə CSS class-ları |

### İstifadə
```jsx
import { MapContainer } from "@/components/map";

<MapContainer className="h-[600px]" />
```

### Qeydlər
- `useSyncExternalStore` ilə SSR-safe mount detection
- Loading state zamanı spinner göstərir
- MapView komponentini lazy load edir

---

## MapView.jsx

### Məqsəd
Əsas Leaflet xəritə görünüşü. Bütün layer-ləri və interaction-ları idarə edir.

### Base Layers
| ID | Təsvir | URL |
|----|--------|-----|
| osm | OpenStreetMap | tile.openstreetmap.org |
| satellite | ESRI World Imagery | arcgisonline.com |
| terrain | OpenTopoMap | opentopomap.org |

### Alt Komponentlər
- `MapEventHandler` - map move/zoom event-ləri
- `BoundsUpdater` - AOI dəyişdikdə zoom

### Store Integration
```javascript
const { mapCenter, mapZoom, baseLayer, visibleLayers } = useMapStore();
```

---

## DrawControls.jsx

### Məqsəd
AOI (Area of Interest) çəkmək üçün Leaflet Draw plugin inteqrasiyası.

### Mövcud Alətlər
| Alət | Aktiv | Konfiqurasiya |
|------|-------|---------------|
| Polygon | ✅ | Orange stroke, 0.2 fill opacity |
| Rectangle | ✅ | Orange stroke, 0.2 fill opacity |
| Polyline | ❌ | Disabled |
| Circle | ❌ | Disabled |
| Marker | ❌ | Disabled |

### Event-lər
```javascript
// Draw completed
map.on(L.Draw.Event.CREATED, (e) => {
  const geojson = e.layer.toGeoJSON();
  setAOI(geojson);
});

// Edit completed
map.on(L.Draw.Event.EDITED, (e) => { ... });

// Delete
map.on(L.Draw.Event.DELETED, (e) => { ... });
```

### Output Format
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[lng, lat], ...]]
  }
}
```

---

## HotspotLayer.jsx

### Məqsəd
FIRMS hotspot nöqtələrini xəritədə CircleMarker kimi göstərir.

### Visual Properties
| Property | Hesablama | Range |
|----------|-----------|-------|
| Radius | `(brightness - 250) / 25` | 4-12 px |
| Color | `getConfidenceColor(confidence)` | Red/Orange/Green |
| Fill Opacity | Sabit | 0.7 |

### Confidence Rəngləri
```javascript
{
  high: "#ef4444",    // Qırmızı
  nominal: "#f59e0b", // Narıncı
  low: "#22c55e"      // Yaşıl
}
```

### Popup Məlumatları
- Koordinat (lat, lng)
- Parlaqlıq (Kelvin)
- Confidence
- Tarix və saat
- Peyk/İnstrument
- FRP (Fire Radiative Power)

### Filtering
```javascript
const filteredHotspots = hotspots.features.filter(f => {
  if (minConf === "high") return conf === "high";
  if (minConf === "nominal") return conf === "high" || conf === "nominal";
  return true;
});
```

---

## BurnPolygonLayer.jsx

### Məqsəd
QGIS-dən export edilmiş burn polygon-ları göstərir.

### Style Function
```javascript
const getStyle = (feature) => ({
  color: getConfidenceColor(feature.properties?.confidence),
  weight: 2,
  fillColor: getConfidenceColor(feature.properties?.confidence),
  fillOpacity: 0.4,
  dashArray: confidence === "LOW" ? "5, 5" : null
});
```

### Interaction
| Event | Action |
|-------|--------|
| click | setSelectedBurnPolygon(feature) |
| mouseover | fillOpacity: 0.6, weight: 3 |
| mouseout | Reset to original style |

### Popup Məlumatları
- Sahə (hektar)
- Confidence level
- Hotspot sayı (intersection nəticəsi)
- Tarix
- dNBR orta dəyəri (varsa)

---

## RouteLayer.jsx

### Məqsəd
Hesablanmış marşrutu və start/end nöqtələrini göstərir.

### Marker Icons
```javascript
// Start marker (A)
const startIcon = new L.DivIcon({
  html: `<div class="bg-green-500 rounded-full">A</div>`
});

// End marker (B)
const endIcon = new L.DivIcon({
  html: `<div class="bg-red-500 rounded-full">B</div>`
});
```

### Route Styles
| Route Type | Color | Style |
|------------|-------|-------|
| Direct/Safe | #3b82f6 (Blue) | Solid |
| Avoided | #3b82f6 (Blue) | Solid |
| Detour | #f59e0b (Amber) | Solid |
| Unsafe | #ef4444 (Red) | Dashed |

### Alt Komponentlər
- `RouteInfoPopup` - Marşrut məlumatları popup
- `RouteWarningOverlay` - Təhlükəli marşrut xəbərdarlığı

---

## AOILayer.jsx

### Məqsəd
Seçilmiş AOI-ni göstərir (DrawControls-dan ayrı).

### Style
```javascript
const aoiStyle = {
  color: "#f97316",
  weight: 3,
  fillColor: "#f97316",
  fillOpacity: 0.1,
  dashArray: "5, 10"
};
```

---

## Layer Visibility Control

Store-da `visibleLayers` object ilə idarə olunur:

```javascript
visibleLayers: {
  hotspots: true,
  burnPolygons: true,
  route: true,
  preFireImage: false,
  postFireImage: false
}
```

Toggle funksiyası:
```javascript
toggleLayer: (layer) => set((state) => ({
  visibleLayers: { 
    ...state.visibleLayers, 
    [layer]: !state.visibleLayers[layer] 
  }
}))
```

---

## Performance Tips

1. **Large datasets**: 1000+ hotspot üçün clustering istifadə edin
2. **Polygon complexity**: Sadələşdirilmiş polygon-lar daha sürətli render olunur
3. **Event debouncing**: Map move event-ləri debounce edin
4. **Conditional rendering**: Görünməyən layer-ləri render etməyin
