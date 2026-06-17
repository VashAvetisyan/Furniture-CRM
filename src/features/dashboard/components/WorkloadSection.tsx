import Avatar from '@/components/ui/Avatar';
import SectionHeader from '@/components/ui/SectionHeader';
import { employees } from '../data';
import type { Level } from '../types';

const levelStyles: Record<Level, string> = {
  Senior: 'border-blue-200 text-blue-600 bg-blue-50',
  Middle: 'border-gray-200 text-gray-600 bg-gray-50',
  Junior: 'border-green-200 text-green-600 bg-green-50',
};

export default function WorkloadSection() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <SectionHeader title="Աշխատաբեռ" href="/employees" />

      <div className="grid grid-cols-4 gap-4">
        {employees.map((emp) => (
          <div key={emp.name} className="flex flex-col items-center text-center gap-2">
            <Avatar
              color={emp.color}
              initials={emp.initials}
              size="lg"
              showOnlineIndicator
            />
            <div>
              <p className="text-xs font-semibold text-dark leading-tight">{emp.name}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{emp.role}</p>
              <span className={`inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded border ${levelStyles[emp.level]}`}>
                {emp.level}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
