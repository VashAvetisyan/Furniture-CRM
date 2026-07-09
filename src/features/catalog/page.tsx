'use client';
import { SkTable } from '@/components/ui/Skeleton';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogService, type ProductDTO, type CreateProductData } from '@/services/catalog.service';
import { mediaUrl } from '@/lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('ru-RU') + ' ֏';

const INPUT = 'w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white transition-all';

// ── Product Form Modal ────────────────────────────────────────────────────────

interface ExistingImage { id: number; url: string }

interface FormState {
  name:           string;
  sku:            string;
  description:    string;
  price:          string;
  cost_price:     string;
  width_cm:       string;
  height_cm:      string;
  depth_cm:       string;
  is_active:      boolean;
  newImages:      File[];
  existingImages: ExistingImage[];
}

const EMPTY: FormState = {
  name: '', sku: '', description: '',
  price: '', cost_price: '',
  width_cm: '', height_cm: '', depth_cm: '',
  is_active: true, newImages: [], existingImages: [],
};

function ProductModal({
  product,
  onClose,
}: {
  product?: ProductDTO;
  onClose:  () => void;
}) {
  const qc  = useQueryClient();
  const [form, setForm] = useState<FormState>(
    product
      ? {
          name:           product.name,
          sku:            product.sku ?? '',
          description:    product.description ?? '',
          price:          String(product.price),
          cost_price:     String(product.cost_price ?? ''),
          width_cm:       product.width_cm  != null ? String(product.width_cm)  : '',
          height_cm:      product.height_cm != null ? String(product.height_cm) : '',
          depth_cm:       product.depth_cm  != null ? String(product.depth_cm)  : '',
          is_active:      product.is_active,
          newImages:      [],
          existingImages: product.images?.map(img => ({ id: img.id, url: img.image })) ?? [],
        }
      : EMPTY,
  );
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const keepIds = new Set(form.existingImages.map(e => e.id));
      const deleteImageIds = product
        ? product.images.filter(img => !keepIds.has(img.id)).map(img => img.id)
        : [];

      const data: CreateProductData = {
        name:         form.name.trim(),
        sku:          form.sku.trim(),
        description:  form.description.trim(),
        price:        parseFloat(form.price) || 0,
        cost_price:   parseFloat(form.cost_price) || 0,
        width_cm:     form.width_cm  ? parseFloat(form.width_cm)  : null,
        height_cm:    form.height_cm ? parseFloat(form.height_cm) : null,
        depth_cm:     form.depth_cm  ? parseFloat(form.depth_cm)  : null,
        is_active:    form.is_active,
        newImages:    form.newImages,
        deleteImageIds,
      };
      if (product) return catalogService.update(product.id, data);
      return catalogService.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-products'] });
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) setForm(prev => ({ ...prev, newImages: [...prev.newImages, ...files] }));
    e.target.value = '';
  }

  function removeExisting(idx: number) {
    setForm(prev => ({ ...prev, existingImages: prev.existingImages.filter((_, i) => i !== idx) }));
  }

  function removeNew(idx: number) {
    setForm(prev => ({ ...prev, newImages: prev.newImages.filter((_, i) => i !== idx) }));
  }

  function validate() {
    if (!form.name.trim()) { setErr('Անունը պետք է լինի'); return false; }
    if (!form.price || parseFloat(form.price) <= 0) { setErr('Գինը պետք է լինի'); return false; }
    return true;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-xl sm:mx-4 flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-crm-border flex-shrink-0">
          <h2 className="text-base font-bold text-dark">
            {product ? 'Խմբագրել Ապրանքը' : 'Ավելացնել Ապրանք'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-text-muted">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-3 pt-3 pb-2 flex flex-col gap-3">

          {/* Images */}
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-2 block">Լուսանկարներ</label>
            <div className="flex flex-wrap gap-2">
              {form.existingImages.map((img, i) => (
                <div key={img.id} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={mediaUrl(img.url) ?? ''} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExisting(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
              {form.newImages.map((file, i) => (
                <div key={i} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNew(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-dashed border-crm-border flex flex-col items-center justify-center text-text-muted hover:border-primary/50 hover:text-primary transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span className="text-[10px] mt-1">Ավելացնել</span>
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
          </div>

          {/* Name + SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Անուն *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Անկյունային..." className={INPUT} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Կոդ</label>
              <input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="DIV-001" className={INPUT} />
            </div>
          </div>

          {/* Price + Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Գին (֏) *</label>
              <input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Ինքնարժեք (֏)</label>
              <input type="number" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} placeholder="0" className={INPUT} />
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Չափեր (սմ)</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input type="number" value={form.width_cm} onChange={(e) => set('width_cm', e.target.value)} placeholder="Լայնք" className={INPUT} />
              </div>
              <div>
                <input type="number" value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} placeholder="Բարձր." className={INPUT} />
              </div>
              <div>
                <input type="number" value={form.depth_cm} onChange={(e) => set('depth_cm', e.target.value)} placeholder="Խորություն" className={INPUT} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Նկարագրություն</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="..."
              className={INPUT + ' resize-none'}
            />
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer pb-1">
            <div
              onClick={() => set('is_active', !form.is_active)}
              className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${form.is_active ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_active ? 'left-5' : 'left-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-dark">Ակտիվ</span>
          </label>

        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-3 py-3 border-t border-crm-border flex-shrink-0">
          {err && <p className="text-xs text-error bg-error/5 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-crm-border text-dark hover:bg-gray-50">
              Չեղարկել
            </button>
            <button
              onClick={() => { setErr(''); if (validate()) mutate(); }}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover disabled:opacity-40"
            >
              {isPending ? 'Պահվում...' : (product ? 'Պահել' : 'Ավելացնել')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Product Detail Modal ──────────────────────────────────────────────────────

function ProductDetailModal({
  product,
  onClose,
  onEdit,
  onDelete,
}: {
  product:  ProductDTO;
  onClose:  () => void;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const allImgs = (
    product.images?.length
      ? product.images.map(img => img.image)
      : product.image ? [product.image] : []
  ).map(u => mediaUrl(u) ?? '');

  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const dims = [product.width_cm, product.height_cm, product.depth_cm]
    .filter(Boolean)
    .join(' × ');

  const prevImg = () => setImgIdx(i => (i - 1 + allImgs.length) % allImgs.length);
  const nextImg = () => setImgIdx(i => (i + 1) % allImgs.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-auto max-h-[96vh] sm:max-h-[92vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-crm-border flex-shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${product.is_active ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'}`}>
              {product.is_active ? 'Ակտիվ' : 'Ոչ ակտիվ'}
            </span>
            {product.sku && (
              <span className="text-xs font-mono text-text-muted bg-gray-50 px-2 py-0.5 rounded-md flex-shrink-0">
                {product.sku}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => { onClose(); onEdit(); }}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border border-crm-border text-dark hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span className="hidden sm:inline">Խմբագրել</span>
            </button>
            <button
              onClick={() => { onClose(); onDelete(); }}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border border-error/30 text-error hover:bg-error/5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
              <span className="hidden sm:inline">Ջնջել</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col sm:flex-row flex-1 p-3 sm:p-5 pt-3 sm:pt-4 gap-3 sm:gap-5">
          {/* Image gallery */}
          <div className="sm:w-80 flex-shrink-0 flex flex-col rounded-xl overflow-hidden min-h-[200px] sm:min-h-0">
            <div className="relative flex-1 bg-gray-100 flex items-center justify-center group overflow-hidden" style={{ minHeight: '320px' }}>
              {allImgs.length > 0 ? (
                <>
                  <img
                    src={allImgs[imgIdx]}
                    alt={product.name}
                    className="w-full h-full object-cover max-h-[300px] sm:max-h-none cursor-zoom-in"
                    onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in pointer-events-none">
                    <svg className="w-8 h-8 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                  </div>
                  {allImgs.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); prevImg(); }}
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); nextImg(); }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-text-muted p-8">
                  <svg className="w-14 h-14 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="text-xs">Նկար չկա</span>
                </div>
              )}
            </div>
            {allImgs.length > 1 && (
              <div className="flex gap-1.5 justify-center py-2 bg-gray-50 border-t border-crm-border flex-shrink-0">
                {allImgs.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIdx ? 'bg-primary' : 'bg-gray-300 hover:bg-gray-400'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Lightbox */}
          {lightbox && allImgs.length > 0 && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
              onClick={() => setLightbox(false)}
            >
              <button
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                onClick={() => setLightbox(false)}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              {allImgs.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevImg(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextImg(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </>
              )}
              <img
                src={allImgs[imgIdx]}
                alt={product.name}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              {allImgs.length > 1 && (
                <div className="absolute bottom-6 flex gap-2">
                  {allImgs.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                      className={`w-2 h-2 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/40 hover:bg-white/60'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Details */}
          <div className="flex-1 flex flex-col gap-3 sm:gap-5 min-w-0">
            <div>
              <h2 className="text-lg font-bold text-dark leading-snug">{product.name}</h2>
              {product.description && (
                <p className="text-sm text-text-muted mt-1.5 leading-relaxed">{product.description}</p>
              )}
            </div>

            {dims && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>
                </svg>
                <span className="text-sm text-dark font-medium">{dims} սմ</span>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl border border-crm-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-crm-border bg-white">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Արժեք</p>
              </div>
              <div className="divide-y divide-crm-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-text-muted">Վաճառքի գին</span>
                  <span className="text-base font-bold text-dark">{fmt(product.price)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onDelete,
  onView,
}: {
  product:  ProductDTO;
  onEdit:   () => void;
  onDelete: () => void;
  onView:   () => void;
}) {
  const primaryImg = product.images?.find(img => img.is_primary)?.image
    ?? product.images?.[0]?.image
    ?? product.image;
  const imgSrc = mediaUrl(primaryImg);
  const dims = [product.width_cm, product.height_cm, product.depth_cm].filter(Boolean).join(' × ');

  const EditBtn = ({ cls }: { cls: string }) => (
    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className={cls}>
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  );
  const DelBtn = ({ cls }: { cls: string }) => (
    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className={cls}>
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
        <path d="M10 11v6"/><path d="M14 11v6"/>
      </svg>
    </button>
  );
  const btnBase = 'flex items-center justify-center bg-white rounded-lg shadow-sm border border-crm-border text-text-muted transition-colors';

  return (
    <div
      className="bg-white rounded-2xl border border-crm-border shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-row sm:flex-col"
      onClick={onView}
    >
      {/* Image */}
      <div className="relative w-28 sm:w-full sm:h-44 flex-shrink-0 bg-gray-100" style={{ minHeight: '112px' }}>
        {imgSrc ? (
          <img src={imgSrc} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
        <span className={`hidden sm:inline absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${product.is_active ? 'bg-success/10 text-success' : 'bg-gray-200 text-gray-500'}`}>
          {product.is_active ? 'Ակտիվ' : 'Ոչ ակտիվ'}
        </span>
        <div className="hidden sm:flex absolute top-2 right-2 gap-1">
          <EditBtn cls={`w-7 h-7 ${btnBase} hover:text-primary hover:border-primary/40`} />
          <DelBtn  cls={`w-7 h-7 ${btnBase} hover:text-error hover:border-error/40`} />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col gap-1 sm:gap-2 min-w-0">
        <div className="flex sm:hidden items-center justify-between gap-1 mb-0.5">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${product.is_active ? 'bg-success/10 text-success' : 'bg-gray-200 text-gray-500'}`}>
            {product.is_active ? 'Ակտիվ' : 'Ոչ ակտիվ'}
          </span>
          <div className="flex gap-1">
            <EditBtn cls={`w-6 h-6 ${btnBase} hover:text-primary hover:border-primary/40`} />
            <DelBtn  cls={`w-6 h-6 ${btnBase} hover:text-error hover:border-error/40`} />
          </div>
        </div>

        <p className="text-xs sm:text-sm font-bold text-dark leading-snug line-clamp-2">{product.name}</p>
        {product.sku && <p className="text-[10px] sm:text-[11px] text-text-muted font-mono">{product.sku}</p>}
        {dims && <p className="text-[10px] sm:text-[11px] text-text-muted">{dims} սմ</p>}

        <div className="mt-auto pt-1.5 sm:pt-2 border-t border-crm-border">
          <div className="flex justify-between items-center">
            <span className="text-[10px] sm:text-[11px] text-text-muted">Գին</span>
            <span className="text-xs sm:text-sm font-bold text-dark">{fmt(product.price)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const qc = useQueryClient();
  const [search,     setSearch]     = useState('');
  const [addOpen,    setAddOpen]    = useState(false);
  const [viewProd,   setViewProd]   = useState<ProductDTO | null>(null);
  const [editProd,   setEditProd]   = useState<ProductDTO | null>(null);
  const [delConfirm, setDelConfirm] = useState<ProductDTO | null>(null);

  const { data: raw, isLoading, isError, refetch } = useQuery({
    queryKey: ['catalog-products', search],
    queryFn:  () => catalogService.getAll(search.trim() ? { search: search.trim() } : undefined),
    staleTime: 30_000,
  });

  const products: ProductDTO[] = (() => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    const r = (raw as { results?: unknown })?.results;
    return Array.isArray(r) ? (r as ProductDTO[]) : [];
  })();

  const { mutate: deleteProd } = useMutation({
    mutationFn: (id: number) => catalogService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-products'] });
      setDelConfirm(null);
    },
  });

  return (
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark">Կատալոգ</h1>
          <p className="text-xs text-text-muted mt-0.5">{products.length} ապրանք</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Ավելացնել
        </button>
      </div>

      {/* Search */}
      <div className="px-4 sm:px-6 pb-3 sm:pb-4 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Որոնել ապրանք..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-dark">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-crm-border overflow-hidden p-4"><SkTable rows={6} cols={5} /></div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="text-sm text-error">Սերվերի սխալ</p>
            <button onClick={() => refetch()} className="text-xs text-primary font-semibold hover:underline">Կրկին</button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-text-muted">
            <svg className="w-12 h-12 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p className="text-sm">Ապրանքներ չկան</p>
            <button onClick={() => setAddOpen(true)} className="text-xs text-primary font-semibold hover:underline">+ Ավելացնել ապրանք</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onView={() => setViewProd(p)}
                onEdit={() => setEditProd(p)}
                onDelete={() => setDelConfirm(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {addOpen  && <ProductModal onClose={() => setAddOpen(false)} />}
      {editProd && <ProductModal product={editProd} onClose={() => setEditProd(null)} />}
      {viewProd && (
        <ProductDetailModal
          product={viewProd}
          onClose={() => setViewProd(null)}
          onEdit={() => setEditProd(viewProd)}
          onDelete={() => setDelConfirm(viewProd)}
        />
      )}

      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-[90vw] max-w-xs sm:max-w-sm flex flex-col gap-4">
            <div>
              <p className="text-base font-bold text-dark text-center">Ջնջե՞լ ապրանքը</p>
              <p className="text-sm text-text-muted text-center mt-1">{delConfirm.name}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDelConfirm(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-crm-border text-dark hover:bg-gray-50">
                Չեղարկել
              </button>
              <button
                onClick={() => deleteProd(delConfirm.id)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-error text-white hover:bg-red-600"
              >
                Ջնջել
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

