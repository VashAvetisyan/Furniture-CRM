'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { positionService, type PositionDTO } from '@/services/position.service';
import { accessService } from '@/services/access.service';
import { PlusIcon, CloseIcon } from '@/components/icons';

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-primary' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ── Left panel — positions list ───────────────────────────────────────────────

function PositionsPanel({
  positions,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
}: {
  positions: PositionDTO[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCreate: (name: string) => void;
  onDelete: (id: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName]     = useState('');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
    setAdding(false);
  }

  return (
    <div className="w-full md:w-60 flex-shrink-0 bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 md:max-h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-dark">Պաշտոններ</h2>
        <button
          onClick={() => setAdding(true)}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {adding && (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  submit();
              if (e.key === 'Escape') { setAdding(false); setName(''); }
            }}
            placeholder="Պաշտոնի անուն..."
            className="flex-1 text-sm px-2.5 py-1.5 border border-primary rounded-lg outline-none"
          />
          <button
            onClick={submit}
            className="px-2.5 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover"
          >
            OK
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1">
        {positions.map((pos) => (
          <div
            key={pos.id}
            onClick={() => onSelect(pos.id)}
            className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
              selectedId === pos.id
                ? 'bg-primary text-white'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="text-sm font-medium truncate">{pos.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(pos.id); }}
              className={`opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded transition-opacity ${
                selectedId === pos.id ? 'hover:bg-white/20' : 'hover:bg-gray-200'
              }`}
            >
              <CloseIcon className="w-3 h-3" />
            </button>
          </div>
        ))}

        {positions.length === 0 && !adding && (
          <p className="text-xs text-gray-400 text-center py-8">Պաշտոններ չկան</p>
        )}
      </div>
    </div>
  );
}

// ── Right panel — page access for selected position ───────────────────────────

function AccessPanel({ position }: { position: PositionDTO }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<Record<string, boolean>>({});

  // Returns all company pages with allowed state for this position
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['position-settings', position.id],
    queryFn:  () => accessService.getPositionSettingsById(position.id),
  });

  useEffect(() => { setPending({}); }, [position.id]);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () =>
      accessService.bulkUpdatePositionSettings(
        position.id,
        pages.map((p) => {
          const slug = p.slug ?? p.page_slug ?? '';
          return { slug, allowed: isAllowed(slug) };
        }),
      ),
    onSuccess: () => {
      setPending({});
      qc.invalidateQueries({ queryKey: ['position-settings', position.id] });
    },
  });

  const hasPending = Object.keys(pending).length > 0;

  function savedAllowed(slug: string): boolean {
    const item = pages.find((p) => (p.slug ?? p.page_slug) === slug);
    return item?.allowed ?? false;
  }

  function isAllowed(slug: string): boolean {
    return slug in pending ? pending[slug] : savedAllowed(slug);
  }

  function toggle(slug: string, val: boolean) {
    setPending((prev) => {
      if (val === savedAllowed(slug)) {
        const next = { ...prev };
        delete next[slug];
        return next;
      }
      return { ...prev, [slug]: val };
    });
  }

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-sm p-6 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-base font-bold text-dark">{position.name}</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Ընտրեք այն էջերը, որոնց այս պաշտոնն իրավունք ունի
          </p>
        </div>
        <button
          onClick={() => save()}
          disabled={!hasPending || saving}
          className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
            hasPending && !saving
              ? 'bg-primary text-white hover:bg-primary-hover shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? 'Պահպանում...' : 'Պահպանել'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mt-5 pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm">
            Բernvum е...
          </div>
        ) : pages.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-10">Էջер չկան</p>
        ) : (
          pages
            .filter((p) => !p.is_director_only)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((page) => {
              const slug    = page.slug ?? page.page_slug ?? '';
              const label   = page.label ?? page.page_label ?? slug;
              const allowed = isAllowed(slug);
              const dirty   = slug in pending;
              return (
                <div
                  key={slug}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                    dirty ? 'border-primary/40 bg-primary/5' : 'border-crm-border hover:border-gray-300'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-dark">{label}</p>
                    <p className="text-xs text-text-muted">/{slug}</p>
                  </div>
                  <Toggle checked={allowed} onChange={(v) => toggle(slug, v)} />
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn:  positionService.getAll,
  });

  const positions        = positionsData?.results ?? [];
  const selectedPosition = positions.find((p) => p.id === selectedId) ?? null;

  function handleCreate(name: string) {
    positionService.create(name).then(() =>
      qc.invalidateQueries({ queryKey: ['positions'] }),
    );
  }

  function handleDelete(id: number) {
    positionService.delete(id).then(() => {
      qc.invalidateQueries({ queryKey: ['positions'] });
      if (selectedId === id) setSelectedId(null);
    });
  }

  return (
    <div className="animate-fade-in absolute inset-0 flex flex-col overflow-hidden bg-light p-4 gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-dark">Կարգավորումներ</h1>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
        <PositionsPanel
          positions={positions}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />

        {selectedPosition ? (
          <AccessPanel
            position={selectedPosition}
          />
        ) : (
          <div className="flex-1 bg-white rounded-2xl shadow-sm flex items-center justify-center">
            <p className="text-sm text-text-muted">
              Ընտրեք պաշտոն՝ թույլտվությունները կարգավորելու համար
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
