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
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import logo from "@/app/assets/icon.png"
import Image from "next/image";

const MENU_ITEMS = [
  { 
    id: "hotspots", 
    label: "Hotspots", 
    icon: Flame, 
    description: "FIRMS fire detection" 
  },
  { 
    id: "spread", 
    label: "Fire Spread", 
    icon: TrendingUp, 
    description: "Wind-based prediction" 
  },
  { 
    id: "imagery", 
    label: "Satellite Imagery", 
    icon: Satellite, 
    description: "Before/After comparison" 
  },
//   { 
//     id: "analysis", 
//     label: "Analysis", 
//     icon: BarChart3, 
//     description: "Burn area calculation" 
//   },
//   { 
//     id: "route", 
//     label: "Routing", 
//     icon: Route, 
//     description: "Fire department routes" 
//   },
  { 
    id: "report", 
    label: "Reports", 
    icon: FileText, 
    description: "PDF/CSV export" 
  }
];

/**
 * Sidebar Component
 * Main navigation sidebar
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
 
          <div className="w-16 h-16 overflow-hidden">
            <Image src={logo} alt="Logo" width={100} height={100}  className="w-full h-full object-contain"/>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-white">FireBug</h1>
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
          {!isCollapsed && <span className="text-sm">Layer Control</span>}
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
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
