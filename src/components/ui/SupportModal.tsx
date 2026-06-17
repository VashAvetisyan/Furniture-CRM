'use client';

import { useState } from 'react';
import { CloseIcon, ChevronDownIcon } from '@/components/icons';

interface SupportModalProps {
  onClose: () => void;
}

const SUBJECTS = [
  'Technical difficulties',
  'Billing question',
  'Feature request',
  'Account issue',
  'Other',
];

function ModalIllustration() {
  return (
    <svg width="100%" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="280" height="145" rx="16" fill="#EEF2FF" />

      <circle cx="260" cy="40" r="22" fill="#93A8F4" opacity="0.3" />
      <circle cx="55"  cy="55" r="14" fill="#93A8F4" opacity="0.3" />
      <circle cx="285" cy="110" r="10" fill="#93A8F4" opacity="0.2" />

      <rect x="32" y="100" width="8" height="58" rx="4" fill="#4361EE" opacity="0.5" />
      <ellipse cx="36" cy="94" rx="16" ry="22" fill="#4361EE" opacity="0.35" />
      <ellipse cx="26" cy="112" rx="11" ry="17" fill="#5B7CF5" opacity="0.3" />

      <rect x="280" y="108" width="8" height="50" rx="4" fill="#4361EE" opacity="0.5" />
      <ellipse cx="284" cy="102" rx="15" ry="20" fill="#4361EE" opacity="0.35" />
      <ellipse cx="294" cy="118" rx="10" ry="16" fill="#5B7CF5" opacity="0.3" />

      <rect x="100" y="118" width="120" height="38" rx="6" fill="#FFD166" />
      <rect x="103" y="121" width="114" height="32" rx="4" fill="#2D3748" />
      <rect x="88"  y="155" width="144" height="8"  rx="4" fill="#E8B94F" />

      <path d="M122 118 Q122 96 160 96 Q198 96 198 118Z" fill="white" />
      <circle cx="160" cy="66" r="26" fill="#FBBF8C" />
      <path d="M134 66 Q134 34 160 34 Q186 34 186 66 Q186 46 160 40 Q134 46 134 66Z" fill="#1E2028" />
      <path d="M134 62 Q131 78 136 90 L130 93 Q122 78 134 56Z" fill="#1E2028" />

      <ellipse cx="147" cy="72" rx="5" ry="4" fill="#F09060" opacity="0.45" />
      <ellipse cx="173" cy="72" rx="5" ry="4" fill="#F09060" opacity="0.45" />

      <path d="M122 115 L103 122" stroke="#FBBF8C" strokeWidth="12" strokeLinecap="round" />
      <path d="M198 115 L217 122" stroke="#FBBF8C" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}

export default function SupportModal({ onClose }: SupportModalProps) {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [description, setDescription] = useState('');
  const [selectOpen, setSelectOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        <div className="px-8 pt-8 pb-8">
          <h2 className="text-xl font-bold text-dark mb-1">Need some Help?</h2>

          <div className="my-4 rounded-xl overflow-hidden">
            <ModalIllustration />
          </div>

          <p className="text-sm text-text-muted mb-6">
            Describe your question and our specialists will answer you within 24 hours.
          </p>

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Request Subject</label>
            <div className="relative">
              <button
                onClick={() => setSelectOpen(!selectOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 border border-crm-border rounded-xl text-sm text-gray-700 bg-white hover:border-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <span>{subject}</span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${selectOpen ? 'rotate-180' : ''}`} />
              </button>

              {selectOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-crm-border rounded-xl shadow-lg z-20 overflow-hidden">
                  {SUBJECTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSubject(s); setSelectOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary-light transition-colors ${
                        subject === s ? 'text-primary font-medium bg-primary-light' : 'text-gray-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some description of the request"
              rows={4}
              className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>

          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
}
