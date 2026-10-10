/**
 * Sample realistic KSA ZATCA Invoices for testing and demonstration
 * Includes both Phase 1 (Legacy Generation Phase) and Phase 2 (Fatoora Integration Phase with Cryptographic Stamps)
 */

import { InvoiceItem } from '../types/invoice';
import { buildInvoiceItem, encodeZatcaTLV } from './zatcaParser';

// Realistic 32-byte SHA-256 hex hashes and simulated ECDSA signatures for Phase 2
const sampleHash1 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const sampleHash2 = '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069';
const sampleHash3 = '15e2b0d3c33891ebb0f1ef609ec419420c20e320ce94c65fbc8c3312448eb225';
const sampleHash4 = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

const sampleSig1 = 'MEQCIAjY9R2xL0Wj8m3b4K+V8v7Z01y3Y1k9X7w8v9u0t1s2AiA3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3';
const sampleSig2 = 'MEQCID5rK9sL0Wj8m3b4K+V8v7Z01y3Y1k9X7w8v9u0t1s2AiB3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c4';
const sampleSig3 = 'MEUCIQD7aK8tL0Wj8m3b4K+V8v7Z01y3Y1k9X7w8v9u0t1s2AiEA4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c5';

const samplePubKey = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7Z5f8u8n3p2q1r0s9t8u7v6w5x4y3z2a1b0c9d8e7f6a5b4c3d2e1f0a';

// 1. Jarir Bookstore - Phase 2 Fully Compliant
const jarirTlv = encodeZatcaTLV({
  sellerName: 'Jarir Bookstore - مكتبة جرير',
  vatNumber: '300056123400003',
  timestamp: '2026-10-08T14:32:10Z',
  totalWithVat: '845.25',
  vatTotal: '110.25',
  xmlHash: sampleHash1,
  signature: sampleSig1,
  publicKey: samplePubKey,
});

// 2. STC Telecom - Phase 2 Fully Compliant
const stcTlv = encodeZatcaTLV({
  sellerName: 'Saudi Telecom Company - شركة الاتصالات السعودية (STC)',
  vatNumber: '310158321000003',
  timestamp: '2026-10-05T09:15:42Z',
  totalWithVat: '460.00',
  vatTotal: '60.00',
  xmlHash: sampleHash2,
  signature: sampleSig2,
  publicKey: samplePubKey,
});

// 3. Al Baik Restaurant - Phase 2 Fully Compliant
const albaikTlv = encodeZatcaTLV({
  sellerName: 'ALBAIK Food Systems Co. - شركة البيك للأنظمة الغذائية',
  vatNumber: '300189234500003',
  timestamp: '2026-10-09T13:45:18Z',
  totalWithVat: '115.00',
  vatTotal: '15.00',
  xmlHash: sampleHash3,
  signature: sampleSig3,
  publicKey: samplePubKey,
});

// 4. Saudi Aramco Fuel - Phase 1 Compliant (Legacy Generation Phase, no crypto tags)
const aramcoTlv = encodeZatcaTLV({
  sellerName: 'Saudi Aramco Retail Station - محطة أرامكو للوقود',
  vatNumber: '300012345600003',
  timestamp: '2026-10-07T18:22:05Z',
  totalWithVat: '185.50',
  vatTotal: '24.20',
});

// 5. Panda Retail - Phase 2 Fully Compliant
const pandaTlv = encodeZatcaTLV({
  sellerName: 'Panda Retail Company - شركة أسواق بنده',
  vatNumber: '300088991200003',
  timestamp: '2026-10-04T16:10:30Z',
  totalWithVat: '322.00',
  vatTotal: '42.00',
  xmlHash: sampleHash4,
  signature: sampleSig1,
  publicKey: samplePubKey,
});

export function getInitialSampleInvoices(): InvoiceItem[] {
  const item1 = buildInvoiceItem(jarirTlv, 'Office Supplies', 'Ergonomic monitors and printer paper for Riyadh regional office.');
  item1.projectCode = 'PRJ-RYD-2026';
  item1.submissionStatus = 'ready_for_review';

  const item2 = buildInvoiceItem(stcTlv, 'Utilities & Telecom', 'Corporate 5G business broadband and backup eSIM.');
  item2.projectCode = 'OPS-INFRA';
  item2.submissionStatus = 'ready_for_review';

  const item3 = buildInvoiceItem(albaikTlv, 'Meals & Dining', 'Working team lunch during system deployment sprint.');
  item3.projectCode = 'SPRINT-DEV';
  item3.submissionStatus = 'submitted_to_manager';

  const item4 = buildInvoiceItem(aramcoTlv, 'Transportation & Fuel', 'Field site visit fuel expenses (King Fahd Road branch).');
  item4.projectCode = 'SITE-VISIT';
  item4.submissionStatus = 'draft';

  const item5 = buildInvoiceItem(pandaTlv, 'Meals & Dining', 'Breakroom snacks and pantry supplies for client workshop.');
  item5.projectCode = 'OFFICE-PANTRY';
  item5.submissionStatus = 'approved';

  return [item1, item2, item3, item4, item5];
}

export const SAMPLE_QR_CODES = [
  {
    name: 'Jarir Bookstore (Phase 2)',
    category: 'Office Supplies' as const,
    total: '845.25 SAR',
    base64: jarirTlv,
    phase: 'Phase 2 Compliant',
  },
  {
    name: 'STC Telecom (Phase 2)',
    category: 'Utilities & Telecom' as const,
    total: '460.00 SAR',
    base64: stcTlv,
    phase: 'Phase 2 Compliant',
  },
  {
    name: 'Al Baik (Phase 2)',
    category: 'Meals & Dining' as const,
    total: '115.00 SAR',
    base64: albaikTlv,
    phase: 'Phase 2 Compliant',
  },
  {
    name: 'Aramco Fuel (Phase 1)',
    category: 'Transportation & Fuel' as const,
    total: '185.50 SAR',
    base64: aramcoTlv,
    phase: 'Phase 1 Legacy',
  },
];
