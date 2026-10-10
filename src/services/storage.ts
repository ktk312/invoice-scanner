/**
 * Persistent Storage Service for ZATCA Invoices and Manager Settings
 * Uses localStorage with automatic initialization and JSON export/backup
 */

import { InvoiceItem, ManagerSettings } from '../types/invoice';
import { getInitialSampleInvoices } from '../utils/sampleData';

const INVOICES_STORAGE_KEY = 'zatca_invoices_v1';
const SETTINGS_STORAGE_KEY = 'zatca_manager_settings_v1';

export const DEFAULT_MANAGER_SETTINGS: ManagerSettings = {
  managerName: 'Finance Manager',
  managerEmail: 'finance@company.sa',
  companyName: 'Acme Saudi Arabia Ltd.',
  employeeName: 'Ahmed Al-Ghamdi',
  employeeId: 'EMP-4029',
  department: 'Operations & Procurement',
  currency: 'SAR',
};

export function loadInvoices(): InvoiceItem[] {
  try {
    const raw = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (!raw) {
      // First run: preload realistic initial sample KSA invoices
      const samples = getInitialSampleInvoices();
      saveAllInvoices(samples);
      return samples;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Error loading invoices from storage:', err);
    return getInitialSampleInvoices();
  }
}

export function saveAllInvoices(invoices: InvoiceItem[]): void {
  try {
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
  } catch (err) {
    console.error('Failed to save invoices to localStorage:', err);
  }
}

export function saveSingleInvoice(invoice: InvoiceItem): InvoiceItem[] {
  const current = loadInvoices();
  // Prepend new invoice to top of history
  const updated = [invoice, ...current.filter((item) => item.id !== invoice.id)];
  saveAllInvoices(updated);
  return updated;
}

export function updateSingleInvoice(invoice: InvoiceItem): InvoiceItem[] {
  const current = loadInvoices();
  const updated = current.map((item) => (item.id === invoice.id ? invoice : item));
  saveAllInvoices(updated);
  return updated;
}

export function deleteSingleInvoice(id: string): InvoiceItem[] {
  const current = loadInvoices();
  const updated = current.filter((item) => item.id !== id);
  saveAllInvoices(updated);
  return updated;
}

export function deleteMultipleInvoices(ids: string[]): InvoiceItem[] {
  const idSet = new Set(ids);
  const current = loadInvoices();
  const updated = current.filter((item) => !idSet.has(item.id));
  saveAllInvoices(updated);
  return updated;
}

export function loadManagerSettings(): ManagerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_MANAGER_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  return DEFAULT_MANAGER_SETTINGS;
}

export function saveManagerSettings(settings: ManagerSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function exportBackupJson(invoices: InvoiceItem[]): void {
  const data = {
    app: 'ZATCA KSA E-Invoice Scanner',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    invoices,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ZATCA_Backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
