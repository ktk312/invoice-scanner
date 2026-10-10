/**
 * Manager Export & Communication Hub
 * Enables instant CSV generation, email dispatch, and executive summary sharing for manager approval
 */

import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Mail,
  Share2,
  Copy,
  Check,
  Building,
  UserCheck,
  Send,
  Eye,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { InvoiceItem, ManagerSettings } from '../types/invoice';
import {
  downloadInvoiceCsv,
  generateInvoiceCsv,
  generateManagerSummaryText,
} from '../utils/csvExport';
import { saveManagerSettings } from '../services/storage';

interface ManagerExportModalProps {
  invoices: InvoiceItem[];
  settings: ManagerSettings;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSettings: (newSettings: ManagerSettings) => void;
}

export const ManagerExportModal: React.FC<ManagerExportModalProps> = ({
  invoices,
  settings,
  isOpen,
  onClose,
  onUpdateSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<ManagerSettings>(settings);
  const [showSettingsEdit, setShowSettingsEdit] = useState(false);
  const [exportFormat, setExportFormat] = useState<'stripped_manager' | 'full_audit'>('stripped_manager');
  const [excelSafeTrn, setExcelSafeTrn] = useState(true);
  const [previewTab, setPreviewTab] = useState<'summary' | 'csv'>('summary');
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalWithVat, 0);
  const totalVat = invoices.reduce((sum, inv) => sum + inv.vatTotal, 0);
  const totalSubtotal = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const phase2Count = invoices.filter((inv) => inv.complianceAudit.phase === 'phase_2').length;

  const { subject, bodyText, mailtoUrl } = generateManagerSummaryText(invoices, localSettings);
  const csvRaw = generateInvoiceCsv(invoices, localSettings, exportFormat, excelSafeTrn);

  const handleDownloadCsv = () => {
    downloadInvoiceCsv(invoices, localSettings, exportFormat, excelSafeTrn);
    setCopiedStatus('csv_downloaded');
    setTimeout(() => setCopiedStatus(null), 3000);
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(bodyText);
    setCopiedStatus('summary_copied');
    setTimeout(() => setCopiedStatus(null), 2500);
  };

  const handleCopyCsvRaw = () => {
    navigator.clipboard.writeText(csvRaw);
    setCopiedStatus('csv_copied');
    setTimeout(() => setCopiedStatus(null), 2500);
  };

  const handleSaveSettings = () => {
    saveManagerSettings(localSettings);
    onUpdateSettings(localSettings);
    setShowSettingsEdit(false);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: subject,
          text: bodyText,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopySummary();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Manager Report &amp; CSV Export</h3>
              <p className="text-xs text-slate-400">
                {invoices.length} invoices ({totalAmount.toFixed(2)} SAR) ready for reporting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsEdit(!showSettingsEdit)}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition ${
                showSettingsEdit
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
              }`}
              title="Edit Manager & Reporting Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Settings Drawer (if toggled) */}
          {showSettingsEdit ? (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Configure Manager &amp; Submitter Profile</span>
                </h4>
                <span className="text-[11px] text-slate-500">Auto-saved to device</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Manager Name</label>
                  <input
                    type="text"
                    value={localSettings.managerName}
                    onChange={(e) => setLocalSettings({ ...localSettings, managerName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Manager Email</label>
                  <input
                    type="email"
                    value={localSettings.managerEmail}
                    onChange={(e) => setLocalSettings({ ...localSettings, managerEmail: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Employee Name</label>
                  <input
                    type="text"
                    value={localSettings.employeeName}
                    onChange={(e) => setLocalSettings({ ...localSettings, employeeName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={localSettings.employeeId}
                    onChange={(e) => setLocalSettings({ ...localSettings, employeeId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Company / Entity</label>
                  <input
                    type="text"
                    value={localSettings.companyName}
                    onChange={(e) => setLocalSettings({ ...localSettings, companyName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Department</label>
                  <input
                    type="text"
                    value={localSettings.department}
                    onChange={(e) => setLocalSettings({ ...localSettings, department: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowSettingsEdit(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Save Profile
                </button>
              </div>
            </div>
          ) : null}

          {/* Quick Summary KPI Card */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block">Recipient</span>
                <span className="text-xs font-semibold text-slate-200">
                  {localSettings.managerName} ({localSettings.managerEmail})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>{phase2Count} of {invoices.length} Phase 2 Verified</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Net Subtotal</span>
                <span className="font-semibold text-slate-200 tabular-nums">
                  {totalSubtotal.toFixed(2)} SAR
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">VAT 15% (Reclaimable)</span>
                <span className="font-semibold text-emerald-400 tabular-nums">
                  {totalVat.toFixed(2)} SAR
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Grand Total</span>
                <span className="font-bold text-white text-sm tabular-nums">
                  {totalAmount.toFixed(2)} SAR
                </span>
              </div>
            </div>
          </div>

          {/* Export Columns Selector */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">CSV Sheet Columns</span>
              <div className="flex items-center gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setExportFormat('stripped_manager')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                    exportFormat === 'stripped_manager'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Stripped (6 Columns)
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('full_audit')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                    exportFormat === 'full_audit'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Full Audit
                </button>
              </div>
            </div>

            {exportFormat === 'stripped_manager' ? (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-300 font-mono bg-emerald-950/30 p-2 rounded-xl border border-emerald-900/50">
                <span>Supplier Name</span>
                <span className="text-slate-500">·</span>
                <span>Seller TRN</span>
                <span className="text-slate-500">·</span>
                <span>Invoice Date Time</span>
                <span className="text-slate-500">·</span>
                <span>Price</span>
                <span className="text-slate-500">·</span>
                <span>VAT</span>
                <span className="text-slate-500">·</span>
                <span>Total</span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">
                Includes all ZATCA Phase 2 hashes, category, notes, and verification statuses.
              </div>
            )}

            {/* Excel TRN Precision Option */}
            <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={excelSafeTrn}
                onChange={(e) => setExcelSafeTrn(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-0 accent-emerald-500"
              />
              <span>Format Seller TRN as text in Excel (prevents 15 digits turning into 3.0E+14)</span>
            </label>
          </div>

          {/* Primary Quick Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Download CSV Action */}
            <button
              onClick={handleDownloadCsv}
              className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-between transition active:scale-98 shadow-lg shadow-emerald-950/40 text-left"
            >
              <div className="space-y-0.5">
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download CSV File</span>
                </div>
                <div className="text-[11px] text-emerald-100">
                  Excel-ready with Arabic UTF-8 BOM
                </div>
              </div>
              <span className="text-xs font-medium bg-emerald-700/60 px-2.5 py-1 rounded-lg">
                .csv
              </span>
            </button>

            {/* 2. Send Email to Manager */}
            <a
              href={mailtoUrl}
              className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-between transition active:scale-98 text-left"
            >
              <div className="space-y-0.5">
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Send Email to Manager</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Pre-filled summary &amp; totals
                </div>
              </div>
              <Send className="w-4 h-4 text-slate-400" />
            </a>
          </div>

          {/* Secondary Quick Share Buttons */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={handleCopySummary}
              className="flex-1 min-h-[44px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition"
            >
              {copiedStatus === 'summary_copied' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedStatus === 'summary_copied' ? 'Summary Copied!' : 'Copy Summary (WhatsApp/Slack)'}</span>
            </button>

            <button
              onClick={handleNativeShare}
              className="min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Share</span>
            </button>
          </div>

          {/* Preview Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewTab('summary')}
                  className={`text-xs font-semibold pb-1 border-b-2 transition ${
                    previewTab === 'summary'
                      ? 'border-emerald-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Manager Email Draft Preview
                </button>
                <button
                  onClick={() => setPreviewTab('csv')}
                  className={`text-xs font-semibold pb-1 border-b-2 transition ${
                    previewTab === 'csv'
                      ? 'border-emerald-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Raw CSV Table Preview
                </button>
              </div>

              {previewTab === 'csv' && (
                <button
                  onClick={handleCopyCsvRaw}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  {copiedStatus === 'csv_copied' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>Copy CSV</span>
                </button>
              )}
            </div>

            {previewTab === 'summary' ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed select-all">
                {bodyText}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono overflow-x-auto max-h-56 overflow-y-auto whitespace-pre select-all">
                {csvRaw}
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {invoices.length} invoices ready to send
          </span>
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
