'use client';

import { useState } from 'react';
import { CloseIcon, CalendarIcon, ClockIcon } from '@/components/icons';
import type { Task } from '../types';

function parseHoursFromString(s: string): number {
  let hours = 0;
  const w = s.match(/(\d+)w/);
  const d = s.match(/(\d+)d/);
  const h = s.match(/(\d+)h/);
  const m = s.match(/(\d+)m/);
  if (w) hours += parseInt(w[1]) * 5 * 8;
  if (d) hours += parseInt(d[1]) * 8;
  if (h) hours += parseInt(h[1]);
  if (m) hours += parseInt(m[1]) / 60;
  return hours;
}

function IllustrationHeader({ logged, estimate }: { logged: string; estimate: string }) {
  const loggedH = parseHoursFromString(logged);
  const estimateH = parseHoursFromString(estimate);
  const pct = estimateH > 0 ? Math.min(loggedH / estimateH, 1) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-t-2xl px-8 py-8 overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute top-4 left-8 w-10 h-10 bg-primary/10 rounded-xl rotate-12 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      </div>
      <div className="absolute top-6 right-20 w-9 h-9 bg-warning/15 rounded-full flex items-center justify-center">
        <ClockIcon className="w-4 h-4 text-warning" />
      </div>
      <div className="absolute bottom-4 left-20 w-8 h-8 bg-success/15 rounded-lg rotate-6 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-success" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </div>
      <div className="absolute top-3 right-6 w-8 h-8 bg-error/10 rounded-full flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-error/70" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
        </svg>
      </div>
      <div className="absolute bottom-3 right-8 w-6 h-14 bg-success/20 rounded-full" />
      <div className="absolute bottom-0 right-16 w-4 h-10 bg-primary/10 rounded-full" />

      {/* Progress circle + text */}
      <div className="flex items-center gap-5 relative z-10">
        <svg viewBox="0 0 76 76" className="w-20 h-20 flex-shrink-0">
          <circle cx="38" cy="38" r={r} fill="none" stroke="#E8EDF5" strokeWidth="5" />
          <circle
            cx="38" cy="38" r={r}
            fill="none"
            stroke="#4361EE"
            strokeWidth="5"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 38 38)"
          />
        </svg>
        <div>
          <p className="text-base font-bold text-dark">{logged} logged</p>
          <p className="text-sm text-text-muted">Original Estimate {estimate}</p>
        </div>
      </div>
    </div>
  );
}

interface TimeTrackingModalProps {
  task: Task | null;
  onClose: () => void;
}

export default function TimeTrackingModal({ task, onClose }: TimeTrackingModalProps) {
  const logged = task?.loggedTime ?? '0h';
  const estimate = task?.originalEstimate ?? task?.estimate ?? '0h';

  const [timeSpent, setTimeSpent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Illustration header */}
        <div className="relative">
          <IllustrationHeader logged={logged} estimate={estimate} />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors shadow-sm"
          >
            <CloseIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-dark mb-5">Time Tracking</h2>

          {/* Time spent */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5 block">
              Time spent
            </label>
            <input
              type="text"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              placeholder="e.g. 1w 4d 6h 40m"
              className="w-full px-4 py-3 rounded-xl border border-crm-border text-sm text-dark placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5 block">
                Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Dec 20, 2020"
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-crm-border text-sm text-dark placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5 block">
                Time
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="2:00 PM"
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-crm-border text-sm text-dark placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                />
                <ClockIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Work Description */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5 block">
              Work Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some description of the task"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-crm-border text-sm text-dark placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Save button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors"
          >
            Save Task
          </button>
        </div>
      </div>
    </div>
  );
}
