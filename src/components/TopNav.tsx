/**
 * Top Navigation Bar with Integrated Touch-Friendly Tabs
 * Positioned exclusively at the TOP of the screen so nothing is blocked by Netlify badges or mobile browser bottom bars
 */

import React from 'react';
import { Camera, FileSpreadsheet, FileText, ShieldCheck, Zap } from 'lucide-react';

interface TopNavProps {
  activeTab: 'scanner' | 'history' | 'export' | 'guide';
  onTabChange: (tab: 'scanner' | 'history' | 'export' | 'guide') => void;
  invoiceCount: number;
  sessionScanCount: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onTabChange,
  invoiceCount,
  sessionScanCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-md">
      {/* Upper Brand & Quick Action Row */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          onClick={() => onTabChange('scanner')}
          className="text-base sm:text-lg font-bold tracking-tight text-white hover:text-emerald-400 transition whitespace-nowrap shrink-0 text-left flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>ZATCA Fatoora</span>
        </button>

        {/* Quick Batch Status & CTA */}
        <div className="flex items-center gap-2">
          {sessionScanCount > 0 && (
            <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-[11px] font-medium text-emerald-300">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>{sessionScanCount} Scanned</span>
            </div>
          )}

          <button
            onClick={() => onTabChange('export')}
            className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Generate CSV</span>
          </button>
        </div>
      </div>

      {/* Lower Touch Tabs Row (Visible on both Mobile and Desktop at TOP) */}
      <div className="border-t border-slate-850 bg-slate-900/60">
        <div className="max-w-6xl mx-auto px-2 sm:px-6">
          <nav className="grid grid-cols-4 gap-1 py-1.5">
            {/* Tab 1: Batch Scan */}
            <button
              type="button"
              onClick={() => onTabChange('scanner')}
              className={`h-11 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 ${
                activeTab === 'scanner'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span className="truncate">Scan QR</span>
            </button>

            {/* Tab 2: Invoices History */}
            <button
              type="button"
              onClick={() => onTabChange('history')}
              className={`h-11 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 ${
                activeTab === 'history'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">Invoices</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'history'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {invoiceCount}
              </span>
            </button>

            {/* Tab 3: Manager CSV */}
            <button
              type="button"
              onClick={() => onTabChange('export')}
              className={`h-11 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 ${
                activeTab === 'export'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span className="truncate">Send CSV</span>
            </button>

            {/* Tab 4: Phase 2 Guide */}
            <button
              type="button"
              onClick={() => onTabChange('guide')}
              className={`h-11 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 ${
                activeTab === 'guide'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">Phase 2</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
