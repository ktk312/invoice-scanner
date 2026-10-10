/**
 * Mobile Ergonomic Fixed Bottom Tab Bar
 * Implements Mobile Touch Apps Pattern 1:
 * - 44px+ hitboxes in natural thumb reach zone
 * - 22px icon + 10px-11px caption
 * - Active state indicators
 */

import React from 'react';
import { Camera, FileText, FileSpreadsheet, ShieldCheck } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: 'scanner' | 'history' | 'export' | 'guide';
  onTabChange: (tab: 'scanner' | 'history' | 'export' | 'guide') => void;
  invoiceCount: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
  invoiceCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 md:hidden">
      <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
        {/* Tab 1: Scanner */}
        <button
          onClick={() => onTabChange('scanner')}
          className={`min-h-[48px] flex flex-col items-center justify-center transition active:scale-95 ${
            activeTab === 'scanner' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Scan QR</span>
        </button>

        {/* Tab 2: Invoices */}
        <button
          onClick={() => onTabChange('history')}
          className={`min-h-[48px] relative flex flex-col items-center justify-center transition active:scale-95 ${
            activeTab === 'history' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <FileText className="w-5 h-5" />
            {invoiceCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-bold flex items-center justify-center tabular-nums">
                {invoiceCount > 99 ? '99+' : invoiceCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-1">Invoices</span>
        </button>

        {/* Tab 3: Manager CSV */}
        <button
          onClick={() => onTabChange('export')}
          className={`min-h-[48px] flex flex-col items-center justify-center transition active:scale-95 ${
            activeTab === 'export' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Send CSV</span>
        </button>

        {/* Tab 4: Phase 2 Standards */}
        <button
          onClick={() => onTabChange('guide')}
          className={`min-h-[48px] flex flex-col items-center justify-center transition active:scale-95 ${
            activeTab === 'guide' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Phase 2</span>
        </button>
      </div>
    </nav>
  );
};
