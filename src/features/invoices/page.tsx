'use client';

import { useQuery } from '@tanstack/react-query';
import { invoiceService, type InvoiceDTO, type InvoiceListResponse } from '@/services/invoice.service';

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatAmount(a?: string) {
  if (!a) return '—';
  const n = parseFloat(a);
  if (isNaN(n)) return a;
  return n.toLocaleString('ru-RU') + ' ֏';
}

function getSupplierName(invoice: InvoiceDTO): string {
  if (typeof invoice.supplier === 'object') return invoice.supplier.name;
  return invoice.supplier_name ?? String(invoice.supplier);
}

export default function InvoicesPage() {
  const { data: raw, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn:  invoiceService.getAll,
    staleTime: 30_000,
  });

  const invoices: InvoiceDTO[] = Array.isArray(raw)
    ? raw
    : (raw as InvoiceListResponse)?.results ?? [];

  return (
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark">Паtqrer</h1>
            <p className="text-xs text-text-muted mt-0.5">
              {isLoading ? '...' : `${invoices.length} hiшatakar`}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">
            Bernvum e...
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-text-muted">
            <svg className="w-12 h-12 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm">Патqrer chkаn</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-crm-border shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid gap-4 px-4 py-2.5 bg-gray-50/80 border-b border-crm-border"
              style={{ gridTemplateColumns: '60px 1fr 130px 130px 110px 110px' }}>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">#</span>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Matyarartchi</span>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Amsat</span>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Verjnazhamket</span>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Khoskim</span>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Kakanutyun</span>
            </div>

            {invoices.map((inv, i) => (
              <div
                key={inv.id}
                className="grid gap-4 px-4 py-3.5 border-b border-crm-border last:border-0 hover:bg-primary/[0.02] transition-colors items-center"
                style={{ gridTemplateColumns: '60px 1fr 130px 130px 110px 110px' }}
              >
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md text-center">
                  #{inv.id}
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-dark truncate">{getSupplierName(inv)}</p>
                  {inv.invoice_number && (
                    <p className="text-xs text-text-muted">{inv.invoice_number}</p>
                  )}
                </div>

                <span className="text-sm text-dark">{formatDate(inv.issue_date)}</span>

                <span className={`text-sm font-medium ${
                  inv.due_date && new Date(inv.due_date) < new Date() ? 'text-error' : 'text-dark'
                }`}>
                  {formatDate(inv.due_date ?? undefined)}
                </span>

                <span className="text-sm font-bold text-dark">{formatAmount(inv.amount)}</span>

                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-center ${
                  inv.status === 'paid'    ? 'bg-success/10 text-success' :
                  inv.status === 'partial' ? 'bg-warning/10 text-warning' :
                  inv.status === 'unpaid'  ? 'bg-error/10 text-error'     :
                                             'bg-gray-100 text-gray-600'
                }`}>
                  {inv.status ?? '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
