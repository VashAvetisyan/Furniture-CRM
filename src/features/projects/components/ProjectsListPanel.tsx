'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@/components/icons';

export interface PanelAssignee {
  id?: string;
  name: string;
  color: string;
  initials: string;
  role?: string;
}

export interface PanelClient {
  id: number;
  name: string;
  phone?: string;
}

interface ProjectsListPanelProps {
  assignees: PanelAssignee[];
  selectedEmployeeName: string | null;
  onSelectEmployee: (name: string | null) => void;
  selectedRole?: string;
  onSelectRole?: (role: string) => void;
  clients?: PanelClient[];
  selectedClientId?: number | null;
  onSelectClient?: (id: number | null) => void;
}

const ALL = 'Բոլոր';

export default function ProjectsListPanel({
  assignees,
  selectedEmployeeName,
  onSelectEmployee,
  selectedRole: selectedRoleProp,
  onSelectRole,
  clients = [],
  selectedClientId,
  onSelectClient,
}: ProjectsListPanelProps) {
  const [collapsed, setCollapsed]         = useState(false);
  const [tab, setTab]                     = useState<'employees' | 'clients'>('employees');
  const roles = [ALL, ...Array.from(new Set(assignees.map((a) => a.role).filter(Boolean) as string[]))];
  const [internalRole, setInternalRole]   = useState(ALL);
  const selectedRole = selectedRoleProp ?? internalRole;
  const setSelectedRole = (role: string) => {
    if (onSelectRole) onSelectRole(role);
    else setInternalRole(role);
  };
  const [empSearch, setEmpSearch]         = useState('');
  const [clientSearch, setClientSearch]   = useState('');
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredEmployees = assignees
    .filter((a) => selectedRole === ALL || a.role === selectedRole)
    .filter((a) => a.name.toLowerCase().includes(empSearch.toLowerCase()));

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone ?? '').includes(clientSearch)
  );

  const hasActiveFilter = !!selectedEmployeeName || !!selectedClientId;

  /* ── Collapsed ── */
  if (collapsed) {
    return (
      <aside className="flex-shrink-0 w-10 bg-white rounded-2xl shadow-sm flex flex-col items-center py-4 gap-3">
        <button
          onClick={() => setCollapsed(false)}
          title="Բացել"
          className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
        {hasActiveFilter && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
        <svg className="w-4 h-4 text-text-muted mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
      </aside>
    );
  }

  /* ── Expanded ── */
  return (
    <aside className="w-64 flex-shrink-0 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">

      {/* Header row */}
      <div className="px-4 pt-4 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Ֆիլտր</p>
          <button
            onClick={() => setCollapsed(true)}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-text-muted hover:text-dark transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-0.5 mb-3">
          <button
            onClick={() => setTab('employees')}
            className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all ${
              tab === 'employees'
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-muted hover:text-dark'
            }`}
          >
            Աշխատ.
          </button>
          <button
            onClick={() => setTab('clients')}
            className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all ${
              tab === 'clients'
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-muted hover:text-dark'
            }`}
          >
            Հաճախ.
          </button>
        </div>
      </div>

      {/* ── Employees tab ── */}
      {tab === 'employees' && (
        <>
          <div className="px-4 pb-3 border-b border-crm-border flex-shrink-0">
            {/* Search */}
            <div className="relative mb-3">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                placeholder="Փնտրել..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
              {empSearch && (
                <button onClick={() => setEmpSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-dark text-xs">✕</button>
              )}
            </div>

            {/* Role dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-dark hover:text-primary transition-colors w-full"
              >
                <span className="truncate flex-1 text-left">{selectedRole}</span>
                <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-crm-border shadow-lg z-20 py-1 overflow-hidden">
                  {roles.map((role) => (
                    <button
                      key={role}
                      onClick={() => { setSelectedRole(role); setDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        selectedRole === role ? 'text-primary font-semibold bg-primary-light' : 'text-dark hover:bg-gray-50'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active chip */}
          {selectedEmployeeName && (
            <div className="px-3 pt-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 bg-primary-light border border-primary/20 rounded-full px-2.5 py-1">
                <span className="text-[11px] text-primary font-medium truncate flex-1">{selectedEmployeeName}</span>
                <button onClick={() => onSelectEmployee(null)} className="text-primary/60 hover:text-primary text-xs leading-none">✕</button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
            {filteredEmployees.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">Գտնված չէ</p>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = emp.name === selectedEmployeeName;
                return (
                  <button
                    key={emp.name}
                    onClick={() => onSelectEmployee(isSelected ? null : emp.name)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-primary/30 bg-primary/5 border-l-4 border-l-primary'
                        : 'border-crm-border hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                      style={{ backgroundColor: emp.color }}
                    >
                      {emp.initials}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm leading-tight truncate ${isSelected ? 'font-semibold text-dark' : 'font-medium text-gray-700'}`}>
                        {emp.name}
                      </p>
                      {emp.role && <p className="text-[11px] text-text-muted truncate">{emp.role}</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── Clients tab ── */}
      {tab === 'clients' && (
        <>
          <div className="px-4 pb-3 border-b border-crm-border flex-shrink-0">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Փնտրել հաճախորդ..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
              {clientSearch && (
                <button onClick={() => setClientSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-dark text-xs">✕</button>
              )}
            </div>
          </div>

          {/* Active chip */}
          {selectedClientId && onSelectClient && (
            <div className="px-3 pt-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 bg-primary-light border border-primary/20 rounded-full px-2.5 py-1">
                <span className="text-[11px] text-primary font-medium truncate flex-1">
                  {clients.find((c) => c.id === selectedClientId)?.name ?? ''}
                </span>
                <button onClick={() => onSelectClient(null)} className="text-primary/60 hover:text-primary text-xs leading-none">✕</button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
            {filteredClients.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">Հաճախորդներ չկան</p>
            ) : (
              filteredClients.map((client) => {
                const isSelected = client.id === selectedClientId;
                const initials = client.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <button
                    key={client.id}
                    onClick={() => onSelectClient?.(isSelected ? null : client.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-primary/30 bg-primary/5 border-l-4 border-l-primary'
                        : 'border-crm-border hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm leading-tight truncate ${isSelected ? 'font-semibold text-dark' : 'font-medium text-gray-700'}`}>
                        {client.name}
                      </p>
                      {client.phone && <p className="text-[11px] text-text-muted truncate">{client.phone}</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </aside>
  );
}
