'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import { authService } from '@/services/auth.service';
import { brandService } from '@/services/brand.service';
import { ApiError, mediaUrl } from '@/lib/api';


// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router       = useRouter();
  const setUser      = useAuthStore((s) => s.setUser);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated     = useAuthStore((s) => s._hasHydrated);
  const queryClient  = useQueryClient();

  // Landed on /login directly (e.g. a bookmark) while an existing session is
  // still valid in localStorage — skip the form and go straight to the app.
  useEffect(() => {
    if (hasHydrated && isAuthenticated) router.replace('/dashboard');
  }, [hasHydrated, isAuthenticated, router]);

  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey:  ['brand'],
    queryFn:   brandService.get,
    staleTime: 10 * 60_000,
  });

  const logoSrc   = mediaUrl(brand?.logo ?? null);
  const brandName = brand?.name ?? 'CRM';
  const tagline   = brand?.tagline ?? 'Պլանավորեք. Ստեղծեք. Կառավարեք.';

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

  const GRADIENT = 'linear-gradient(150deg, #3d52d5 0%, #1c2ea8 55%, #111c80 100%)';

  const featureCards = [
    {
      label: 'Պատվերներ',
      desc: 'Ակտիվ · Արխիվ',
      icon: (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </>
      ),
    },
    {
      label: 'Կադրեր',
      desc: 'Աշխատողներ · Աշխատավարձ',
      icon: (
        <>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </>
      ),
    },
    {
      label: 'Մուտք / Ելք',
      desc: 'Պարտքեր · Կատալոգ',
      icon: (
        <>
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen lg:flex">

      {/* ── Left panel (desktop only) ─────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-14 relative overflow-hidden"
        style={{ background: GRADIENT }}
      >
        <div className="absolute -top-48 -left-48 w-[540px] h-[540px] rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-48 -right-48 w-[540px] h-[540px] rounded-full bg-white/[0.04]" />
        <div className="absolute top-12 right-14 w-16 h-16 rounded-full bg-white/[0.07]" />
        <div className="absolute bottom-14 left-14 w-10 h-10 rounded-full bg-white/[0.07]" />
        <div className="absolute top-1/2 right-6 w-5 h-5 rounded-full bg-white/10" />

        <div className="relative z-10 flex flex-col items-center text-center w-full max-w-xs">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-[36px] bg-white/30 blur-2xl scale-[1.5]" />
            <div className="relative w-32 h-32 rounded-[28px] overflow-hidden flex items-center justify-center bg-white p-2">
              {brandLoading ? (
                <div className="w-full h-full bg-gray-100 animate-pulse rounded-2xl" />
              ) : logoSrc ? (
                <Image src={logoSrc} alt={brandName} width={128} height={128} className="w-full h-full object-contain" />
              ) : (
                <span className="text-primary font-black text-5xl">{brandName.charAt(0)}</span>
              )}
            </div>
          </div>

          {brandLoading
            ? <span className="inline-block w-40 h-10 bg-white/20 rounded-lg animate-pulse mb-1" />
            : <h1 className="text-white text-5xl font-black tracking-tight mb-1 drop-shadow-sm">{brandName}</h1>
          }
          {brandLoading
            ? <span className="inline-block w-52 h-4 bg-white/20 rounded animate-pulse mb-10" />
            : <p className="text-white/55 text-sm mb-10">{tagline}</p>
          }

          <div className="w-10 h-px bg-white/20 mb-10" />

          <div className="w-full space-y-3 text-left">
            {featureCards.map(({ label, desc, icon }) => (
              <div key={label} className="flex items-center gap-3.5 bg-white/[0.08] border border-white/[0.1] rounded-2xl px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/[0.12] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {icon}
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-white/50 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (all screens) ─────────────────────────── */}
      <div className="relative flex-1 min-h-screen flex items-center justify-center p-5 sm:p-8 lg:p-10 bg-gradient-to-b from-white to-gray-50">
        {/* Gradient overlay — mobile & tablet only */}
        <div className="absolute inset-0 lg:hidden" style={{ background: GRADIENT }} />

        <div className="relative z-10 w-full max-w-sm">

          {/* Mobile brand header */}
          <div className="lg:hidden text-center mb-7">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 rounded-3xl bg-white/30 blur-xl scale-125" />
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white p-1.5 flex items-center justify-center">
                {brandLoading ? (
                  <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl" />
                ) : logoSrc ? (
                  <Image src={logoSrc} alt={brandName} width={80} height={80} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-primary font-black text-3xl">{brandName.charAt(0)}</span>
                )}
              </div>
            </div>
            {brandLoading
              ? <div className="w-32 h-7 bg-white/20 rounded-lg animate-pulse mx-auto mb-1" />
              : <h1 className="text-white text-3xl font-black mb-1">{brandName}</h1>
            }
            {brandLoading
              ? <div className="w-44 h-3 bg-white/20 rounded animate-pulse mx-auto" />
              : <p className="text-white/60 text-xs">{tagline}</p>
            }
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 lg:rounded-3xl lg:p-10 lg:ring-1 lg:ring-black/5">
            <p className="text-xl font-bold text-dark text-center mb-6 lg:text-2xl lg:mb-8">
              Մուտք {brandName}
            </p>

            <form className="space-y-4 lg:space-y-5" onSubmit={handleSubmit}>
              {/* Username */}
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
              {error && <p className="text-sm text-error font-medium text-center">{error}</p>}

              {/* Remember me */}
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
          </div>

        </div>
      </div>
    </div>
  );
}
