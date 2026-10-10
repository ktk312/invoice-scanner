/**
 * Top Navigation Bar complying with the Top Bar Contract (Section 2 of Frontend Design Constitution)
 * Exact 3-Zone Contract:
 * Zone 1: Single text element Brand wordmark
 * Zone 2: Concise whitespace-nowrap nav links
 * Zone 3: 1 primary action button
 */

import React from 'react';
import { Camera, FileSpreadsheet } from 'lucide-react';

interface TopNavProps {
  activeTab: 'scanner' | 'history' | 'export' | 'guide';
  onTabChange: (tab: 'scanner' | 'history' | 'export' | 'guide') => void;
  invoiceCount: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onTabChange,
  invoiceCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single Text Element Brand Wordmark */}
        <button
          onClick={() => onTabChange('scanner')}
          className="text-lg font-bold tracking-tight text-white hover:text-emerald-400 transition whitespace-nowrap shrink-0 text-left flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>ZATCA Fatoora</span>
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => onTabChange('scanner')}
            className={`whitespace-nowrap shrink-0 transition ${
              activeTab === 'scanner' ? 'text-emerald-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Camera Scanner
          </button>
          <button
            onClick={() => onTabChange('history')}
            className={`whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
              activeTab === 'history' ? 'text-emerald-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            <span>Invoices</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded-full font-mono">
              {invoiceCount}
            </span>
          </button>
          <button
            onClick={() => onTabChange('export')}
            className={`whitespace-nowrap shrink-0 transition ${
              activeTab === 'export' ? 'text-emerald-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Manager Report &amp; CSV
          </button>
          <button
            onClick={() => onTabChange('guide')}
            className={`whitespace-nowrap shrink-0 transition ${
              activeTab === 'guide' ? 'text-emerald-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Phase 2 Standards
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onTabChange(activeTab === 'scanner' ? 'export' : 'scanner')}
            className="h-9 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            {activeTab === 'scanner' ? (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Manager CSV</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>Scan Invoice</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
