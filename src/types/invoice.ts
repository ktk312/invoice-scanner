/**
 * ZATCA KSA E-Invoicing Data Models and Types
 * Supports Phase 1 (Generation Phase) and Phase 2 (Integration Phase) Fatoora requirements
 */

export interface ZatcaRawTags {
  tag1_sellerName?: string;
  tag2_vatNumber?: string;
  tag3_timestamp?: string;
  tag4_totalWithVat?: string;
  tag5_vatTotal?: string;
  tag6_xmlHash?: string; // Hex & Base64
  tag7_signature?: string; // ECDSA Digital Signature
  tag8_publicKey?: string; // ECDSA Public Key
  tag9_stampSignature?: string; // CSID / Stamp signature
  [key: number]: string | undefined;
}

export type ZatcaPhase = 'phase_1' | 'phase_2' | 'non_compliant';

export interface ComplianceCheck {
  id: string;
  title: string;
  description: string;
  status: 'passed' | 'warning' | 'failed';
  details?: string;
}

export interface ComplianceAudit {
  phase: ZatcaPhase;
  isFullyCompliant: boolean;
  score: number; // 0 - 100%
  checks: ComplianceCheck[];
  summaryMessage: string;
}

export type ExpenseCategory =
  | 'Meals & Dining'
  | 'Travel & Lodging'
  | 'Transportation & Fuel'
  | 'Office Supplies'
  | 'IT & Software'
  | 'Utilities & Telecom'
  | 'Client Entertainment'
  | 'Professional Services'
  | 'Maintenance'
  | 'Other';

export type SubmissionStatus = 'draft' | 'ready_for_review' | 'submitted_to_manager' | 'approved' | 'rejected' | 'reimbursed';

export interface InvoiceItem {
  id: string;
  // ZATCA Core Decoded Fields
  sellerName: string;
  sellerTrn: string; // 15-digit KSA Tax Registration Number (Tag 2)
  vatNumber: string; // KSA VAT Number (Tag 2)
  timestamp: string; // ISO 8601
  totalWithVat: number;
  vatTotal: number;
  subtotal: number; // totalWithVat - vatTotal
  calculatedVatRate: number; // usually 15.0% in KSA

  // Phase 2 Cryptographic Artifacts
  hasPhase2Crypto: boolean;
  xmlHash?: string;
  digitalSignature?: string;
  publicKey?: string;
  stampSignature?: string;

  // Raw TLV & Original QR string
  rawQrContent: string;
  isBase64Tlv: boolean;
  rawTags: ZatcaRawTags;
  complianceAudit: ComplianceAudit;

  // User Expense Management
  category: ExpenseCategory;
  notes: string;
  projectCode?: string;
  submissionStatus: SubmissionStatus;
  managerReference?: string;
  receiptImage?: string; // optional data URL capture

  // System Tracking
  createdAt: string; // scan timestamp
  updatedAt: string;
}

export interface ManagerSettings {
  managerName: string;
  managerEmail: string;
  companyName: string;
  employeeName: string;
  employeeId: string;
  department: string;
  currency: string; // SAR
}

export interface ReportFilter {
  searchQuery: string;
  category: string;
  phase: 'all' | 'phase_1' | 'phase_2' | 'flagged';
  dateRange: 'all' | 'today' | 'this_week' | 'this_month' | 'custom';
  startDate?: string;
  endDate?: string;
  submissionStatus: 'all' | SubmissionStatus;
}
