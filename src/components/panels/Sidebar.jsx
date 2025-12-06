"use client";

import { useMapStore } from "@/store/useMapStore";
import { cn } from "@/lib/utils";
import { 
  Flame, 
  Satellite, 
  BarChart3, 
  Route, 
  FileText,
  Layers,
  Map as MapIcon,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

const MENU_ITEMS = [
  { 
    id: "hotspots", 
    label: "Hotspotlar", 
    icon: Flame, 
    description: "FIRMS yanğın nöqtələri" 
  },
  { 
    id: "imagery", 
    label: "Peyk Görüntüləri", 
    icon: Satellite, 
    description: "Before/After şəkillər" 
  },
  { 
    id: "analysis", 
    label: "Analiz", 
    icon: BarChart3, 
    description: "Yanğın sahəsi hesablaması" 
  },
  { 
    id: "route", 
    label: "Marşrut", 
    icon: Route, 
    description: "Təhlükəsiz yol planı" 
  },
  { 
    id: "report", 
    label: "Hesabat", 
    icon: FileText, 
    description: "PDF/CSV export" 
  }
];

/**
 * Sidebar Component
 * Sol panel navigasiyası
 */
export default function Sidebar() {
  const { activePanel, setActivePanel } = useMapStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "h-full bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-white">FireMap</h1>
              <p className="text-xs text-gray-400">Navigator</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive 
                  ? "bg-orange-600 text-white" 
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && (
                <div className="text-left">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className={cn(
                    "text-xs",
                    isActive ? "text-orange-200" : "text-gray-500"
                  )}>
                    {item.description}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Layer Control Shortcut */}
      <div className="p-2 border-t border-gray-800">
        <button
          onClick={() => useMapStore.getState().toggleLayerControl()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
          title={isCollapsed ? "Layer Control" : undefined}
        >
          <Layers className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-sm">Layer Nəzarəti</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-gray-800">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Bağla</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
