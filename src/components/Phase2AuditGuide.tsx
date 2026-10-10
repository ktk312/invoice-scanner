/**
 * ZATCA Phase 2 Compliance Guide, Educational Reference, and Interactive Test Bench
 * Details the official Fatoora Integration Phase specifications and includes a live QR Generator
 */

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  ShieldAlert,
  FileCode,
  Key,
  Hash,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Check,
  RefreshCw,
  QrCode as QrCodeIcon,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  auditZatcaCompliance,
  encodeZatcaTLV,
  parseZatcaTLV,
} from '../utils/zatcaParser';
import { ComplianceAudit, ZatcaRawTags } from '../types/invoice';

interface Phase2AuditGuideProps {
  onLoadGeneratedInvoice: (base64: string) => void;
}

export const Phase2AuditGuide: React.FC<Phase2AuditGuideProps> = ({
  onLoadGeneratedInvoice,
}) => {
  // Test Bench State
  const [inputBase64, setInputBase64] = useState('');
  const [testResult, setTestResult] = useState<{
    tags: ZatcaRawTags;
    audit: ComplianceAudit;
    isBase64Tlv: boolean;
  } | null>(null);

  // Generator State
  const [genVendor, setGenVendor] = useState('Al-Madinah Tech Co. - شركة المدينة للتقنية');
  const [genVat, setGenVat] = useState('310998877600003');
  const [genTotal, setGenTotal] = useState('575.00');
  const [genVatAmount, setGenVatAmount] = useState('75.00');
  const [genPhase, setGenPhase] = useState<'phase_2' | 'phase_1'>('phase_2');
  const [generatedBase64, setGeneratedBase64] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto calculate VAT at 15% when total changes
  const handleTotalChange = (val: string) => {
    setGenTotal(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      // 15% standard rate: subtotal = total / 1.15; vat = total - subtotal
      const subtotal = num / 1.15;
      const vat = num - subtotal;
      setGenVatAmount(vat.toFixed(2));
    }
  };

  // Generate QR Code
  useEffect(() => {
    const timestamp = new Date().toISOString();
    const isP2 = genPhase === 'phase_2';

    const tlvBase64 = encodeZatcaTLV({
      sellerName: genVendor,
      vatNumber: genVat,
      timestamp: timestamp,
      totalWithVat: genTotal,
      vatTotal: genVatAmount,
      xmlHash: isP2 ? 'c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2' : undefined,
      signature: isP2 ? 'MEUCIQD1aK8tL0Wj8m3b4K+V8v7Z01y3Y1k9X7w8v9u0t1s2AiEA4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c5' : undefined,
      publicKey: isP2 ? 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7Z5f8u8n3p2q1r0s9t8u7v6w5x4y3z2a1b0c9d8e7f6a5b4c3d2e1f0a' : undefined,
    });

    setGeneratedBase64(tlvBase64);

    QRCode.toDataURL(tlvBase64, {
      width: 280,
      margin: 2,
      color: {
        dark: '#022c22',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code error:', err));
  }, [genVendor, genVat, genTotal, genVatAmount, genPhase]);

  // Handle manual test bench parsing
  const handleRunAudit = () => {
    if (!inputBase64.trim()) return;
    const parsed = parseZatcaTLV(inputBase64.trim());
    const audit = auditZatcaCompliance(parsed.tags, parsed.isBase64Tlv);
    setTestResult({
      tags: parsed.tags,
      audit,
      isBase64Tlv: parsed.isBase64Tlv,
    });
  };

  const handleCopyGenerated = () => {
    navigator.clipboard.writeText(generatedBase64);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Banner & Overview */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              ZATCA Phase 2 (Fatoora) Digital Compliance
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              In the Kingdom of Saudi Arabia, the Zakat, Tax and Customs Authority (ZATCA) mandates electronic invoicing. Phase 2 (Integration Phase) introduces cryptographic validation to ensure invoices cannot be altered after generation.
            </p>
          </div>
        </div>

        {/* The 9 TLV Tags Comparison Grid */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-semibold text-slate-200">
            Official ZATCA Tag-Length-Value (TLV) QR Specification
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Phase 1 Requirements */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-amber-400">Phase 1: Generation Phase</span>
                <span className="text-[11px] text-slate-500 font-mono">Tags 1–5</span>
              </div>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-300 shrink-0 mt-0.5">1</span>
                  <span><strong>Seller Name:</strong> Registered legal or trading name (UTF-8).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-300 shrink-0 mt-0.5">2</span>
                  <span><strong>VAT ID:</strong> 15 digits, starting &amp; ending with 3 (e.g. 3xxxxxxxxxxxxx3).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-300 shrink-0 mt-0.5">3</span>
                  <span><strong>Timestamp:</strong> ISO 8601 invoice date and time (YYYY-MM-DDTHH:mm:ss).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-300 shrink-0 mt-0.5">4</span>
                  <span><strong>Total with VAT:</strong> Final payable invoice amount.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-300 shrink-0 mt-0.5">5</span>
                  <span><strong>Total VAT:</strong> Tax amount (Standard 15% KSA rate).</span>
                </li>
              </ul>
            </div>

            {/* Phase 2 Additional Cryptographic Seals */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-900/50 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-emerald-400">Phase 2: Integration Phase</span>
                <span className="text-[11px] text-emerald-400 font-mono">Tags 6–9 (Crypto)</span>
              </div>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-950 text-[10px] flex items-center justify-center text-emerald-400 border border-emerald-800 shrink-0 mt-0.5">6</span>
                  <span><strong>XML Invoice Hash:</strong> 32-byte SHA-256 digest of the standardized UBL 2.1 electronic document.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-950 text-[10px] flex items-center justify-center text-emerald-400 border border-emerald-800 shrink-0 mt-0.5">7</span>
                  <span><strong>Digital Signature:</strong> Elliptic Curve Digital Signature (ECDSA) generated by the certified cryptographic unit.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-950 text-[10px] flex items-center justify-center text-emerald-400 border border-emerald-800 shrink-0 mt-0.5">8</span>
                  <span><strong>Public Key:</strong> ECDSA public key for the Cryptographic Stamp Identifier (CSID).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-950 text-[10px] flex items-center justify-center text-emerald-400 border border-emerald-800 shrink-0 mt-0.5">9</span>
                  <span><strong>Stamp Signature:</strong> ZATCA issued certificate stamp signature for simplified invoices.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Phase 2 Test Generator & QR Tester */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCodeIcon className="w-5 h-5 text-emerald-400" />
            <h4 className="text-base font-bold text-white">Interactive ZATCA QR Code Generator</h4>
          </div>
          <span className="text-xs text-slate-400">Test scanning with your mobile device</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Generator Inputs */}
          <div className="space-y-3 text-xs">
            {/* Phase Selector */}
            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">Compliance Target</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGenPhase('phase_2')}
                  className={`p-2.5 rounded-xl border text-center transition font-semibold ${
                    genPhase === 'phase_2'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Phase 2 (With Crypto)
                </button>
                <button
                  onClick={() => setGenPhase('phase_1')}
                  className={`p-2.5 rounded-xl border text-center transition font-semibold ${
                    genPhase === 'phase_1'
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Phase 1 (Legacy)
                </button>
              </div>
            </div>

            {/* Vendor Name */}
            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">Seller / Vendor Name (Tag 1)</label>
              <input
                type="text"
                value={genVendor}
                onChange={(e) => setGenVendor(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* VAT Number */}
            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">
                15-Digit VAT ID (Tag 2 - Must start/end with 3)
              </label>
              <input
                type="text"
                value={genVat}
                onChange={(e) => setGenVat(e.target.value)}
                maxLength={15}
                className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Total and VAT */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Total (SAR)</label>
                <input
                  type="text"
                  value={genTotal}
                  onChange={(e) => handleTotalChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">VAT 15% (SAR)</label>
                <input
                  type="text"
                  value={genVatAmount}
                  onChange={(e) => setGenVatAmount(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Action to load this into scanner or history */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => onLoadGeneratedInvoice(generatedBase64)}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 transition active:scale-98 shadow-md shadow-emerald-950"
              >
                <Play className="w-4 h-4" />
                <span>Load Directly into Scanner</span>
              </button>
              <button
                onClick={handleCopyGenerated}
                className="px-4 h-11 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition"
                title="Copy Base64 Payload"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Generated QR Code Preview */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            {qrDataUrl ? (
              <div className="p-3 bg-white rounded-2xl shadow-xl">
                <img
                  src={qrDataUrl}
                  alt="ZATCA Compliant QR Code"
                  className="w-56 h-56 object-contain"
                />
              </div>
            ) : (
              <div className="w-56 h-56 rounded-2xl bg-slate-900 animate-pulse flex items-center justify-center text-slate-500">
                Generating QR...
              </div>
            )}

            <div className="text-center space-y-0.5">
              <div className="text-xs font-semibold text-slate-200">
                {genPhase === 'phase_2' ? 'ZATCA Phase 2 QR' : 'ZATCA Phase 1 QR'}
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Scan this with your mobile phone camera to verify real-time decoding
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Base64 TLV Test Bench & Decoder */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-indigo-400" />
            <h4 className="text-base font-bold text-white">Live Base64 TLV Decoder &amp; Auditor</h4>
          </div>
          <span className="text-xs text-slate-400">Verify arbitrary KSA invoice QR strings</span>
        </div>

        <div className="space-y-3">
          <textarea
            value={inputBase64}
            onChange={(e) => setInputBase64(e.target.value)}
            placeholder="Paste raw Base64 string from any Saudi invoice QR code here (e.g. AQxKYXJpciBCb29rc3RvcmU...)"
            rows={3}
            className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 resize-none"
          />

          <div className="flex justify-between items-center">
            <button
              onClick={() => setInputBase64(generatedBase64)}
              className="text-xs text-slate-400 hover:text-emerald-400 transition"
            >
              Paste Current Generated Code
            </button>

            <button
              onClick={handleRunAudit}
              disabled={!inputBase64.trim()}
              className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Decode &amp; Verify Compliance</span>
            </button>
          </div>
        </div>

        {/* Decoder Audit Results */}
        {testResult && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {testResult.audit.isFullyCompliant ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <div className="text-xs font-bold text-white">
                    {testResult.audit.phase === 'phase_2'
                      ? 'Phase 2 Fully Compliant'
                      : testResult.audit.phase === 'phase_1'
                      ? 'Phase 1 Generation Compliant'
                      : 'Non-Compliant Format'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Compliance Score: {testResult.audit.score}%
                  </div>
                </div>
              </div>

              <span className="text-[11px] font-mono text-emerald-400">
                {testResult.isBase64Tlv ? 'Standard Base64 TLV' : 'Non-Standard Payload'}
              </span>
            </div>

            {/* Decoded Tags Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Tag 1 (Seller Name):</span>
                <span className="font-semibold text-slate-200">{testResult.tags.tag1_sellerName || 'None'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Tag 2 (VAT Number):</span>
                <span className="font-mono text-slate-200">{testResult.tags.tag2_vatNumber || 'None'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Tag 4 (Total SAR):</span>
                <span className="font-semibold text-slate-200">{testResult.tags.tag4_totalWithVat || 'None'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Tag 5 (VAT Total SAR):</span>
                <span className="font-semibold text-emerald-400">{testResult.tags.tag5_vatTotal || 'None'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 sm:col-span-2">
                <span className="text-slate-400 block text-[11px]">Tag 6 (Phase 2 XML Hash SHA-256):</span>
                <span className="font-mono text-slate-300 break-all">{testResult.tags.tag6_xmlHash || 'Not present (Phase 1)'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
