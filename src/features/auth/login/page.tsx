'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/lib/api';


// ── Kanban illustration ───────────────────────────────────────────────────────

function KanbanIllustration() {
  return (
    <svg viewBox="0 0 420 340" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md">
      <ellipse cx="80" cy="310" rx="38" ry="12" fill="white" opacity="0.15" />
      <path d="M68 310 Q52 270 58 240 Q64 215 72 228 Q80 215 86 240 Q92 270 80 310Z" fill="white" opacity="0.25" />
      <path d="M72 295 Q42 272 32 248 Q44 260 62 276Z" fill="white" opacity="0.2" />
      <path d="M80 295 Q110 272 120 248 Q108 260 92 276Z" fill="white" opacity="0.2" />
      <rect x="74" y="302" width="6" height="18" rx="3" fill="white" opacity="0.25" />
      <ellipse cx="248" cy="308" rx="100" ry="10" fill="white" opacity="0.12" />
      <line x1="200" y1="288" x2="170" y2="315" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      <line x1="296" y1="288" x2="326" y2="315" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      <line x1="248" y1="295" x2="248" y2="318" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      <rect x="168" y="148" width="162" height="142" rx="6" fill="white" opacity="0.95" />
      <rect x="168" y="148" width="162" height="20" rx="6" fill="#E8EDF5" />
      <rect x="174" y="168" width="150" height="2" fill="#E8EDF5" />
      <text x="183" y="162" fontSize="7" fill="#8E9BAE" fontFamily="sans-serif" fontWeight="600">To Do</text>
      <text x="217" y="162" fontSize="7" fill="#8E9BAE" fontFamily="sans-serif" fontWeight="600">In Progress</text>
      <text x="263" y="162" fontSize="7" fill="#8E9BAE" fontFamily="sans-serif" fontWeight="600">In Review</text>
      <text x="306" y="162" fontSize="7" fill="#8E9BAE" fontFamily="sans-serif" fontWeight="600">Done</text>
      <line x1="213" y1="170" x2="213" y2="288" stroke="#E8EDF5" strokeWidth="1" />
      <line x1="257" y1="170" x2="257" y2="288" stroke="#E8EDF5" strokeWidth="1" />
      <line x1="300" y1="170" x2="300" y2="288" stroke="#E8EDF5" strokeWidth="1" />
      <rect x="172" y="176" width="36" height="36" rx="4" fill="#3D4FC4" />
      <rect x="172" y="220" width="36" height="24" rx="4" fill="#E8EDF5" />
      <rect x="218" y="176" width="36" height="28" rx="4" fill="#F5C842" />
      <rect x="218" y="211" width="36" height="20" rx="4" fill="#E8EDF5" />
      <rect x="261" y="176" width="36" height="32" rx="4" fill="#9B59B6" />
      <rect x="261" y="214" width="36" height="16" rx="4" fill="#D5A6E8" />
      <rect x="304" y="176" width="22" height="22" rx="3" fill="#E8EDF5" />
      <rect x="304" y="202" width="22" height="18" rx="3" fill="#E8EDF5" />
      <line x1="307" y1="181" x2="323" y2="181" stroke="#C5CAD4" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="307" y1="185" x2="321" y2="185" stroke="#C5CAD4" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="307" y1="189" x2="319" y2="189" stroke="#C5CAD4" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="308" cy="306" rx="28" ry="6" fill="white" opacity="0.15" />
      <path d="M296 272 L288 304" stroke="#1A2035" strokeWidth="9" strokeLinecap="round" />
      <path d="M316 272 L320 304" stroke="#1A2035" strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="286" cy="306" rx="10" ry="4" fill="#1A2035" />
      <ellipse cx="321" cy="306" rx="10" ry="4" fill="#1A2035" />
      <path d="M290 222 Q290 272 322 272 Q290 272 290 222Z" fill="#5B8AF5" />
      <rect x="290" y="220" width="32" height="54" rx="4" fill="#5B8AF5" />
      <path d="M290 238 Q262 245 255 250" stroke="#FBBF8C" strokeWidth="9" strokeLinecap="round" />
      <path d="M322 240 Q335 252 338 258" stroke="#FBBF8C" strokeWidth="9" strokeLinecap="round" />
      <rect x="336" y="256" width="4" height="14" rx="2" fill="white" transform="rotate(20 338 260)" />
      <rect x="300" y="210" width="12" height="14" rx="3" fill="#FBBF8C" />
      <circle cx="306" cy="200" r="20" fill="#FBBF8C" />
      <path d="M286 198 Q286 178 306 176 Q326 178 326 198 Q326 182 306 180 Q286 182 286 198Z" fill="#1A2035" />
      <path d="M286 198 Q282 210 286 216 L282 218 Q276 208 284 194Z" fill="#1A2035" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router       = useRouter();
  const setUser      = useAuthStore((s) => s.setUser);
  const queryClient  = useQueryClient();

  const [showPassword, setShowPassword] = useState(false);
  const [remember,     setRemember]     = useState(true);
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authService.login({ username: email.trim().toLowerCase(), password });

      localStorage.setItem('token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      const role: 'director' | 'employee' =
        (data.user.role === 'admin' || data.user.role === 'director') ? 'director' : 'employee';
      const displayName =
        `${data.user.first_name} ${data.user.last_name}`.trim() || data.user.username;
      setUser(
        {
          id:       String(data.user.id),
          name:     displayName,
          username: data.user.username,
          email:    data.user.email,
          phone:    data.user.phone,
          position: data.user.position_name ?? String(data.user.position ?? ''),
          company:  data.user.company_name  ?? (data.user.company != null ? String(data.user.company) : null),
          avatar:   data.user.avatar,
        },
        role,
        role === 'employee' ? displayName : undefined,
      );

      queryClient.clear();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ցանցի սխալ — ստուգեք կապը');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col px-12 pt-12 pb-8 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-16">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <span className="text-white text-xl font-bold tracking-tight">Woorkroom</span>
        </div>

        <div className="mb-10">
          <h2 className="text-white text-4xl font-bold leading-tight mb-2">Ձեր աշխատատեղը</h2>
          <p className="text-white/80 text-2xl font-medium">Պլանավորեք. Ստեղծեք. Կառավարեք.</p>
        </div>

        <div className="flex-1 flex items-end justify-center pb-4">
          <KanbanIllustration />
        </div>

        <div className="absolute top-24 right-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute bottom-32 right-4 w-20 h-20 rounded-full bg-white/5" />
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
            </div>
            <span className="text-dark text-lg font-bold">Woorkroom</span>
          </div>

          <h1 className="text-2xl font-bold text-dark text-center mb-8">Մուտք Woorkroom</h1>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">Օգտանուն</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="youremail@gmail.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-crm-border bg-white text-sm text-dark placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">Գաղտնաբառ</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-crm-border bg-white text-sm text-dark placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-dark transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-error font-medium text-center">{error}</p>
            )}

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setRemember((v) => !v)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    remember ? 'bg-primary border-primary' : 'border-crm-border bg-white'
                  }`}
                >
                  {remember && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-dark">Հիշել ինձ</span>
              </label>
              <span className="text-sm text-text-muted hover:text-dark transition-colors cursor-pointer">
                Մոռացե՞լ եք գաղտնաբառը
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white py-3 rounded-full font-semibold text-sm transition-colors shadow-sm mt-2"
            >
              {loading ? 'Մուտք...' : 'Մուտք'}
              {!loading && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </form>

          <div className="mt-8 p-3 bg-gray-50 rounded-xl border border-crm-border text-xs text-text-muted space-y-1">
            <p className="font-semibold text-dark mb-1">Հաշիվներ</p>
            <p>Director — <span className="font-mono">admin@woorkroom.am</span> / <span className="font-mono">admin123</span></p>
            <p>Աշխատող — իրենց email / <span className="font-mono">1234</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
