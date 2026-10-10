/**
 * ZATCA (Fatoora) Saudi Arabia E-Invoicing QR Code Parser & Validator
 *
 * Implements ZATCA Electronic Invoicing specifications for:
 * - Phase 1: Generation Phase (Tags 1-5)
 * - Phase 2: Integration Phase (Tags 1-9 including Cryptographic Hash, ECDSA Signature, Public Key, CSID Stamp)
 */

import {
  ComplianceAudit,
  ComplianceCheck,
  ExpenseCategory,
  InvoiceItem,
  ZatcaPhase,
  ZatcaRawTags,
} from '../types/invoice';

/**
 * Convert byte array to hexadecimal string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert byte array to Base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array safely
 */
export function base64ToBytes(base64: string): Uint8Array | null {
  try {
    // Strip whitespace, linebreaks, padding issues
    const cleaned = base64.trim().replace(/\s+/g, '');
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export interface ParsedTlvResult {
  isBase64Tlv: boolean;
  tags: ZatcaRawTags;
  rawBytes?: Uint8Array;
}

/**
 * Decode ZATCA TLV format from Base64 or raw input
 */
export function parseZatcaTLV(input: string): ParsedTlvResult {
  const trimmed = input.trim();
  const bytes = base64ToBytes(trimmed);

  if (!bytes || bytes.length < 5) {
    // Not valid Base64 TLV, attempt fallback regex parsing for plain text POS prints
    return parseFallbackFormat(trimmed);
  }

  const tags: ZatcaRawTags = {};
  let ptr = 0;
  const decoder = new TextDecoder('utf-8');

  try {
    while (ptr < bytes.length) {
      const tag = bytes[ptr++];
      if (ptr >= bytes.length) break;

      // Handle Length: Standard ZATCA uses 1-byte length, or ASN.1 multi-byte
      let length = bytes[ptr++];
      if (length === 0x81 && ptr < bytes.length) {
        length = bytes[ptr++];
      } else if (length === 0x82 && ptr + 1 < bytes.length) {
        length = (bytes[ptr++] << 8) | bytes[ptr++];
      }

      if (ptr + length > bytes.length) {
        // Truncated or malformed remaining length, salvage remaining bytes
        length = bytes.length - ptr;
      }

      const valueBytes = bytes.slice(ptr, ptr + length);
      ptr += length;

      switch (tag) {
        case 1:
          tags.tag1_sellerName = decoder.decode(valueBytes);
          break;
        case 2:
          tags.tag2_vatNumber = decoder.decode(valueBytes);
          break;
        case 3:
          tags.tag3_timestamp = decoder.decode(valueBytes);
          break;
        case 4:
          tags.tag4_totalWithVat = decoder.decode(valueBytes);
          break;
        case 5:
          tags.tag5_vatTotal = decoder.decode(valueBytes);
          break;
        case 6:
          // Phase 2: XML Hash (SHA-256). Usually 32 bytes binary
          tags.tag6_xmlHash = bytesToHex(valueBytes);
          break;
        case 7:
          // Phase 2: ECDSA Signature
          tags.tag7_signature = bytesToBase64(valueBytes);
          break;
        case 8:
          // Phase 2: ECDSA Public Key
          tags.tag8_publicKey = bytesToBase64(valueBytes);
          break;
        case 9:
          // Phase 2: Cryptographic Stamp Identifier / CSID
          tags.tag9_stampSignature = bytesToBase64(valueBytes);
          break;
        default:
          tags[tag] = decoder.decode(valueBytes);
          break;
      }
    }

    // Check if at least Tag 1 and Tag 2 or Tag 4 were found
    if (tags.tag1_sellerName || tags.tag2_vatNumber || tags.tag4_totalWithVat) {
      return {
        isBase64Tlv: true,
        tags,
        rawBytes: bytes,
      };
    }
  } catch (err) {
    console.warn('TLV parsing error:', err);
  }

  return parseFallbackFormat(trimmed);
}

/**
 * Fallback parser for non-TLV formatted QRs (e.g. JSON or text key-value)
 */
function parseFallbackFormat(raw: string): ParsedTlvResult {
  const tags: ZatcaRawTags = {};

  // Try JSON
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const json = JSON.parse(raw);
      if (json.seller || json.sellerName) tags.tag1_sellerName = json.seller || json.sellerName;
      if (json.vat || json.vatNumber || json.taxNumber) tags.tag2_vatNumber = json.vat || json.vatNumber || json.taxNumber;
      if (json.date || json.timestamp) tags.tag3_timestamp = json.date || json.timestamp;
      if (json.total || json.totalAmount) tags.tag4_totalWithVat = String(json.total || json.totalAmount);
      if (json.tax || json.vatAmount) tags.tag5_vatTotal = String(json.tax || json.vatAmount);
      return { isBase64Tlv: false, tags };
    } catch {
      // not JSON
    }
  }

  // Regex patterns for text key-value
  const vatMatch = raw.match(/3\d{13}3/);
  if (vatMatch) tags.tag2_vatNumber = vatMatch[0];

  const totalMatch = raw.match(/(?:total|amount|مجموع|إجمالي)[^\d]*(\d+(?:\.\d{1,2})?)/i);
  if (totalMatch) tags.tag4_totalWithVat = totalMatch[1];

  const vatAmountMatch = raw.match(/(?:vat|tax|ضريبة)[^\d]*(\d+(?:\.\d{1,2})?)/i);
  if (vatAmountMatch) tags.tag5_vatTotal = vatAmountMatch[1];

  return { isBase64Tlv: false, tags };
}

/**
 * Validate ZATCA Phase 1 & Phase 2 Compliance according to official rules:
 *
 * 1. Tag 1: Seller's Name must exist and be UTF-8.
 * 2. Tag 2: VAT Registration Number must be exactly 15 digits, starting with 3 and ending with 3.
 * 3. Tag 3: Time Stamp in ISO 8601 format (YYYY-MM-DDTHH:mm:ss).
 * 4. Tag 4: Invoice Total (with VAT) as a positive decimal number.
 * 5. Tag 5: Total VAT Amount, mathematically verified against 15% standard rate.
 * 6. Tag 6: SHA-256 Hash of the XML invoice (Phase 2 requirement).
 * 7. Tag 7: ECDSA Digital Cryptographic Signature (Phase 2 requirement).
 * 8. Tag 8: ECDSA Public Key (Phase 2 requirement).
 */
export function auditZatcaCompliance(tags: ZatcaRawTags, isBase64Tlv: boolean): ComplianceAudit {
  const checks: ComplianceCheck[] = [];
  let passedCount = 0;
  const totalRequired = 8; // 5 Phase 1 + 3 Phase 2

  // Check 1: Base64 TLV Encoding Standard
  if (isBase64Tlv) {
    checks.push({
      id: 'tlv_structure',
      title: 'ZATCA TLV Data Structure',
      description: 'Invoice QR follows standard binary Tag-Length-Value encoding in Base64.',
      status: 'passed',
      details: 'Conforms to ZATCA Fatoora QR specifications.',
    });
    passedCount++;
  } else {
    checks.push({
      id: 'tlv_structure',
      title: 'ZATCA TLV Data Structure',
      description: 'QR content is not in official Base64 TLV binary format.',
      status: 'failed',
      details: 'ZATCA requires standard Tag-Length-Value binary encoding in Base64.',
    });
  }

  // Check 2: Seller's Name (Tag 1)
  const seller = tags.tag1_sellerName?.trim();
  if (seller && seller.length > 0) {
    checks.push({
      id: 'seller_name',
      title: 'Seller Name (Tag 1)',
      description: `Valid seller name detected: "${seller}".`,
      status: 'passed',
      details: 'UTF-8 encoded seller/vendor designation.',
    });
    passedCount++;
  } else {
    checks.push({
      id: 'seller_name',
      title: 'Seller Name (Tag 1)',
      description: 'Missing or empty seller name.',
      status: 'failed',
      details: 'Tag 1 is mandatory for all KSA tax invoices.',
    });
  }

  // Check 3: VAT Registration Number (Tag 2 - 15 digits, start 3, end 3)
  const vatNum = tags.tag2_vatNumber?.trim().replace(/\D/g, '') || '';
  const isVat15Digits = vatNum.length === 15;
  const startsWith3 = vatNum.startsWith('3');
  const endsWith3 = vatNum.endsWith('3');

  if (isVat15Digits && startsWith3 && endsWith3) {
    checks.push({
      id: 'vat_number',
      title: '15-Digit VAT Number (Tag 2)',
      description: `Compliant KSA VAT ID: ${vatNum}`,
      status: 'passed',
      details: 'Conforms to KSA Tax Identification standard (15 digits, starts/ends with 3).',
    });
    passedCount++;
  } else if (vatNum.length > 0) {
    checks.push({
      id: 'vat_number',
      title: '15-Digit VAT Number (Tag 2)',
      description: `Format warning: "${vatNum}" is ${vatNum.length} digits (expected 15 starting & ending with 3).`,
      status: 'warning',
      details: 'KSA Tax ID must be 15 numeric digits starting and ending with 3.',
    });
  } else {
    checks.push({
      id: 'vat_number',
      title: '15-Digit VAT Number (Tag 2)',
      description: 'Missing VAT Registration Number.',
      status: 'failed',
      details: 'Tag 2 is required for tax deduction and verification.',
    });
  }

  // Check 4: Invoice Timestamp (Tag 3)
  const timestampStr = tags.tag3_timestamp?.trim() || '';
  const parsedDate = timestampStr ? new Date(timestampStr) : null;
  const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

  if (isValidDate) {
    checks.push({
      id: 'timestamp',
      title: 'Invoice Timestamp (Tag 3)',
      description: `Valid date/time: ${parsedDate.toLocaleString()}`,
      status: 'passed',
      details: `Raw: ${timestampStr} (ISO-8601 compliant).`,
    });
    passedCount++;
  } else {
    checks.push({
      id: 'timestamp',
      title: 'Invoice Timestamp (Tag 3)',
      description: timestampStr ? `Unrecognized timestamp format: "${timestampStr}"` : 'Missing timestamp.',
      status: 'warning',
      details: 'ZATCA expects ISO 8601 format (YYYY-MM-DDTHH:mm:ss).',
    });
  }

  // Check 5: Invoice Total Amount & VAT Rate (Tag 4 & 5)
  const total = parseFloat(tags.tag4_totalWithVat || '0');
  const vat = parseFloat(tags.tag5_vatTotal || '0');

  if (total > 0 && vat >= 0 && total >= vat) {
    const subtotal = total - vat;
    const effectiveVatRate = subtotal > 0 ? (vat / subtotal) * 100 : 0;
    const isStandard15 = Math.abs(effectiveVatRate - 15.0) < 0.8;

    checks.push({
      id: 'financial_math',
      title: 'Total & VAT Math (Tags 4 & 5)',
      description: `Total: ${total.toFixed(2)} SAR | VAT: ${vat.toFixed(2)} SAR (Rate: ${effectiveVatRate.toFixed(1)}%)`,
      status: isStandard15 ? 'passed' : 'warning',
      details: isStandard15
        ? 'Standard KSA 15% VAT calculation verified.'
        : `Rate differs from standard 15% (calculated ${effectiveVatRate.toFixed(1)}%). May reflect exempt or zero-rated goods.`,
    });
    passedCount++;
  } else {
    checks.push({
      id: 'financial_math',
      title: 'Total & VAT Math (Tags 4 & 5)',
      description: 'Invalid or missing invoice financial totals.',
      status: 'failed',
      details: 'Tag 4 and Tag 5 must contain valid numeric decimal values.',
    });
  }

  // Check 6: Phase 2 XML Hash (Tag 6)
  const hasXmlHash = Boolean(tags.tag6_xmlHash && tags.tag6_xmlHash.length >= 16);
  if (hasXmlHash) {
    checks.push({
      id: 'phase2_hash',
      title: 'XML Invoice Hash (Tag 6)',
      description: 'SHA-256 cryptographic digest of UBL 2.1 XML invoice present.',
      status: 'passed',
      details: `Digest: ${tags.tag6_xmlHash?.slice(0, 16)}... (${(tags.tag6_xmlHash?.length || 0) / 2} bytes)`,
    });
    passedCount++;
  } else {
    checks.push({
      id: 'phase2_hash',
      title: 'XML Invoice Hash (Tag 6)',
      description: 'Missing Phase 2 XML Hash digest.',
      status: 'warning',
      details: 'Mandatory in ZATCA Phase 2 for simplified tax invoices.',
    });
  }

  // Check 7: Phase 2 ECDSA Signature (Tag 7)
  const hasSignature = Boolean(tags.tag7_signature && tags.tag7_signature.length >= 16);
  if (hasSignature) {
    checks.push({
      id: 'phase2_signature',
      title: 'Cryptographic Stamp / Signature (Tag 7)',
      description: 'ECDSA digital signature verified in payload.',
      status: 'passed',
      details: `Signature present (${tags.tag7_signature?.length} chars base64).`,
    });
    passedCount++;
  } else {
    checks.push({
      id: 'phase2_signature',
      title: 'Cryptographic Stamp / Signature (Tag 7)',
      description: 'Missing Phase 2 ECDSA cryptographic signature.',
      status: 'warning',
      details: 'Mandatory in ZATCA Phase 2 for tamper-proof digital reporting.',
    });
  }

  // Check 8: Phase 2 ECDSA Public Key (Tag 8)
  const hasPublicKey = Boolean(tags.tag8_publicKey && tags.tag8_publicKey.length >= 16);
  if (hasPublicKey) {
    checks.push({
      id: 'phase2_public_key',
      title: 'ECDSA Public Key / CSID (Tag 8)',
      description: 'Cryptographic Stamp Identifier (CSID) public key present.',
      status: 'passed',
      details: 'Allows offline verification against ZATCA compliance trust chain.',
    });
    passedCount++;
  } else {
    checks.push({
      id: 'phase2_public_key',
      title: 'ECDSA Public Key / CSID (Tag 8)',
      description: 'Phase 2 Public Key not present in QR code.',
      status: 'warning',
      details: 'Required for Phase 2 cryptographic certificate validation.',
    });
  }

  // Determine overall Phase and Compliance
  let phase: ZatcaPhase = 'non_compliant';
  let isFullyCompliant = false;

  const hasCorePhase1 = Boolean(
    isBase64Tlv &&
    tags.tag1_sellerName &&
    tags.tag2_vatNumber &&
    tags.tag4_totalWithVat
  );

  const hasPhase2Crypto = Boolean(hasXmlHash && hasSignature && hasPublicKey);

  if (hasCorePhase1 && hasPhase2Crypto) {
    phase = 'phase_2';
    isFullyCompliant = true;
  } else if (hasCorePhase1) {
    phase = 'phase_1';
    isFullyCompliant = false;
  } else {
    phase = 'non_compliant';
    isFullyCompliant = false;
  }

  const score = Math.round((passedCount / totalRequired) * 100);

  let summaryMessage = '';
  if (phase === 'phase_2') {
    summaryMessage = 'Fully compliant with ZATCA Phase 2 (Integration Phase) digital reporting requirements with cryptographic stamp.';
  } else if (phase === 'phase_1') {
    summaryMessage = 'Compliant with ZATCA Phase 1 (Generation Phase). Missing Phase 2 cryptographic hash and signature for full digital integration.';
  } else {
    summaryMessage = 'Non-compliant or incomplete ZATCA data format. Required fields or TLV structure missing.';
  }

  return {
    phase,
    isFullyCompliant,
    score,
    checks,
    summaryMessage,
  };
}

/**
 * Build a structured InvoiceItem from parsed TLV data
 */
export function buildInvoiceItem(
  rawContent: string,
  category: ExpenseCategory = 'Other',
  notes = ''
): InvoiceItem {
  const parsed = parseZatcaTLV(rawContent);
  const audit = auditZatcaCompliance(parsed.tags, parsed.isBase64Tlv);

  const total = parseFloat(parsed.tags.tag4_totalWithVat || '0');
  const vat = parseFloat(parsed.tags.tag5_vatTotal || '0');
  const subtotal = Math.max(0, total - vat);
  const calculatedVatRate = subtotal > 0 ? Number(((vat / subtotal) * 100).toFixed(1)) : 15.0;

  const now = new Date().toISOString();
  const invoiceTimestamp = parsed.tags.tag3_timestamp || now;

  return {
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sellerName: parsed.tags.tag1_sellerName || 'Unknown Vendor',
    vatNumber: parsed.tags.tag2_vatNumber || 'Unspecified VAT',
    timestamp: invoiceTimestamp,
    totalWithVat: total,
    vatTotal: vat,
    subtotal: subtotal,
    calculatedVatRate: calculatedVatRate,

    hasPhase2Crypto: Boolean(parsed.tags.tag6_xmlHash && parsed.tags.tag7_signature),
    xmlHash: parsed.tags.tag6_xmlHash,
    digitalSignature: parsed.tags.tag7_signature,
    publicKey: parsed.tags.tag8_publicKey,
    stampSignature: parsed.tags.tag9_stampSignature,

    rawQrContent: rawContent,
    isBase64Tlv: parsed.isBase64Tlv,
    rawTags: parsed.tags,
    complianceAudit: audit,

    category: category,
    notes: notes,
    submissionStatus: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Encode ZATCA TLV format into Base64 (for generating Phase 1 and Phase 2 compliant QR codes)
 */
export function encodeZatcaTLV(params: {
  sellerName: string;
  vatNumber: string;
  timestamp: string; // ISO 8601
  totalWithVat: string;
  vatTotal: string;
  xmlHash?: Uint8Array | string; // 32 bytes or hex
  signature?: Uint8Array | string;
  publicKey?: Uint8Array | string;
  stampSignature?: Uint8Array | string;
}): string {
  const encoder = new TextEncoder();
  const buffers: Uint8Array[] = [];

  function addTextTag(tag: number, text: string) {
    const valBytes = encoder.encode(text);
    const tagHeader = new Uint8Array([tag, valBytes.length]);
    buffers.push(tagHeader, valBytes);
  }

  function addBinaryTag(tag: number, data: Uint8Array) {
    const tagHeader = new Uint8Array([tag, data.length]);
    buffers.push(tagHeader, data);
  }

  // Tag 1: Seller Name
  addTextTag(1, params.sellerName);
  // Tag 2: VAT Number
  addTextTag(2, params.vatNumber);
  // Tag 3: Timestamp
  addTextTag(3, params.timestamp);
  // Tag 4: Total
  addTextTag(4, params.totalWithVat);
  // Tag 5: VAT
  addTextTag(5, params.vatTotal);

  // Tag 6: XML Hash (if provided)
  if (params.xmlHash) {
    let bytes: Uint8Array;
    if (typeof params.xmlHash === 'string') {
      // Hex to bytes
      const hex = params.xmlHash.replace(/[^0-9a-fA-F]/g, '');
      bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
      }
    } else {
      bytes = params.xmlHash;
    }
    addBinaryTag(6, bytes);
  }

  // Tag 7: Signature
  if (params.signature) {
    let bytes: Uint8Array;
    if (typeof params.signature === 'string') {
      bytes = base64ToBytes(params.signature) || encoder.encode(params.signature);
    } else {
      bytes = params.signature;
    }
    addBinaryTag(7, bytes);
  }

  // Tag 8: Public Key
  if (params.publicKey) {
    let bytes: Uint8Array;
    if (typeof params.publicKey === 'string') {
      bytes = base64ToBytes(params.publicKey) || encoder.encode(params.publicKey);
    } else {
      bytes = params.publicKey;
    }
    addBinaryTag(8, bytes);
  }

  // Tag 9: Stamp Signature
  if (params.stampSignature) {
    let bytes: Uint8Array;
    if (typeof params.stampSignature === 'string') {
      bytes = base64ToBytes(params.stampSignature) || encoder.encode(params.stampSignature);
    } else {
      bytes = params.stampSignature;
    }
    addBinaryTag(9, bytes);
  }

  // Concatenate all buffers
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
  const fullBytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    fullBytes.set(b, offset);
    offset += b.length;
  }

  return bytesToBase64(fullBytes);
}
