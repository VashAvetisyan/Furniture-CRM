'use client';

import type { DashboardDTO } from '@/services/task.service';

function fmt(val?: string | number): number {
  if (typeof val === 'number') return val;
  const n = parseFloat((val ?? '0').replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : n;
}

export default function RevenueWidget({ dashboard }: { dashboard?: DashboardDTO }) {
  const revenue  = fmt(dashboard?.revenue_this_month  as string | number | undefined);
  const expenses = fmt(dashboard?.expenses_this_month as string | number | undefined);
  const balance  = fmt(dashboard?.balance_this_month  as string | number | undefined);

  const monthLabel = new Date().toLocaleString('hy-AM', { month: 'long', year: 'numeric' });

  const rows = [
    { label: 'Ընդհանուր',  value: revenue,  cls: 'text-dark font-bold text-base' },
    { label: 'Ծախսեր',    value: expenses, cls: 'text-error font-semibold text-sm' },
    { label: 'Սալդո',     value: balance,  cls: `${balance >= 0 ? 'text-success' : 'text-error'} font-semibold text-sm` },
  ];

  const pct = revenue > 0 ? Math.min(Math.round((balance / revenue) * 100), 100) : 0;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
        </div>
        <h2 className="text-base font-bold text-dark">Ամսի եկամուտ</h2>
      </div>
      <p className="text-[11px] text-text-muted mb-4 ml-10">{monthLabel}</p>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-text-muted">{row.label}</span>
            <span className={row.cls}>{row.value.toLocaleString()} ֏</span>
          </div>
        ))}
      </div>

      {revenue > 0 && (
        <div className="mt-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[11px] text-text-muted mt-1.5 text-right">{pct}% սալդո</p>
        </div>
      )}
    </div>
  );
}
