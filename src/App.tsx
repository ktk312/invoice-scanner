/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { InvoiceItem, ManagerSettings } from './types/invoice';
import {
  deleteMultipleInvoices,
  deleteSingleInvoice,
  loadInvoices,
  loadManagerSettings,
  saveManagerSettings,
  saveSingleInvoice,
  updateSingleInvoice,
} from './services/storage';
import { buildInvoiceItem } from './utils/zatcaParser';
import { CameraScanner } from './components/CameraScanner';
import { InvoiceHistory } from './components/InvoiceHistory';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { ManagerExportModal } from './components/ManagerExportModal';
import { Phase2AuditGuide } from './components/Phase2AuditGuide';
import { TopNav } from './components/TopNav';
import { BottomTabBar } from './components/BottomTabBar';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'history' | 'export' | 'guide'>('scanner');
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [managerSettings, setManagerSettings] = useState<ManagerSettings>(loadManagerSettings);

  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewScanModal, setIsNewScanModal] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  // Load persistent invoices on mount
  useEffect(() => {
    const stored = loadInvoices();
    setInvoices(stored);
  }, []);

  const showToast = useCallback((text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // When QR code is decoded from Camera or Image Upload
  const handleScanSuccess = useCallback((rawQrData: string) => {
    try {
      const newInvoice = buildInvoiceItem(rawQrData);
      const updatedList = saveSingleInvoice(newInvoice);
      setInvoices(updatedList);
      setSelectedInvoice(newInvoice);
      setIsNewScanModal(true);
      setIsDetailModalOpen(true);

      const isP2 = newInvoice.complianceAudit.phase === 'phase_2';
      showToast(
        `Scanned: ${newInvoice.sellerName} (${newInvoice.totalWithVat.toFixed(2)} SAR) - ${
          isP2 ? 'Phase 2 Verified' : 'Phase 1 Legacy'
        }`,
        isP2 ? 'success' : 'info'
      );
    } catch (err) {
      console.error('Scan processing error:', err);
      showToast('Failed to process QR data. Please try again.', 'warning');
    }
  }, [showToast]);

  // Save edits on invoice
  const handleSaveInvoice = (updated: InvoiceItem) => {
    const list = updateSingleInvoice(updated);
    setInvoices(list);
    showToast(`Updated "${updated.sellerName}" expense record.`);
  };

  // Delete single invoice
  const handleDeleteInvoice = (id: string) => {
    const list = deleteSingleInvoice(id);
    setInvoices(list);
    showToast('Invoice removed from history.', 'info');
  };

  // Delete multiple invoices
  const handleDeleteMultiple = (ids: string[]) => {
    const list = deleteMultipleInvoices(ids);
    setInvoices(list);
    showToast(`Deleted ${ids.length} invoices.`, 'info');
  };

  // Update manager settings
  const handleUpdateSettings = (settings: ManagerSettings) => {
    setManagerSettings(settings);
    saveManagerSettings(settings);
    showToast('Manager profile saved.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 pb-20 md:pb-6">
      {/* PWA Install Banner */}
      <PWAInstallBanner />

      {/* Top Bar Contract Navigation */}
      <TopNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'export') {
            setIsExportModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        invoiceCount={invoices.length}
      />

      {/* Global Notification Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-sm p-3.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="text-slate-200">{toastMessage.text}</span>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* VIEW 1: Camera QR Scanner */}
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            {/* Title / Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  KSA Invoice QR Scanner
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Scan hard copy Saudi invoices to extract ZATCA Phase 1 &amp; Phase 2 compliance data
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Send to Manager</span>
                </button>
              </div>
            </div>

            {/* Scanner Component */}
            <CameraScanner
              onScanSuccess={handleScanSuccess}
              isPaused={isDetailModalOpen}
            />

            {/* Quick Recent Scans Strip */}
            {invoices.length > 0 && (
              <div className="w-full max-w-lg mx-auto pt-2 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Recent Scanned Invoices</span>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>View all ({invoices.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {invoices.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedInvoice(item);
                        setIsNewScanModal(false);
                        setIsDetailModalOpen(true);
                      }}
                      className="p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 cursor-pointer transition active:scale-98"
                    >
                      <div className="space-y-0.5 truncate">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {item.sellerName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>{item.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-GB') : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-bold text-white tabular-nums">
                            {item.totalWithVat.toFixed(2)} SAR
                          </div>
                          <div className="text-[10px] text-emerald-400">
                            {item.complianceAudit.phase === 'phase_2' ? 'Phase 2 Seal' : 'Phase 1'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInvoice(item.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                          title="Delete invoice"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: Invoices History & Management */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Invoice History &amp; Records
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Manage scanned receipts, review ZATCA tax numbers, and organize expense categories
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('scanner')}
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Scan Another</span>
                </button>
              </div>
            </div>

            <InvoiceHistory
              invoices={invoices}
              onSelectInvoice={(inv) => {
                setSelectedInvoice(inv);
                setIsNewScanModal(false);
                setIsDetailModalOpen(true);
              }}
              onDeleteSingle={handleDeleteInvoice}
              onDeleteMultiple={handleDeleteMultiple}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onOpenScanner={() => setActiveTab('scanner')}
            />
          </div>
        )}

        {/* VIEW 3: Phase 2 Standards & Interactive Test Generator */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                ZATCA Phase 2 Compliance Standards
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Full technical specification, TLV tag breakdown, and test bench generator
              </p>
            </div>

            <Phase2AuditGuide
              onLoadGeneratedInvoice={(base64) => {
                handleScanSuccess(base64);
              }}
            />
          </div>
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'export') {
            setIsExportModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        invoiceCount={invoices.length}
      />

      {/* Invoice Detail / Inspection Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          isOpen={isDetailModalOpen}
          isNewScan={isNewScanModal}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedInvoice(null);
          }}
          onSave={handleSaveInvoice}
          onDelete={handleDeleteInvoice}
        />
      )}

      {/* Manager Report & CSV Export Modal */}
      <ManagerExportModal
        invoices={invoices}
        settings={managerSettings}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
