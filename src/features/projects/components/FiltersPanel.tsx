'use client';

import { useState } from 'react';
import { CloseIcon, CalendarIcon, ClockIcon, SearchIcon, ChevronDownIcon } from '@/components/icons';
import Avatar from '@/components/ui/Avatar';

const TASK_GROUPS = ['Design', 'Development', 'Testing', 'Marketing', 'Project Management'];

const REPORTERS = [
  { id: 'r1', name: 'Oscar Holloway',    color: '#F0A500', initials: 'OH' },
  { id: 'r2', name: 'Leonard Rodriguez', color: '#4ECDC4', initials: 'LR' },
  { id: 'r3', name: 'Owen Chambers',     color: '#96CEB4', initials: 'OC' },
  { id: 'r4', name: 'Gabriel Flowers',   color: '#FF6B9D', initials: 'GF' },
  { id: 'r5', name: 'Violet Robbins',    color: '#C39BD3', initials: 'VR' },
];

const INITIAL_ASSIGNEES = [
  { id: 'a1', name: 'Violet Robbins',  color: '#C39BD3', initials: 'VR' },
  { id: 'a2', name: 'Ronald Robbins',  color: '#45B7D1', initials: 'RR' },
  { id: 'a3', name: 'Birdie Garner',   color: '#82E0AA', initials: 'BG' },
  { id: 'a4', name: 'Marvin Cooper',   color: '#F7DC6F', initials: 'MC' },
];

const PRIORITIES = ['Low', 'Medium', 'High'];

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 cursor-pointer transition-colors ${
        checked ? 'bg-primary border-primary' : 'border-gray-300 bg-white'
      }`}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

interface FiltersPanelProps {
  onClose: () => void;
}

export default function FiltersPanel({ onClose }: FiltersPanelProps) {
  const [selectedGroups, setSelectedGroups]     = useState<string[]>(['Design']);
  const [selectedReporters, setSelectedReporters] = useState<string[]>(['r1']);
  const [assignees, setAssignees]               = useState(INITIAL_ASSIGNEES);
  const [priority, setPriority]                 = useState('Medium');
  const [showMore, setShowMore]                 = useState(false);

  const activeCount =
    (selectedGroups.length > 0 ? 1 : 0) +
    (selectedReporters.length > 0 ? 1 : 0) +
    (assignees.length > 0 ? 1 : 0);

  function toggleGroup(g: string) {
    setSelectedGroups((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  }

  function toggleReporter(id: string) {
    setSelectedReporters((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function removeAssignee(id: string) {
    setAssignees((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/5" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[340px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-crm-border flex-shrink-0">
          <h2 className="text-xl font-bold text-dark">Filters</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* Period */}
          <div className="px-6 py-5 border-b border-crm-border">
            <p className="text-sm font-semibold text-dark mb-3">Period</p>
            <div className="relative">
              <input
                type="text"
                placeholder="Select Period"
                className="w-full border border-crm-border rounded-xl px-4 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-primary pr-10"
              />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>

          {/* Task Group */}
          <div className="px-6 py-5 border-b border-crm-border">
            <p className="text-sm font-semibold text-dark mb-3">Task Group</p>
            <div className="space-y-3">
              {TASK_GROUPS.map((group) => (
                <label key={group} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={selectedGroups.includes(group)}
                    onChange={() => toggleGroup(group)}
                  />
                  <span className="text-sm text-dark">{group}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reporter */}
          <div className="px-6 py-5 border-b border-crm-border">
            <p className="text-sm font-semibold text-dark mb-3">Reporter</p>
            <div className="space-y-3">
              {REPORTERS.map((r) => (
                <label key={r.id} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={selectedReporters.includes(r.id)}
                    onChange={() => toggleReporter(r.id)}
                  />
                  <Avatar color={r.color} initials={r.initials} size="sm" />
                  <span className="text-sm text-dark">{r.name}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex items-center gap-1 mt-3.5 text-sm text-primary font-medium hover:text-primary-hover transition-colors"
            >
              Տեսնել ավելին
              <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Assignees */}
          <div className="px-6 py-5 border-b border-crm-border">
            <p className="text-sm font-semibold text-dark mb-3">Կատարողներ</p>
            <div className="relative mb-3">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Փնտրել..."
                className="w-full border border-crm-border rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {assignees.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-1.5 bg-gray-50 border border-crm-border rounded-xl px-2.5 py-1.5"
                >
                  <Avatar color={a.color} initials={a.initials} size="sm" />
                  <span className="text-xs font-medium text-dark">{a.name}</span>
                  <button
                    onClick={() => removeAssignee(a.id)}
                    className="ml-0.5 text-text-muted hover:text-dark transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Estimate */}
          <div className="px-6 py-5 border-b border-crm-border">
            <p className="text-sm font-semibold text-dark mb-3">Estimate</p>
            <div className="relative">
              <input
                type="text"
                placeholder="Select duration"
                className="w-full border border-crm-border rounded-xl px-4 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-primary pr-10"
              />
              <ClockIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>

          {/* Priority */}
          <div className="px-6 py-5">
            <p className="text-sm font-semibold text-dark mb-3">Priority</p>
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-crm-border rounded-xl px-4 py-2.5 text-sm text-dark appearance-none focus:outline-none focus:border-primary bg-white cursor-pointer"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-crm-border flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-primary">i</span>
            </div>
            <span className="text-sm text-text-muted">10 matches found</span>
          </div>
          <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap">
            Save Filters ({activeCount})
          </button>
        </div>
      </div>
    </>
  );
}
