# 🔥 FireBug Navigator

**Real-time yanğın aşkarlama, analiz və təhlükəsiz marşrut planlaması sistemi**

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwindcss)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=flat-square&logo=leaflet)

---

## 🎯 Layihə Haqqında

FireBug Navigator yanğın monitorinqi və analizi üçün hərtərəfli bir GIS platformasıdır. NASA FIRMS real-time data, Sentinel-2 peyk görüntüləri və OpenRouteService marşrut planlaması ilə inteqrasiya olunub.

### Əsas Xüsusiyyətlər

- 🗺️ **AOI Selection** - Xəritədə polygon/rectangle ilə ərazi seçimi
- 🔥 **FIRMS Hotspots** - Real-time yanğın nöqtələri (VIIRS/MODIS)
- 🛰️ **Sentinel Imagery** - Before/After peyk görüntüləri
- 📊 **Burn Analysis** - dNBR əsaslı yanğın sahəsi təhlili
- 🧭 **Safe Routing** - Yanğın ərazilərindən yan keçən marşrut
- 📄 **Reporting** - PDF/CSV/GeoJSON export

---

## 🚀 Quraşdırma

### Tələblər
- Node.js 18+
- npm/yarn/pnpm

### Addımlar

```bash
# Repository clone
git clone https://github.com/your-repo/FireBug-navigator.git
cd FireBug-navigator

# Dependencies install
npm install

# Environment konfiqurasiyası
cp .env.example .env.local
# .env.local faylına API key-ləri əlavə edin

# Development server
npm run dev
```

Brauzer: http://localhost:3000

---

## 🔑 API Keys

Aşağıdakı API key-ləri `.env.local` faylına əlavə edin:

| API | Əldə etmə linki | Tələb |
|-----|-----------------|-------|
| NASA FIRMS | https://firms.modaps.eosdis.nasa.gov/api/area/ | Pulsuz |
| Sentinel Hub | https://www.sentinel-hub.com/ | Trial mövcud |
| OpenRouteService | https://openrouteservice.org/dev/#/signup | Pulsuz tier |

```env
NEXT_PUBLIC_FIRMS_API_KEY=your_key
NEXT_PUBLIC_SENTINEL_CLIENT_ID=your_id
NEXT_PUBLIC_SENTINEL_CLIENT_SECRET=your_secret
NEXT_PUBLIC_ORS_API_KEY=your_key
```

---

## 📁 Layihə Strukturu

```
src/
├── app/                    # Next.js App Router
├── components/
│   ├── ui/                # Reusable UI (Button, Card, Input)
│   ├── map/               # Xəritə komponentləri
│   ├── panels/            # Sidebar panelləri
│   └── layout/            # Layout komponentləri
├── services/              # API servisləri
│   ├── firms.service.js   # NASA FIRMS
│   ├── sentinel.service.js # Sentinel Hub
│   └── routing.service.js # OpenRouteService
├── store/                 # Zustand state
└── lib/                   # Utilities

docs/
├── ARCHITECTURE.md        # Sistem arxitekturası
├── WORKFLOW.md           # İstifadə təlimatı
├── QGIS_WORKFLOW.md      # QGIS burn detection
└── components/           # Komponent dokumentasiyası
```

---

## 🔄 İş Axını

```
1. AOI Seçimi     →  Xəritədə ərazi çəkin
2. Hotspot Yüklə  →  FIRMS API-dən data alın
3. Görüntü Al     →  Sentinel pre/post imagery
4. QGIS Analiz    →  NBR/dNBR/Burn polygon
5. Polygon Yüklə  →  GeoJSON import
6. Marşrut Planı  →  Təhlükəsiz yol hesabla
7. Hesabat        →  PDF/CSV export
```

---

## 📊 Texnologiyalar

| Kateqoriya | Texnologiya |
|------------|-------------|
| Frontend | Next.js 16, React 19 |
| Styling | Tailwind CSS 4 |
| State | Zustand |
| Maps | Leaflet, React-Leaflet |
| Drawing | Leaflet-Draw |
| Geo Processing | Turf.js |
| PDF | jsPDF |
| HTTP | Axios |

---

## 📚 Dokumentasiya

- [Sistem Arxitekturası](docs/ARCHITECTURE.md)
- [İş Axını Təlimatı](docs/WORKFLOW.md)
- [QGIS Burn Detection](docs/QGIS_WORKFLOW.md)
- [Map Components](docs/components/MAP_COMPONENTS.md)
- [API Services](docs/components/SERVICES.md)
- [Panel Components](docs/components/PANELS.md)

---

## 🤝 Contribution

1. Fork edin
2. Feature branch yaradın (`git checkout -b feature/amazing`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing`)
5. Pull Request açın

---

## 📝 License

MIT License - Hakaton layihəsi

---

## 👥 Team

FireBug Navigator - Hakaton 2024

---

## 💡 Tövsiyələr və Gələcək İnkişaf

### Qısa müddət
- [ ] Dark mode toggle
- [ ] Mobile responsive
- [ ] Hotspot clustering (performance)
- [ ] Time-series animation

### Orta müddət
- [ ] Real-time WebSocket updates
- [ ] User authentication
- [ ] Saved AOI/Analysis history
- [ ] Alert/notification system

### Uzun müddət
- [ ] ML-based fire prediction
- [ ] Multi-user collaboration
- [ ] Mobile app (React Native)
- [ ] API for third-party integration
