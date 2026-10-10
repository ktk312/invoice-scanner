/**
 * ZATCA Invoice History & Management List
 * Complies with Mobile Touch App guidelines:
 * - 44px+ touch targets
 * - Real-time search and multi-facet filtering
 * - Financial summary metrics
 * - Multi-select bulk export / delete
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Layers,
  CheckSquare,
  Square,
  Utensils,
  Plane,
  Fuel,
  Package,
  Cpu,
  Wifi,
  Sparkles,
  HelpCircle,
  Wrench,
  DollarSign,
} from 'lucide-react';
import { ExpenseCategory, InvoiceItem } from '../types/invoice';

interface InvoiceHistoryProps {
  invoices: InvoiceItem[];
  onSelectInvoice: (invoice: InvoiceItem) => void;
  onDeleteSingle: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onOpenExportModal: () => void;
  onOpenScanner: () => void;
}

export const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({
  invoices,
  onSelectInvoice,
  onDeleteSingle,
  onDeleteMultiple,
  onOpenExportModal,
  onOpenScanner,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<'all' | 'phase_2' | 'phase_1' | 'flagged'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);

  // Category Icon Resolver
  const getCategoryIcon = (category: ExpenseCategory) => {
    switch (category) {
      case 'Meals & Dining':
        return <Utensils className="w-4 h-4 text-amber-400" />;
      case 'Travel & Lodging':
        return <Plane className="w-4 h-4 text-blue-400" />;
      case 'Transportation & Fuel':
        return <Fuel className="w-4 h-4 text-orange-400" />;
      case 'Office Supplies':
        return <Package className="w-4 h-4 text-emerald-400" />;
      case 'IT & Software':
        return <Cpu className="w-4 h-4 text-cyan-400" />;
      case 'Utilities & Telecom':
        return <Wifi className="w-4 h-4 text-purple-400" />;
      case 'Maintenance':
        return <Wrench className="w-4 h-4 text-slate-400" />;
      default:
        return <DollarSign className="w-4 h-4 text-emerald-400" />;
    }
  };

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      // Search match
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.sellerName.toLowerCase().includes(query) ||
        item.vatNumber.toLowerCase().includes(query) ||
        (item.notes && item.notes.toLowerCase().includes(query)) ||
        (item.projectCode && item.projectCode.toLowerCase().includes(query));

      // Phase match
      const matchPhase =
        selectedPhase === 'all' ||
        (selectedPhase === 'phase_2' && item.complianceAudit.phase === 'phase_2') ||
        (selectedPhase === 'phase_1' && item.complianceAudit.phase === 'phase_1') ||
        (selectedPhase === 'flagged' && item.complianceAudit.phase === 'non_compliant');

      // Category match
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;

      return matchSearch && matchPhase && matchCat;
    });
  }, [invoices, searchQuery, selectedPhase, selectedCategory]);

  // Aggregate stats
  const totals = useMemo(() => {
    const totalAmount = filteredInvoices.reduce((sum, item) => sum + item.totalWithVat, 0);
    const totalVat = filteredInvoices.reduce((sum, item) => sum + item.vatTotal, 0);
    const phase2Count = filteredInvoices.filter((item) => item.complianceAudit.phase === 'phase_2').length;
    const p2Rate = filteredInvoices.length > 0 ? Math.round((phase2Count / filteredInvoices.length) * 100) : 0;
    return { totalAmount, totalVat, phase2Count, p2Rate };
  }, [filteredInvoices]);

  // Multi-select handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map((inv) => inv.id)));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    onDeleteMultiple(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsConfirmingBulkDelete(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Local Storage Privacy Banner */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-emerald-400 font-medium text-[11px]">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>100% Local On-Device Storage</span>
        </div>
        <span className="text-[11px] text-slate-500">All invoices kept private offline</span>
      </div>

      {/* Financial Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Spend */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-400">Total Expenses</div>
          <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">
            {totals.totalAmount.toFixed(2)} <span className="text-xs font-normal text-slate-400">SAR</span>
          </div>
          <div className="text-[11px] text-slate-500">{filteredInvoices.length} invoices</div>
        </div>

        {/* VAT Reclaimable */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Reclaimable VAT 15%</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 tabular-nums">
            {totals.totalVat.toFixed(2)} <span className="text-xs font-normal text-slate-400">SAR</span>
          </div>
          <div className="text-[11px] text-slate-500">Tax deductible in KSA</div>
        </div>

        {/* Phase 2 Compliance */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-indigo-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Phase 2 Compliance</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-400 tabular-nums">
            {totals.p2Rate}%
          </div>
          <div className="text-[11px] text-slate-500">
            {totals.phase2Count} of {filteredInvoices.length} compliant
          </div>
        </div>

        {/* Export / Quick CTA */}
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-emerald-300">Manager Report</div>
          <button
            onClick={onOpenExportModal}
            className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-950/40"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Generate CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor name, VAT ID, project..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Category Dropdown */}
          <div className="shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-11 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">All Categories</option>
              <option value="Meals & Dining">Meals &amp; Dining</option>
              <option value="Travel & Lodging">Travel &amp; Lodging</option>
              <option value="Transportation & Fuel">Transportation &amp; Fuel</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="IT & Software">IT &amp; Software</option>
              <option value="Utilities & Telecom">Utilities &amp; Telecom</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Phase Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedPhase('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              selectedPhase === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setSelectedPhase('phase_2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 ${
              selectedPhase === 'phase_2'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Phase 2 Verified</span>
          </button>
          <button
            onClick={() => setSelectedPhase('phase_1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 ${
              selectedPhase === 'phase_1'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Phase 1 Legacy</span>
          </button>
          <button
            onClick={() => setSelectedPhase('flagged')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 ${
              selectedPhase === 'flagged'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Review Flagged</span>
          </button>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {filteredInvoices.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 hover:text-white transition"
          >
            {selectedIds.size === filteredInvoices.length ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>
              {selectedIds.size > 0 ? `${selectedIds.size} Selected` : 'Select All'}
            </span>
          </button>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              {isConfirmingBulkDelete ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1 transition shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm ({selectedIds.size})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingBulkDelete(false)}
                    className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-white transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingBulkDelete(true)}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedIds.size})</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Invoice List Items */}
      {filteredInvoices.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-slate-200">No Invoices Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {searchQuery || selectedPhase !== 'all' || selectedCategory !== 'all'
                ? 'No invoices match your current search or filters.'
                : 'Your invoice history is empty. Start scanning your printed hard copy invoices.'}
            </p>
          </div>
          <button
            onClick={onOpenScanner}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition"
          >
            Scan New Invoice
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInvoices.map((inv) => {
            const isP2 = inv.complianceAudit.phase === 'phase_2';
            const isSelected = selectedIds.has(inv.id);

            return (
              <div
                key={inv.id}
                onClick={() => onSelectInvoice(inv)}
                className={`group p-3.5 sm:p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border transition cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] ${
                  isSelected
                    ? 'border-emerald-500/60 bg-emerald-950/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Left Selection Checkbox & Category Icon */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => toggleSelectOne(inv.id, e)}
                    className="p-1 text-slate-500 hover:text-white transition"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )}
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center shrink-0">
                    {getCategoryIcon(inv.category)}
                  </div>

                  {/* Vendor Details */}
                  <div className="space-y-0.5 max-w-[180px] sm:max-w-md">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-emerald-400 transition">
                        {inv.sellerName}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span>{inv.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {inv.timestamp ? new Date(inv.timestamp).toLocaleDateString('en-GB') : 'N/A'}
                      </span>
                      {inv.projectCode && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-slate-300">{inv.projectCode}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Total & Compliance Badge */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm sm:text-base font-bold text-white tabular-nums">
                      {inv.totalWithVat.toFixed(2)}{' '}
                      <span className="text-[10px] font-normal text-slate-400">SAR</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-[11px]">
                      <span className="text-emerald-400 tabular-nums">
                        +{inv.vatTotal.toFixed(2)} VAT
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${
                          isP2
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {isP2 ? 'P2' : 'P1'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSingle(inv.id);
                    }}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition active:scale-95"
                    title="Delete invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
