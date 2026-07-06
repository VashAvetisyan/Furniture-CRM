// Reusable skeleton primitives — all use animate-pulse

const base = 'bg-gray-200 rounded-lg animate-pulse';

export function SkBlock({ className = '' }: { className?: string }) {
  return <div className={`${base} ${className}`} />;
}

// Stat card skeleton (dashboard KPI)
export function SkStatCard() {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm border border-crm-border flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-6 w-12 bg-gray-200 animate-pulse rounded-lg" />
        <div className="h-3 w-24 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    </div>
  );
}

// Table row skeleton
export function SkTableRow({ cols = 4 }: { cols?: number }) {
  const widths = ['w-16', 'w-32', 'w-24', 'w-20', 'w-28', 'w-16'];
  return (
    <tr className="border-b border-crm-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-4 ${widths[i % widths.length]} bg-gray-200 animate-pulse rounded-lg`} />
        </td>
      ))}
    </tr>
  );
}

// Full table skeleton
export function SkTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkTableRow key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  );
}

// List row skeleton (deadlines, calls)
export function SkListRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-crm-border last:border-0">
      <div className="w-8 h-8 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 bg-gray-200 animate-pulse rounded-lg" />
        <div className="h-3 w-1/2 bg-gray-200 animate-pulse rounded-lg" />
      </div>
      <div className="h-5 w-14 bg-gray-200 animate-pulse rounded-full" />
    </div>
  );
}

// Employee card skeleton
export function SkEmployeeCard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-crm-border space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-28 bg-gray-200 animate-pulse rounded-lg" />
          <div className="h-3 w-20 bg-gray-200 animate-pulse rounded-lg" />
        </div>
      </div>
      <div className="h-3 w-full bg-gray-200 animate-pulse rounded-lg" />
      <div className="h-3 w-2/3 bg-gray-200 animate-pulse rounded-lg" />
    </div>
  );
}

// Employee list row skeleton
export function SkEmployeeRow() {
  return (
    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-crm-border flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-36 bg-gray-200 animate-pulse rounded-lg" />
        <div className="h-3 w-24 bg-gray-200 animate-pulse rounded-lg" />
      </div>
      <div className="h-6 w-20 bg-gray-200 animate-pulse rounded-full" />
    </div>
  );
}

// Board column skeleton (tasks kanban)
export function SkBoardColumn() {
  return (
    <div className="flex-shrink-0 w-64 flex flex-col gap-2">
      <div className="h-8 w-full bg-gray-200 animate-pulse rounded-xl mb-1" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-crm-border space-y-2">
          <div className="h-4 w-4/5 bg-gray-200 animate-pulse rounded-lg" />
          <div className="h-3 w-3/5 bg-gray-200 animate-pulse rounded-lg" />
          <div className="flex gap-2 mt-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-5 w-16 bg-gray-200 animate-pulse rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Generic page card skeleton (single white card with rows)
export function SkPageCard({ rows = 5, header = true }: { rows?: number; header?: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-crm-border overflow-hidden">
      {header && (
        <div className="px-4 py-3 border-b border-crm-border flex items-center justify-between">
          <div className="h-5 w-32 bg-gray-200 animate-pulse rounded-lg" />
          <div className="h-8 w-24 bg-gray-200 animate-pulse rounded-xl" />
        </div>
      )}
      <div className="px-4 py-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-crm-border last:border-0">
            <div className="h-4 w-1/4 bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-4 w-1/3 bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-4 w-1/5 bg-gray-200 animate-pulse rounded-lg ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
