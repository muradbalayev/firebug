# 📦 Package-lərin İzahı

Bu sənəd layihədə istifadə olunan hər bir package-in nə üçün lazım olduğunu və nə iş gördüyünü izah edir.

---

## 🎯 Core Framework

### next (v16.0.7)
**Nə edir:** React üçün full-stack framework
**Niyə lazımdır:**
- Server-Side Rendering (SSR) - SEO üçün
- File-based routing - səhifə yaratmaq asandır
- API routes - backend endpoint-ləri
- Image optimization - şəkillər avtomatik optimize olunur
- Turbopack - sürətli development build

**İstifadə yeri:** Bütün layihə bu framework üzərində qurulub

---

### react (v19.2.0)
**Nə edir:** UI komponent kitabxanası
**Niyə lazımdır:**
- Component-based arxitektura
- Virtual DOM - sürətli UI yeniləmələri
- Hooks (useState, useEffect, useMemo)
- Reusable komponentlər

**İstifadə yeri:** Bütün UI komponentləri

---

### react-dom (v19.2.0)
**Nə edir:** React-ı DOM-a render edir
**Niyə lazımdır:** React komponentlərini HTML-ə çevirmək üçün

---

## 🗺️ Xəritə Komponentləri

### leaflet (v1.9.x)
**Nə edir:** İnteraktiv xəritə kitabxanası
**Niyə lazımdır:**
- Pulsuz və open-source
- Yüngül (42KB)
- Plugin ekosistemi geniş
- Mobile-friendly

**İstifadə yeri:** `MapView.jsx` - əsas xəritə

**Alternativlər:** Mapbox GL JS (ödənişli), OpenLayers (daha ağır)

---

### react-leaflet
**Nə edir:** Leaflet-in React wrapper-i
**Niyə lazımdır:**
- Leaflet-i React component kimi istifadə etmək
- React lifecycle ilə inteqrasiya
- Declarative syntax

**İstifadə yeri:**
```jsx
<MapContainer center={[40.4, 49.8]} zoom={10}>
  <TileLayer url="..." />
</MapContainer>
```

---

### @react-leaflet/core
**Nə edir:** react-leaflet üçün core utilities
**Niyə lazımdır:** react-leaflet-in düzgün işləməsi üçün dependency

---

### leaflet-draw
**Nə edir:** Xəritədə şəkil çəkmək üçün plugin
**Niyə lazımdır:**
- Polygon çəkmək (AOI seçimi)
- Rectangle çəkmək
- Edit və delete funksiyaları

**İstifadə yeri:** `DrawControls.jsx`

---

## 📊 State Management

### zustand (v5.x)
**Nə edir:** Minimal state management kitabxanası
**Niyə lazımdır:**
- Redux-dan sadə (boilerplate az)
- 1KB - çox yüngül
- React hooks ilə işləyir
- Persist middleware (localStorage)

**İstifadə yeri:** `useMapStore.js`

```javascript
const useMapStore = create((set) => ({
  hotspots: null,
  setHotspots: (data) => set({ hotspots: data })
}));
```

**Alternativlər:** Redux (daha mürəkkəb), Jotai, Recoil

---

## 🌐 HTTP & API

### axios (v1.x)
**Nə edir:** HTTP client kitabxanası
**Niyə lazımdır:**
- Promise-based API
- Request/response interceptors
- Automatic JSON transformation
- Error handling
- Timeout support

**İstifadə yeri:** `firms.service.js`, `sentinel.service.js`, `routing.service.js`

```javascript
const response = await axios.get(url, {
  headers: { Authorization: apiKey },
  timeout: 30000
});
```

**Alternativlər:** fetch (native, amma daha az feature)

---

## 🗺️ Geo Processing

### @turf/turf (v7.x)
**Nə edir:** Geospatial analiz kitabxanası
**Niyə lazımdır:**
- Point-in-polygon yoxlaması
- Məsafə hesablaması
- Area hesablaması
- Line intersection
- Buffer yaratma

**İstifadə yeri:** `routing.service.js`

```javascript
import * as turf from "@turf/turf";

// İki nöqtə arası məsafə
const distance = turf.distance(point1, point2, { units: "meters" });

// Polygon sahəsi
const area = turf.area(polygon);
```

---

## 📄 Hesabat Generasiyası

### jspdf (v2.x)
**Nə edir:** PDF yaratma kitabxanası
**Niyə lazımdır:**
- Client-side PDF generation
- Server lazım deyil
- Şəkil, mətn, cədvəl dəstəyi

**İstifadə yeri:** `ReportPanel.jsx`

```javascript
const doc = new jsPDF();
doc.text("FireMap Report", 20, 20);
doc.save("report.pdf");
```

---

### jspdf-autotable
**Nə edir:** jsPDF üçün cədvəl plugin-i
**Niyə lazımdır:**
- Avtomatik cədvəl formatlaması
- Header/footer
- Pagination
- Styling

**İstifadə yeri:** `ReportPanel.jsx`

```javascript
doc.autoTable({
  head: [["ID", "Sahə", "Confidence"]],
  body: data
});
```

---

## 🎨 UI & Styling

### tailwindcss (v4.x)
**Nə edir:** Utility-first CSS framework
**Niyə lazımdır:**
- Sürətli styling
- Consistent design system
- Responsive utilities
- Dark mode dəstəyi
- Kiçik bundle size (unused CSS silinir)

**İstifadə yeri:** Bütün komponentlər

```jsx
<button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
  Click
</button>
```

**Alternativlər:** CSS Modules, Styled Components, Emotion

---

### @tailwindcss/postcss
**Nə edir:** Tailwind üçün PostCSS plugin
**Niyə lazımdır:** Tailwind-i build prosesində işlətmək üçün

---

### clsx
**Nə edir:** Conditional className birləşdirmə
**Niyə lazımdır:**
- Şərti class-lar əlavə etmək
- Array/object syntax

**İstifadə yeri:** `utils.js`

```javascript
import { clsx } from "clsx";

className={clsx(
  "base-class",
  isActive && "active-class",
  { "error-class": hasError }
)}
```

---

### tailwind-merge
**Nə edir:** Tailwind class conflict-lərini həll edir
**Niyə lazımdır:**
- `p-2` və `p-4` olduqda yalnız sonuncunu saxlayır
- Override problemlərini həll edir

**İstifadə yeri:** `utils.js` - `cn()` funksiyası

```javascript
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

---

### lucide-react
**Nə edir:** İkon kitabxanası
**Niyə lazımdır:**
- 1000+ ikon
- Tree-shakeable (yalnız istifadə olunanlar bundle-a düşür)
- Customizable (size, color, stroke)
- React component kimi

**İstifadə yeri:** Bütün UI komponentləri

```jsx
import { Flame, Map, Route } from "lucide-react";

<Flame className="w-5 h-5 text-red-500" />
```

**Alternativlər:** Heroicons, Font Awesome, React Icons

---

## 📅 Tarix İşləmə

### date-fns
**Nə edir:** Tarix manipulation kitabxanası
**Niyə lazımdır:**
- Tarix formatlaması
- Parse etmə
- Müqayisə
- Modular (yalnız lazım olan funksiyalar import olunur)

**İstifadə yeri:** `utils.js`

```javascript
import { format, parseISO } from "date-fns";

format(new Date(), "dd.MM.yyyy"); // "06.12.2024"
```

**Alternativlər:** Moment.js (köhnə, ağır), Day.js

---

## 🔧 Development Tools

### eslint (v9.x)
**Nə edir:** JavaScript linter
**Niyə lazımdır:**
- Kod keyfiyyəti
- Bug-ların erkən aşkarlanması
- Consistent code style

---

### eslint-config-next
**Nə edir:** Next.js üçün ESLint konfiqurasiyası
**Niyə lazımdır:** Next.js best practice-lərini tətbiq edir

---

### postcss
**Nə edir:** CSS transformation tool
**Niyə lazımdır:** Tailwind CSS-in işləməsi üçün

---

## 📊 Package Ölçüləri (Approximate)

| Package | Size | Kritiklik |
|---------|------|-----------|
| react + react-dom | ~130KB | Əsas |
| leaflet | ~42KB | Əsas |
| @turf/turf | ~200KB | Orta |
| jspdf | ~300KB | Aşağı (lazy load) |
| zustand | ~1KB | Əsas |
| axios | ~14KB | Əsas |
| tailwindcss | ~0KB (build time) | Əsas |
| lucide-react | ~5KB (per icon) | Orta |

---

## 🔄 Package Dependency Graph

```
next
├── react
├── react-dom
└── (internal deps)

react-leaflet
├── leaflet
└── @react-leaflet/core

leaflet-draw
└── leaflet

jspdf-autotable
└── jspdf

tailwind-merge
└── (standalone)

clsx
└── (standalone)
```

---

## 💡 Niyə Bu Package-lər Seçildi?

### Kriteriyalar:
1. **Aktiv maintenance** - Son 6 ayda update olub
2. **Community support** - GitHub stars, npm downloads
3. **Bundle size** - Mümkün qədər kiçik
4. **TypeScript support** - Tip təhlükəsizliyi
5. **Documentation** - Yaxşı sənədləşdirilmiş

### Rədd edilən alternativlər:
- **Mapbox GL JS** - Ödənişli, Leaflet pulsuz
- **Redux** - Çox mürəkkəb, Zustand sadə
- **Moment.js** - Köhnə və ağır, date-fns modular
- **Material UI** - Çox ağır, Tailwind yüngül
