'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Level, Gender } from '../types';
import { employeeService } from '@/services/employee.service';
import { positionService } from '@/services/position.service';

interface AddEmployeeModalProps {
  onClose: () => void;
  onAdd: () => void;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, optional, error, children }: {
  label: string; optional?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-dark mb-1.5">
        {label}
        {optional && <span className="text-xs font-normal text-text-muted">(կամընտիր)</span>}
      </label>
      {children}
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-crm-border bg-white text-sm text-dark placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all';
const INPUT_ERR = 'border-error focus:ring-error/25 focus:border-error';

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVELS: Level[]   = ['Junior', 'Middle', 'Senior'];
const GENDERS: Gender[] = ['Male', 'Female'];
const COLORS = ['#4361EE','#FF6B9D','#4ECDC4','#F0A500','#96CEB4','#C39BD3','#82E0AA','#6C5CE7'];
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];



// ── Position combobox ─────────────────────────────────────────────────────────

function PositionCombobox({ value, onChange, onSelectId, error, allPositions, isLoading = false }: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  onSelectId: (id: number) => void;
  allPositions: Array<{ id: number; name: string }>;
  isLoading?: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)
          && triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function openDropdown() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, width: r.width, zIndex: 9999 });
    }
    setOpen((o) => !o);
  }

  function select(p: { id: number; name: string }) { onChange(p.name); onSelectId(p.id); setOpen(false); }

  const base = 'w-full px-4 py-2.5 rounded-xl border bg-white text-sm focus:outline-none transition-all cursor-pointer';

  const dropdown = open ? (
    <div ref={containerRef} style={dropStyle} className="bg-white border border-crm-border rounded-xl shadow-xl overflow-hidden">
      <div className="max-h-44 overflow-y-auto">
        {allPositions.map((p) => (
          <button key={p.id} type="button" onClick={() => select(p)}
            className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${value === p.name ? 'text-primary font-medium bg-primary/5' : 'text-dark'}`}>
            {p.name}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div>
      <div
        ref={triggerRef}
        className={`${base} ${error ? 'border-error' : 'border-crm-border'} relative flex items-center justify-between pr-9`}
        onClick={openDropdown}
      >
        <span className={value ? 'text-dark' : 'text-text-muted'}>
          {isLoading ? 'Բեռնվում...' : (value || 'Ընտրել')}
        </span>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
          <ChevronDownIcon />
        </div>
      </div>
      {typeof window !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function AddEmployeeModal({ onClose, onAdd }: AddEmployeeModalProps) {
  const [firstName,  setFirstName]  = useState('');
  const [lastName,   setLastName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [position,   setPosition]   = useState('');
  const [positionId,  setPositionId]  = useState<number | null>(null);
  const [level,      setLevel]      = useState<Level | ''>('');
  const [gender,     setGender]     = useState<Gender | ''>('');
  const [birthday,   setBirthday]   = useState('');
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const { data: positionsData, isLoading: positionsLoading } = useQuery({
    queryKey: ['positions'],
    queryFn:  () => positionService.getAll(),
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { mutate, isPending, isError, error: mutationError } = useMutation({
    mutationFn: () => employeeService.create({
      firstName, lastName, email, phone, password,
      position: positionId as number, level: level as Level,
      gender:   gender || undefined,
      birthday: birthday || undefined,
      color:    randomColor(),
    }),
    onSuccess: () => { onAdd(); onClose(); },
  });

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'Պարտադիր';
    if (!lastName.trim())  errs.lastName  = 'Պարտադիր';
    if (!email.trim())     errs.email     = 'Պարտադիր';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Անվավեր email';
    if (!phone.trim())     errs.phone     = 'Պարտադիր';
    if (!password.trim())  errs.password  = 'Պարտադիր';
    else if (password.length < 8) errs.password = 'Նվազագույնը 8 նիշ';
    if (!confirmPassword.trim()) errs.confirmPassword = 'Պարտադիր';
    else if (confirmPassword !== password) errs.confirmPassword = 'Գաղտնաբառերը չեն համընկնում';
    if (!positionId)         errs.position  = 'Պարտադիր';
    if (!level)            errs.level     = 'Պարտադիր';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    mutate();
  }

  function err(field: string) { return errors[field]; }
  function cls(field: string) { return `${INPUT} ${errors[field] ? INPUT_ERR : ''}`; }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-crm-border flex-shrink-0">
          <h2 className="text-xl font-bold text-dark">Ավելացնել Աշխատող</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-7 py-5 space-y-4">
          {/* Avatar */}
          <div className="flex justify-center mb-2">
            <div className="relative">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-full bg-primary-light border-2 border-dashed border-primary/40 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-primary/60">
                    <CameraIcon />
                    <span className="text-[10px] font-medium">Լուսանկար</span>
                  </div>
                )}
              </div>
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-text-muted whitespace-nowrap">կամընտիր</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mt-6">
            <Field label="Անուն" error={err('firstName')}>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Արամ" className={cls('firstName')} />
            </Field>
            <Field label="Ազգանուն" error={err('lastName')}>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Պետրոսյան" className={cls('lastName')} />
            </Field>
          </div>

          {/* Email */}
          <Field label="Էլ. հասցե" error={err('email')}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aram@gmail.com" className={cls('email')} />
          </Field>

          {/* Phone */}
          <Field label="Հեռախոս" error={err('phone')}>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+374 00 000 000" className={cls('phone')} />
          </Field>

          {/* Position + Level */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Պաշտոն" error={err('position')}>
              <PositionCombobox
                value={position}
                onChange={setPosition}
                onSelectId={setPositionId}
                error={err('position')}
                allPositions={positionsData?.results ?? []}
                isLoading={positionsLoading}
              />
            </Field>

            <Field label="Մակարդակ" error={err('level')}>
              <div className="relative">
                <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className={`${cls('level')} appearance-none pr-9 ${!level ? 'text-text-muted' : ''}`}>
                  <option value="" disabled>Ընտրել</option>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"><ChevronDownIcon /></div>
              </div>
            </Field>
          </div>

          {/* Gender + Birthday */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Սեռ" optional>
              <div className="relative">
                <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className={`${INPUT} appearance-none pr-9 ${!gender ? 'text-text-muted' : ''}`}>
                  <option value="">Ընտրել</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{g === 'Male' ? 'Արական' : 'Իգական'}</option>)}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"><ChevronDownIcon /></div>
              </div>
            </Field>

            <Field label="Ծննդ. ամ." optional>
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={`${INPUT} ${!birthday ? 'text-text-muted' : ''}`} />
            </Field>
          </div>

          {/* Password */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Գաղտնաբառ" error={err('password')}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Նվազ. 8 նիշ"
                className={cls('password')}
              />
            </Field>
            <Field label="Կրկնել գաղտնաբառը" error={err('confirmPassword')}>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Կրկնել"
                className={cls('confirmPassword')}
              />
            </Field>
          </div>

          {isError && (
            <p className="text-sm text-error text-center">
              {mutationError instanceof Error ? mutationError.message : 'Սխալ — կրկին փորձեք'}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-crm-border flex-shrink-0 flex gap-3">
          <button onClick={onClose} disabled={isPending} className="flex-1 py-2.5 rounded-xl border border-crm-border text-sm font-semibold text-text-muted hover:text-dark hover:bg-gray-50 transition-all disabled:opacity-50">
            Չեղարկել
          </button>
          <button onClick={handleSubmit} disabled={isPending} className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-sm">
            {isPending ? 'Ավելացվում...' : 'Ավելացնել'}
          </button>
        </div>
      </div>
    </div>
  );
}
