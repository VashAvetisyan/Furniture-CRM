'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { positionService, type PositionDTO } from '@/services/position.service';
import { accessService } from '@/services/access.service';
import { taskStatusService } from '@/services/task.service';
import { companySettingsService } from '@/services/companySettings.service';
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

// ── Positions list panel ──────────────────────────────────────────────────────

function PositionsPanel({
  positions,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
}: {
  positions:  PositionDTO[];
  selectedId: number | null;
  onSelect:   (id: number) => void;
  onCreate:   (name: string) => void;
  onDelete:   (id: number) => void;
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

// ── Access panel ──────────────────────────────────────────────────────────────

function AccessPanel({ position }: { position: PositionDTO }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<Record<string, boolean>>({});

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

  function savedAllowed(slug: string) {
    return pages.find((p) => (p.slug ?? p.page_slug) === slug)?.allowed ?? false;
  }
  function isAllowed(slug: string) {
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
            Բեռvum է․․․
          </div>
        ) : pages.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-10">Էջeр չկan</p>
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

// ── Color swatches ────────────────────────────────────────────────────────────

const STATUS_COLORS = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#22c55e', // green
  '#f59e0b', // amber
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#a855f7', // purple
  '#6b7280', // gray
];

function ColorSwatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const isCustom = !STATUS_COLORS.includes(value);

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {STATUS_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{ background: c }}
          className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
            value === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''
          }`}
        />
      ))}

      {/* Custom color picker */}
      <label
        title="Custom color"
        className={`relative w-5 h-5 rounded-full cursor-pointer overflow-hidden transition-transform hover:scale-110 ${
          isCustom ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''
        }`}
        style={{
          background: isCustom
            ? value
            : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </label>
    </div>
  );
}

// ── Task statuses panel ───────────────────────────────────────────────────────

function StatusesPanel() {
  const qc = useQueryClient();
  const [adding, setAdding]       = useState(false);
  const [newName, setNewName]     = useState('');
  const [newColor, setNewColor]   = useState(STATUS_COLORS[0]);
  const [editId, setEditId]       = useState<string | number | null>(null);
  const [editName, setEditName]   = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: statusesData, isLoading } = useQuery({
    queryKey: ['task-statuses'],
    queryFn:  taskStatusService.getAll,
  });
  const statuses = statusesData?.results ?? [];

  const { mutate: createStatus, isPending: creating } = useMutation({
    mutationFn: (data: { name: string; color: string }) => taskStatusService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-statuses'] });
      setNewName('');
      setNewColor(STATUS_COLORS[0]);
      setAdding(false);
    },
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, name, color }: { id: string | number; name: string; color: string }) =>
      taskStatusService.update(id, { name, color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-statuses'] });
      setEditId(null);
    },
  });

  const { mutate: deleteStatus } = useMutation({
    mutationFn: (id: string | number) => taskStatusService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-statuses'] }),
  });

  function submitAdd() {
    const name = newName.trim();
    if (!name) return;
    createStatus({ name, color: newColor });
  }

  function submitEdit() {
    const name = editName.trim();
    if (!name || editId == null) return;
    updateStatus({ id: editId, name, color: editColor });
  }

  function openEdit(s: { id: string | number; name: string; color?: string }) {
    setEditId(s.id);
    setEditName(s.name);
    setEditColor(s.color ?? STATUS_COLORS[0]);
  }

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-sm p-5 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-dark">Կատարման կարգավիճակներ</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Սեղմեք Կարգավիճակի վրա՝ խմբագրելու համար
          </p>
        </div>
        <button
          onClick={() => { setAdding(true); setEditId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-sm font-semibold hover:bg-primary/20 transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Ավելացնել
        </button>
      </div>

      {adding && (
        <div className="mb-3 p-3 rounded-xl border-2 border-primary/30 bg-primary/5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: newColor }} />
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  submitAdd();
                if (e.key === 'Escape') { setAdding(false); setNewName(''); }
              }}
              placeholder="Kargichy anunn..."
              className="flex-1 text-sm px-3 py-1.5 border border-primary rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={submitAdd}
              disabled={!newName.trim() || creating}
              className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-40 transition-colors"
            >
              {creating ? '...' : 'OK'}
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(''); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 transition-colors"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <ColorSwatches value={newColor} onChange={setNewColor} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm">
            Beռvum e...
          </div>
        ) : statuses.length === 0 && !adding ? (
          <p className="text-sm text-text-muted text-center py-10">Kargichers chkan</p>
        ) : (
          statuses.map((s) => (
            <div
              key={s.id}
              className="group flex flex-col gap-2 px-3 py-2.5 rounded-xl border border-crm-border hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: s.color ?? '#6366f1' }}
                />

                {editId === s.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')  submitEdit();
                      if (e.key === 'Escape') setEditId(null);
                    }}
                    className="flex-1 text-sm px-2 py-0.5 border border-primary rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                  />
                ) : (
                  <span
                    className="flex-1 text-sm font-medium text-dark cursor-pointer hover:text-primary transition-colors"
                    onClick={() => openEdit(s)}
                  >
                    {s.name}
                  </span>
                )}

                {editId === s.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={submitEdit}
                      className="px-2.5 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 transition-colors"
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => deleteStatus(s.id)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-error/10 text-text-muted hover:text-error transition-all"
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {editId === s.id && (
                <div className="pl-6">
                  <ColorSwatches value={editColor} onChange={setEditColor} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Task settings panel ───────────────────────────────────────────────────────

function SettingRow({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="max-w-sm">
      <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1">
        {label}
      </label>
      {hint && <p className="text-xs text-text-muted mb-3">{hint}</p>}
      {children}
    </div>
  );
}

function TaskSettingsPanel() {
  const qc = useQueryClient();
  const [pct,  setPct]  = useState('');
  const [days, setDays] = useState('');
  const [saved, setSaved] = useState<'pct' | 'days' | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn:  companySettingsService.get,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!settings) return;
    setPct(String(settings.advance_payment_percent));
    setDays(String(settings.default_completion_days));
  }, [settings]);

  const { mutate: updatePct, isPending: savingPct } = useMutation({
    mutationFn: (val: number) =>
      companySettingsService.update({ advance_payment_percent: val }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-settings'] });
      setSaved('pct');
      setTimeout(() => setSaved(null), 2000);
    },
  });

  const { mutate: updateDays, isPending: savingDays } = useMutation({
    mutationFn: (val: number) =>
      companySettingsService.update({ default_completion_days: val }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-settings'] });
      setSaved('days');
      setTimeout(() => setSaved(null), 2000);
    },
  });

  function savePct() {
    const val = parseFloat(pct);
    if (isNaN(val) || val < 0 || val > 100) return;
    updatePct(val);
  }

  function saveDays() {
    const val = parseInt(days);
    if (isNaN(val) || val < 0) return;
    updateDays(val);
  }

  if (isLoading) {
    return (
      <div className="flex-1 bg-white rounded-2xl shadow-sm flex items-center justify-center">
        <p className="text-sm text-text-muted">Beռvum e...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-8 min-h-0 overflow-y-auto">
      <div>
        <h2 className="text-base font-bold text-dark mb-0.5">Patvanerи naxtakazmery</h2>
        <p className="text-xs text-text-muted">Karqavorel lrancumner patvanerи hamar</p>
      </div>

      {/* Advance % */}
      <SettingRow
        label="Kanxavchar lrancum (%)"
        hint="Nor patveri batsmanis kanxavchary avtomatik kkancvi ayd tokosy"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-32">
            <input
              type="number"
              min="0"
              max="100"
              value={pct}
              onChange={(e) => { setPct(e.target.value); setSaved(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') savePct(); }}
              placeholder="0"
              className="w-full px-3 py-2 pr-8 border border-crm-border rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none font-medium">%</span>
          </div>
          <button
            onClick={savePct}
            disabled={!pct || savingPct || saved === 'pct'}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              saved === 'pct'
                ? 'bg-success/10 text-success'
                : 'bg-primary text-white hover:bg-primary-hover disabled:opacity-40'
            }`}
          >
            {savingPct ? '...' : saved === 'pct' ? 'Pahpanvec ✓' : 'Pahpanel'}
          </button>
        </div>
        {pct && !isNaN(parseFloat(pct)) && (
          <p className="mt-2 text-xs text-text-muted">
            Orinak. 100 000 ֏ × {pct}% = <span className="font-semibold text-dark">{Math.round(100000 * parseFloat(pct) / 100).toLocaleString()} ֏</span>
          </p>
        )}
      </SettingRow>

      {/* Deadline days */}
      <SettingRow
        label="Verjanashmkety (orerы)"
        hint="Yntunman amsamivic heto incha orer deadline-y avtomatik kkancvi"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-32">
            <input
              type="number"
              min="0"
              value={days}
              onChange={(e) => { setDays(e.target.value); setSaved(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') saveDays(); }}
              placeholder="0"
              className="w-full px-3 py-2 pr-16 border border-crm-border rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted pointer-events-none">or</span>
          </div>
          <button
            onClick={saveDays}
            disabled={!days || savingDays || saved === 'days'}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              saved === 'days'
                ? 'bg-success/10 text-success'
                : 'bg-primary text-white hover:bg-primary-hover disabled:opacity-40'
            }`}
          >
            {savingDays ? '...' : saved === 'days' ? 'Pahpanvec ✓' : 'Pahpanel'}
          </button>
        </div>
        {days && !isNaN(parseInt(days)) && (
          <p className="mt-2 text-xs text-text-muted">
            Orinak. Yntunman amsativ + <span className="font-semibold text-dark">{days} or</span> = deadline
          </p>
        )}
      </SettingRow>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = 'positions' | 'statuses' | 'tasks';

const TABS: { key: Tab; label: string }[] = [
  { key: 'positions', label: 'Պաշտոն' },
  { key: 'statuses',  label: 'Կատարման կարգավիճակներ' },
  { key: 'tasks',     label: 'Պատվերներ' },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab]           = useState<Tab>('positions');
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
      {/* Header + tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-dark">Կարգավորումներ</h1>
        <div className="flex gap-1 p-1 bg-white rounded-xl shadow-sm self-start sm:self-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-dark'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}z
      {tab === 'positions' ? (
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
          <PositionsPanel
            positions={positions}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreate={handleCreate}
            onDelete={handleDelete}
          />
          {selectedPosition ? (
            <AccessPanel position={selectedPosition} />
          ) : (
            <div className="flex-1 bg-white rounded-2xl shadow-sm flex items-center justify-center">
              <p className="text-sm text-text-muted">
                Ընտրեք Պաշտոն՝ Թույլատվություններն տալու համար
              </p>
            </div>
          )}
        </div>
      ) : tab === 'statuses' ? (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <StatusesPanel />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <TaskSettingsPanel />
        </div>
      )}
    </div>
  );
}
