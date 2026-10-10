/**
 * ZATCA Invoice Detail & Phase 2 Compliance Inspector Modal
 * Displays decoded TLV tags, compliance audit checks, expense category tagging, and manager notes
 */

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Building,
  Calendar,
  Hash,
  Coins,
  FileText,
  Key,
  Lock,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  Briefcase,
  Trash2,
} from 'lucide-react';
import { ExpenseCategory, InvoiceItem, SubmissionStatus } from '../types/invoice';
import { normalizeZatcaTrn } from '../utils/zatcaParser';

interface InvoiceDetailModalProps {
  invoice: InvoiceItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: InvoiceItem) => void;
  onDelete?: (id: string) => void;
  isNewScan?: boolean;
}

const CATEGORIES: ExpenseCategory[] = [
  'Meals & Dining',
  'Travel & Lodging',
  'Transportation & Fuel',
  'Office Supplies',
  'IT & Software',
  'Utilities & Telecom',
  'Client Entertainment',
  'Professional Services',
  'Maintenance',
  'Other',
];

const STATUS_OPTIONS: { value: SubmissionStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready_for_review', label: 'Ready for Review' },
  { value: 'submitted_to_manager', label: 'Submitted to Manager' },
  { value: 'approved', label: 'Approved by Manager' },
  { value: 'reimbursed', label: 'Reimbursed' },
];

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isNewScan = false,
}) => {
  const [editedCategory, setEditedCategory] = useState<ExpenseCategory>(invoice.category);
  const [editedSellerName, setEditedSellerName] = useState(invoice.sellerName);
  const [editedVatNumber, setEditedVatNumber] = useState(invoice.vatNumber);
  const [editedNotes, setEditedNotes] = useState(invoice.notes || '');
  const [editedProject, setEditedProject] = useState(invoice.projectCode || '');
  const [editedStatus, setEditedStatus] = useState<SubmissionStatus>(invoice.submissionStatus);

  const [showRawTlv, setShowRawTlv] = useState(false);
  const [showAllChecks, setShowAllChecks] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveAndClose = () => {
    const cleanTrn = normalizeZatcaTrn(editedVatNumber) || invoice.vatNumber;
    const updated: InvoiceItem = {
      ...invoice,
      sellerName: editedSellerName.trim() || invoice.sellerName,
      vatNumber: cleanTrn,
      category: editedCategory,
      notes: editedNotes,
      projectCode: editedProject,
      submissionStatus: editedStatus,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const audit = invoice.complianceAudit;
  const isPhase2 = audit.phase === 'phase_2';
  const isPhase1 = audit.phase === 'phase_1';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isPhase2
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : isPhase1
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {isPhase2 ? (
                <ShieldCheck className="w-5 h-5" />
              ) : isPhase1 ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white truncate max-w-[220px] sm:max-w-xs">
                {isNewScan ? 'Invoice Scanned' : 'Invoice Details'}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className={isPhase2 ? 'text-emerald-400 font-medium' : isPhase1 ? 'text-amber-400 font-medium' : 'text-rose-400 font-medium'}>
                  {isPhase2 ? 'ZATCA Phase 2 Verified' : isPhase1 ? 'ZATCA Phase 1 Legacy' : 'Format Non-Compliant'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{audit.score}% score</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Vendor & Financial Primary Card */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Seller / Vendor (Tag 1)</span>
                </div>
                <h4 className="text-base font-bold text-slate-100 font-arabic leading-snug">
                  {invoice.sellerName}
                </h4>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] text-slate-400 font-medium">Grand Total (SAR)</div>
                <div className="text-2xl font-bold text-emerald-400 tabular-nums">
                  {invoice.totalWithVat.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Subtotal & VAT Breakdown Strip */}
            <div className="pt-3 border-t border-slate-800/60 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Net Subtotal</span>
                <span className="font-semibold text-slate-200 tabular-nums">
                  {invoice.subtotal.toFixed(2)} SAR
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">VAT 15% (Tag 5)</span>
                <span className="font-semibold text-emerald-400 tabular-nums">
                  {invoice.vatTotal.toFixed(2)} SAR
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Effective Rate</span>
                <span className="font-semibold text-slate-200 tabular-nums">
                  {invoice.calculatedVatRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* VAT Number & Timestamp Row */}
            <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5" dir="ltr">
                <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-400 font-medium">Seller TRN:</span>
                <span className="font-mono tabular-nums text-slate-200 font-semibold select-all">
                  {editedVatNumber || invoice.vatNumber}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(editedVatNumber || invoice.vatNumber, 'vat')}
                  className="p-1 hover:text-white text-slate-400 transition"
                  title="Copy Seller TRN"
                >
                  {copiedKey === 'vat' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {invoice.timestamp
                    ? new Date(invoice.timestamp).toLocaleString('en-GB')
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* ZATCA Phase 2 Audit Checklist Card */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">ZATCA Phase 2 Compliance Audit</span>
              </div>
              <button
                onClick={() => setShowAllChecks(!showAllChecks)}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <span>{showAllChecks ? 'Collapse' : 'View all checks'}</span>
                {showAllChecks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {audit.summaryMessage}
            </p>

            {/* Visible check pills */}
            <div className="space-y-2 pt-1">
              {(showAllChecks ? audit.checks : audit.checks.slice(0, 4)).map((check) => (
                <div
                  key={check.id}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/70 text-xs flex items-start gap-2.5"
                >
                  <div className="mt-0.5 shrink-0">
                    {check.status === 'passed' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : check.status === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="font-medium text-slate-200">{check.title}</div>
                    <div className="text-slate-400 text-[11px]">{check.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase 2 Cryptographic Artifacts Accordion */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">Phase 2 Cryptographic Artifacts</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {invoice.hasPhase2Crypto ? 'Cryptographically Sealed' : 'Not Present (Phase 1)'}
              </span>
            </div>

            {invoice.hasPhase2Crypto ? (
              <div className="space-y-2.5 text-xs">
                {/* XML Hash */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1 font-medium">
                      <Hash className="w-3 h-3 text-emerald-400" /> XML Invoice SHA-256 Digest (Tag 6)
                    </span>
                    <button
                      onClick={() => handleCopy(invoice.xmlHash || '', 'hash')}
                      className="text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'hash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <p className="font-mono text-slate-300 break-all text-[11px] bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                    {invoice.xmlHash || 'None'}
                  </p>
                </div>

                {/* ECDSA Digital Signature */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1 font-medium">
                      <Key className="w-3 h-3 text-indigo-400" /> Digital Stamp / ECDSA Signature (Tag 7)
                    </span>
                    <button
                      onClick={() => handleCopy(invoice.digitalSignature || '', 'sig')}
                      className="text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'sig' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <p className="font-mono text-slate-300 break-all text-[11px] bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                    {invoice.digitalSignature ? `${invoice.digitalSignature.slice(0, 60)}...` : 'None'}
                  </p>
                </div>

                {/* Public Key */}
                {invoice.publicKey && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1 font-medium">
                        <Key className="w-3 h-3 text-amber-400" /> CSID Public Key (Tag 8)
                      </span>
                      <button
                        onClick={() => handleCopy(invoice.publicKey || '', 'pubkey')}
                        className="text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === 'pubkey' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <p className="font-mono text-slate-300 break-all text-[11px] bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                      {invoice.publicKey.slice(0, 60)}...
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                This invoice conforms to Phase 1 generation rules. For full Phase 2 integration, the supplier POS must embed Tags 6-8 (SHA-256 XML hash and ECDSA digital signature).
              </p>
            )}

            {/* Toggle Raw Base64 string */}
            <div className="pt-2">
              <button
                onClick={() => setShowRawTlv(!showRawTlv)}
                className="text-xs text-slate-400 hover:text-slate-200 underline decoration-slate-600 underline-offset-4"
              >
                {showRawTlv ? 'Hide Raw Base64 TLV' : 'Inspect Raw QR Payload'}
              </button>
              {showRawTlv && (
                <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 break-all space-y-2">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Base64 String:</span>
                    <button
                      onClick={() => handleCopy(invoice.rawQrContent, 'raw')}
                      className="text-emerald-400 hover:underline"
                    >
                      {copiedKey === 'raw' ? 'Copied!' : 'Copy Payload'}
                    </button>
                  </div>
                  <p className="max-h-24 overflow-y-auto">{invoice.rawQrContent}</p>
                </div>
              )}
            </div>
          </div>

          {/* Expense Report Categorization & Manager Notes Form */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">Invoice Data &amp; Expense Metadata</span>
              </div>
              <span className="text-[11px] text-slate-400">Editable if misread</span>
            </div>

            {/* Editable Supplier Name & Seller TRN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Supplier / Vendor Name</span>
                </label>
                <input
                  type="text"
                  value={editedSellerName}
                  onChange={(e) => setEditedSellerName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                  placeholder="Vendor Name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Seller TRN (15 Digits)</span>
                  </span>
                  <span className={`text-[10px] font-mono ${editedVatNumber.length === 15 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {editedVatNumber.length}/15 digits
                  </span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={15}
                  value={editedVatNumber}
                  onChange={(e) => setEditedVatNumber(normalizeZatcaTrn(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition"
                  placeholder="300056123400003"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Category */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Expense Category</label>
                <select
                  value={editedCategory}
                  onChange={(e) => setEditedCategory(e.target.value as ExpenseCategory)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Approval Status</label>
                <select
                  value={editedStatus}
                  onChange={(e) => setEditedStatus(e.target.value as SubmissionStatus)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Project Code */}
            <div className="space-y-1 text-xs">
              <label className="text-slate-400 block font-medium flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-slate-400" />
                <span>Project / Department Code</span>
              </label>
              <input
                type="text"
                value={editedProject}
                onChange={(e) => setEditedProject(e.target.value)}
                placeholder="e.g. PRJ-2026-RIYADH or OPS-HQ"
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Manager Notes / Justification */}
            <div className="space-y-1 text-xs">
              <label className="text-slate-400 block font-medium flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                <span>Business Purpose / Note for Manager</span>
              </label>
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Enter justification, attendee list, or business objective for manager review..."
                rows={2}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Bottom Sticky Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3">
          {onDelete ? (
            isConfirmingDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(invoice.id);
                    onClose();
                  }}
                  className="h-11 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-lg shadow-rose-950/50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="h-11 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="h-11 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700/80 hover:border-rose-800 text-slate-400 hover:text-rose-300 text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndClose}
              className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-900/20 transition active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Save &amp; Update</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
