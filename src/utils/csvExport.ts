/**
 * Clean & Stripped CSV Generator for Management Reporting
 * Specifically outputs the requested stripped columns:
 * 1. Supplier Name
 * 2. Seller TRN (Tax Registration Number)
 * 3. Invoice Date Time
 * 4. Price (Excl. VAT)
 * 5. VAT (15% Tax)
 * 6. Total (Incl. VAT)
 */

import { InvoiceItem, ManagerSettings } from '../types/invoice';
import { normalizeZatcaTrn } from './zatcaParser';

/**
 * Escape CSV fields according to RFC 4180
 */
function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Format 15-digit Seller TRN for CSV
 * When excelSafe is true: uses ="300056123400003" so Microsoft Excel displays full 15 digits as text instead of 3.0E+14
 */
export function formatTrnForCsv(trn: string | undefined | null, excelSafe = true): string {
  const clean = normalizeZatcaTrn(trn) || trn?.trim() || '';
  if (excelSafe && /^\d{10,}$/.test(clean)) {
    return `="${clean}"`;
  }
  return escapeCsvCell(clean);
}

export type CsvExportFormat = 'stripped_manager' | 'full_audit';

/**
 * Generate CSV string with UTF-8 Byte Order Mark (BOM) for perfect Arabic text in Excel
 * Default format: stripped down 6 columns requested by the user
 */
export function generateInvoiceCsv(
  invoices: InvoiceItem[],
  settings?: Partial<ManagerSettings>,
  format: CsvExportFormat = 'stripped_manager',
  excelSafeTrn = true
): string {
  const lines: string[] = [];

  if (format === 'stripped_manager') {
    // Exactly the 6 stripped-down columns requested:
    // Supplier Name, Seller TRN, Invoice Date Time, Price, VAT, Total
    const headers = [
      'Supplier Name',
      'Seller TRN',
      'Invoice Date Time',
      'Price',
      'VAT',
      'Total',
    ];
    lines.push(headers.map(escapeCsvCell).join(','));

    // Data rows
    invoices.forEach((inv) => {
      const formattedDate = inv.timestamp
        ? new Date(inv.timestamp).toLocaleString('en-GB')
        : 'N/A';

      const row = [
        escapeCsvCell(inv.sellerName),
        formatTrnForCsv(inv.vatNumber, excelSafeTrn),
        escapeCsvCell(formattedDate),
        escapeCsvCell(inv.subtotal.toFixed(2)),
        escapeCsvCell(inv.vatTotal.toFixed(2)),
        escapeCsvCell(inv.totalWithVat.toFixed(2)),
      ];
      lines.push(row.join(','));
    });

    // Summary total row at the bottom
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalWithVat, 0);
    const totalVat = invoices.reduce((sum, inv) => sum + inv.vatTotal, 0);
    const totalSubtotal = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);

    const summaryRow = [
      escapeCsvCell('TOTAL'),
      escapeCsvCell(''),
      escapeCsvCell(`${invoices.length} Invoices`),
      escapeCsvCell(totalSubtotal.toFixed(2)),
      escapeCsvCell(totalVat.toFixed(2)),
      escapeCsvCell(totalAmount.toFixed(2)),
    ];
    lines.push(summaryRow.join(','));

    return lines.join('\r\n');
  }

  // Fallback: Full detailed audit format
  const employee = settings?.employeeName || 'Staff Member';
  const company = settings?.companyName || 'Organization';

  lines.push(`${escapeCsvCell('ZATCA KSA E-INVOICE AUDIT REPORT')},${escapeCsvCell('')},${escapeCsvCell('')}`);
  lines.push(`${escapeCsvCell('Company')},${escapeCsvCell(company)},${escapeCsvCell('Date')},${escapeCsvCell(new Date().toLocaleDateString('en-GB'))}`);
  lines.push(`${escapeCsvCell('Employee')},${escapeCsvCell(employee)}`);
  lines.push('');

  const fullHeaders = [
    'Line #',
    'Supplier Name',
    'Seller TRN',
    'Invoice Date Time',
    'Category',
    'Price (Excl. VAT)',
    'VAT Amount',
    'Total (Incl. VAT)',
    'ZATCA Phase',
    'XML Hash Digest (Tag 6)',
    'Notes / Purpose',
  ];
  lines.push(fullHeaders.map(escapeCsvCell).join(','));

  invoices.forEach((inv, idx) => {
    const formattedDate = inv.timestamp ? new Date(inv.timestamp).toLocaleString('en-GB') : 'N/A';
    const row = [
      idx + 1,
      inv.sellerName,
      inv.vatNumber,
      formattedDate,
      inv.category,
      inv.subtotal.toFixed(2),
      inv.vatTotal.toFixed(2),
      inv.totalWithVat.toFixed(2),
      inv.complianceAudit.phase === 'phase_2' ? 'Phase 2' : 'Phase 1',
      inv.xmlHash ? `${inv.xmlHash.slice(0, 16)}...` : 'N/A',
      inv.notes || '',
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  });

  return lines.join('\r\n');
}

/**
 * Trigger download of generated CSV file with UTF-8 BOM
 */
export function downloadInvoiceCsv(
  invoices: InvoiceItem[],
  settings?: Partial<ManagerSettings>,
  format: CsvExportFormat = 'stripped_manager',
  excelSafeTrn = true,
  customFilename?: string
): void {
  const csvContent = generateInvoiceCsv(invoices, settings, format, excelSafeTrn);
  // Add UTF-8 BOM: \uFEFF so Excel renders Arabic characters accurately
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = customFilename || `Manager_Invoice_Report_${dateStr}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate formatted executive summary text for Email / Slack / WhatsApp to manager
 */
export function generateManagerSummaryText(
  invoices: InvoiceItem[],
  settings?: Partial<ManagerSettings>
): { subject: string; bodyText: string; mailtoUrl: string } {
  const employee = settings?.employeeName || 'Staff Member';
  const manager = settings?.managerName || 'Manager';
  const managerEmail = settings?.managerEmail || '';

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalWithVat, 0);
  const totalVat = invoices.reduce((sum, inv) => sum + inv.vatTotal, 0);
  const totalSubtotal = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);

  const subject = `[Expense Report] ${employee} - ${invoices.length} Invoices (${totalAmount.toFixed(2)} SAR)`;

  const invoiceItemList = invoices
    .slice(0, 15)
    .map((inv, i) => {
      const d = inv.timestamp ? new Date(inv.timestamp).toLocaleDateString('en-GB') : '';
      return `${i + 1}. ${inv.sellerName} | TRN: ${inv.vatNumber} | ${d} | Price: ${inv.subtotal.toFixed(2)} | VAT: ${inv.vatTotal.toFixed(2)} | Total: ${inv.totalWithVat.toFixed(2)} SAR`;
    })
    .join('\n');

  const extraCount = invoices.length > 15 ? `\n... and ${invoices.length - 15} more invoices in attached CSV.` : '';

  const bodyText = `Dear ${manager},

Please find attached my expense invoice report with all scanned KSA ZATCA tax invoices.

FINANCIAL SUMMARY (SAR):
---------------------------------------------
Total Invoices:      ${invoices.length}
Price (Excl. VAT):   ${totalSubtotal.toFixed(2)} SAR
VAT (15% Reclaim):   ${totalVat.toFixed(2)} SAR
TOTAL PAYABLE:       ${totalAmount.toFixed(2)} SAR

ITEMIZED INVOICES:
---------------------------------------------
${invoiceItemList}${extraCount}

The full CSV sheet containing Supplier Name, Seller TRN, Invoice Date Time, Price, VAT, and Total is generated and ready for accounting import.

Best regards,
${employee}`;

  const mailtoUrl = `mailto:${encodeURIComponent(managerEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(bodyText)}`;

  return { subject, bodyText, mailtoUrl };
}
