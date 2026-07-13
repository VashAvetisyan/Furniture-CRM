'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { brandService, type BrandInfo, type BrandUpdatePayload } from '@/services/brand.service';
import { mediaUrl } from '@/lib/api';
import { useAuthStore } from '@/stores';

// ── icons ──────────────────────────────────────────────────────────────────────

function EditIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('hy-AM', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Logo avatar ────────────────────────────────────────────────────────────────

function BrandLogo({ src, name, size = 96 }: { src: string | null; name: string; size?: number }) {
  const proxied = mediaUrl(src);
  if (proxied) {
    return (
      <Image
        src={proxied}
        alt={name}
        width={size}
        height={size}
        className="rounded-2xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-2xl bg-primary flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Edit modal ─────────────────────────────────────────────────────────────────

function EditModal({ info, onClose }: { info: BrandInfo; onClose: () => void }) {
  const qc = useQueryClient();

  const [form, setForm] = useState<Omit<BrandUpdatePayload, 'logo'>>({
    name: info.name,
    tagline: info.tagline,
    description: info.description,
    website: info.website,
    email: info.email,
    phone: info.phone,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending, error } = useMutation({
    mutationFn: (payload: BrandUpdatePayload) => brandService.update(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brand'] });
      onClose();
    },
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ ...form, logo: logoFile });
  }

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h2 className="text-lg font-bold text-dark">Խմբագրել բրենդ</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Logo upload */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="logo" className="w-16 h-16 rounded-xl object-cover border border-crm-border" />
              ) : (
                <BrandLogo src={info.logo} name={info.name} size={64} />
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-crm-border text-sm text-dark hover:bg-gray-50 transition-colors"
              >
                <UploadIcon />
                Փոխել լոգոն
              </button>
              <p className="text-xs text-text-muted mt-1">PNG, JPG · Max 2 MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          {/* Fields */}
          {([
            { key: 'name', label: 'Անվանում', type: 'text', required: true },
            { key: 'tagline', label: 'Կարգախոս', type: 'text', required: false },
            { key: 'website', label: 'Կայք', type: 'url', required: false },
            { key: 'email', label: 'Էլ. փոստ', type: 'email', required: false },
            { key: 'phone', label: 'Հեռախոս', type: 'text', required: false },
          ] as const).map(({ key, label, type, required }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">{label}</label>
              <input
                type={type}
                value={(form[key] as string) ?? ''}
                onChange={set(key)}
                required={required}
                className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
              />
            </div>
          ))}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Նկարագրություն</label>
            <textarea
              value={form.description ?? ''}
              onChange={set('description')}
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-error bg-error/10 px-3 py-2 rounded-xl">
              {(error as Error).message}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-dark hover:bg-gray-100 rounded-xl transition-colors"
            >
              Չեղարկել
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors disabled:opacity-60"
            >
              {isPending ? 'Պահպանվում...' : 'Պահպանել'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Info row ───────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, href }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-crm-border last:border-0">
      <span className="mt-0.5 text-primary flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer"
            className="text-sm text-primary hover:underline break-all"
          >{value}</a>
        ) : (
          <p className="text-sm text-dark break-all">{value}</p>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function InfoPage() {
  const role = useAuthStore((s) => s.role);
  const isDirector = role === 'director';
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['brand'],
    queryFn: brandService.get,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-text-muted text-sm">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Բեռնվում է...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-error text-sm">
        Չհաջողվեց բեռնել — կրկնեք նորից
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 max-w-2xl mx-auto space-y-5">

      {/* Brand card */}
      <div className="bg-white rounded-2xl shadow-sm border border-crm-border overflow-hidden">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 px-6 pt-8 pb-6">
          {isDirector && (
            <button
              onClick={() => setEditOpen(true)}
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-white rounded-xl border border-crm-border hover:bg-gray-50 shadow-sm transition-colors"
            >
              <EditIcon />
              Խմբագրել
            </button>
          )}

          <div className="flex items-center gap-4">
            <BrandLogo src={data.logo} name={data.name} size={72} />
            <div>
              <h1 className="text-xl font-bold text-dark">{data.name}</h1>
              {data.tagline && (
                <p className="text-sm text-text-muted mt-0.5 italic">«{data.tagline}»</p>
              )}
            </div>
          </div>

          {data.description && (
            <p className="mt-4 text-sm text-gray-600 leading-relaxed">{data.description}</p>
          )}
        </div>

        {/* Contact info */}
        <div className="px-6 py-2">
          {data.website && (
            <InfoRow icon={<GlobeIcon />} label="Կայք" value={data.website} href={data.website} />
          )}
          {data.email && (
            <InfoRow icon={<MailIcon />} label="Էլ. փոստ" value={data.email} href={`mailto:${data.email}`} />
          )}
          {data.phone && (
            <InfoRow icon={<PhoneIcon />} label="Հեռախոս" value={data.phone} href={`tel:${data.phone}`} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-crm-border">
          <p className="text-[11px] text-text-muted">
            Վերջին թարմացում · {fmtDate(data.updated_at)}
          </p>
        </div>
      </div>

      {editOpen && <EditModal info={data} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
