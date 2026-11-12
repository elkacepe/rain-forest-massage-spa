import React, { useEffect } from 'react';
import { STATUS, Q_STATUS } from './lib/constants.js';
import { money } from './lib/format.js';

export function Button({ variant = 'primary', size = 'md', className = '', ...p }) {
  const v = {
    primary: 'bg-selva text-white hover:bg-noche disabled:bg-selva/40',
    secondary: 'bg-white text-selva border border-selva/25 hover:border-selva disabled:opacity-50',
    terracota: 'bg-terracota text-white font-bold hover:brightness-95 disabled:opacity-50',
    ghost: 'text-selva hover:bg-selva/5 disabled:opacity-40',
    danger: 'bg-white text-[#9A4520] border border-terracota/50 hover:border-terracota',
  }[variant];
  const s = { md: 'min-h-[48px] px-5 text-[16px]', sm: 'min-h-[40px] px-3.5 text-[15px]' }[size];
  return <button type="button" className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition ${v} ${s} ${className}`} {...p} />;
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[14px] text-noche/60">{hint}</span>}
    </label>
  );
}

export function Segmented({ value, onChange, options, name }) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-1 rounded-xl bg-selva/[0.06] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`min-h-[44px] rounded-lg px-2 text-[15px] font-semibold transition ${value === o.value ? 'bg-white text-selva shadow-sm' : 'text-noche/70 hover:text-selva'} disabled:opacity-40`}
        >
          {o.label}
          {o.sub && <span className="block text-[12px] font-normal text-noche/60">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

const STATUS_STYLE = {
  agendada: 'bg-salvia/25 text-noche',
  realizada: 'bg-selva text-white',
  cancelada_a_tiempo: 'bg-white text-noche/70 border border-noche/20',
  cancelada_con_cargo: 'bg-terracota/15 text-[#8A3D17]',
  no_show: 'bg-oro/25 text-noche',
};
export function StatusPill({ status }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${STATUS_STYLE[status]}`}>{STATUS[status]}</span>;
}

const Q_STYLE = {
  abierta: 'bg-salvia/25 text-noche',
  en_revision: 'bg-oro/30 text-noche',
  aprobada: 'bg-selva text-white',
  pagada: 'bg-noche text-white',
};
export function QPill({ status }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${Q_STYLE[status]}`}>{Q_STATUS[status]}</span>;
}

export function TierBadge() {
  return <span className="inline-flex items-center whitespace-nowrap rounded-full bg-oro px-2 py-0.5 text-[12px] font-bold text-noche">Superó escalón</span>;
}

export function Money({ value, className = '' }) {
  return <span className={`tabular ${className}`}>{money(value)}</span>;
}

export function ErrorBox({ errors }) {
  if (!errors || !errors.length) return null;
  return (
    <div role="alert" className="rounded-xl border border-terracota/40 bg-terracota/10 px-4 py-3 text-[15px] text-[#7A3413]">
      {errors.map((e, i) => (
        <p key={i} className={i ? 'mt-1' : ''}>{e}</p>
      ))}
    </div>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div aria-hidden className="mb-4 h-1 w-12 rounded-full bg-oro" />
      <h3 className="text-[24px] leading-tight text-selva">{title}</h3>
      {children && <p className="mt-2 max-w-xs text-[16px] text-noche/70">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Sheet({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-noche/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-arena p-5 pb-8 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-[26px] leading-tight">{title}</h2>
          <button type="button" onClick={onClose} className="-mr-2 min-h-[44px] min-w-[44px] rounded-full text-[15px] font-semibold text-noche/60 hover:text-selva" aria-label="Cerrar">
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4" role="status" aria-live="polite">
      <div className={`rounded-xl px-4 py-3 text-[15px] font-semibold shadow-lg ${toast.kind === 'error' ? 'bg-terracota text-white' : 'bg-noche text-white'}`}>{toast.text}</div>
    </div>
  );
}

export function PageTitle({ eyebrow, title, right }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="label mb-1">{eyebrow}</p>}
        <h1 className="text-[32px] leading-[1.05] text-selva">{title}</h1>
      </div>
      {right}
    </div>
  );
}

export function Row({ label, value, strong, muted }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2.5 ${muted ? 'text-noche/60' : ''}`}>
      <span className={`text-[16px] ${strong ? 'font-semibold' : ''}`}>{label}</span>
      <span className={`tabular text-right text-[16px] ${strong ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}

export function BackLink({ onClick, children = 'Volver' }) {
  return (
    <button type="button" onClick={onClick} className="-ml-2 mb-3 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-[15px] font-semibold text-noche/70 hover:text-selva">
      <span aria-hidden>←</span> {children}
    </button>
  );
}

export function QuincenaSelect({ value, options, onChange, labelOf }) {
  return (
    <select className="field !py-2.5 font-semibold" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Quincena">
      {options.map((q) => (
        <option key={q} value={q}>
          {labelOf(q)}
        </option>
      ))}
    </select>
  );
}

// ---------- Íconos (trazo simple, sin imaginería de spa) ----------

const Svg = ({ children, className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);
export const ChevronLeft = (p) => <Svg {...p}><path d="M15 18l-6-6 6-6" /></Svg>;
export const ChevronRight = (p) => <Svg {...p}><path d="M9 18l6-6-6-6" /></Svg>;
export const CalendarIcon = (p) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Svg>;
export const CheckIcon = (p) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;

/** Avatar genérico, igual para todas las terapeutas. */
export function Avatar({ size = 40, active = false }) {
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full ${active ? 'bg-white/15 text-white' : 'bg-salvia/30 text-selva'}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" style={{ width: size * 0.55, height: size * 0.55 }}>
        <circle cx="12" cy="8.5" r="3.6" />
        <path d="M4.8 19.5c1.3-3.4 4-5.2 7.2-5.2s5.9 1.8 7.2 5.2" />
      </svg>
    </span>
  );
}

// ---------- Selector de fecha propio ----------

const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORTO = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const p2 = (n) => String(n).padStart(2, '0');
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };

export function longDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS_LARGO[dt.getDay()]} ${d} de ${MESES_LARGO[m - 1]} ${y}`;
}

/** Calendario mensual. `marks`: Set de fechas ISO con un punto (por ejemplo, días con sesiones). */
export function Calendar({ value, onChange, marks }) {
  const [view, setView] = React.useState(value.slice(0, 7));
  const [mode, setMode] = React.useState('days'); // 'days' | 'months'
  React.useEffect(() => setView(value.slice(0, 7)), [value]);
  const [y, m] = view.split('-').map(Number);
  const first = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lunes = 0
  const days = new Date(y, m, 0).getDate();
  const today = isoToday();
  const shift = (n) => { const d = new Date(y, m - 1 + n, 1); setView(`${d.getFullYear()}-${p2(d.getMonth() + 1)}`); };
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => `${view}-${p2(i + 1)}`)];
  const navBtn = 'flex h-11 w-11 items-center justify-center rounded-full text-selva hover:bg-selva/5';
  const valueYM = value.slice(0, 7);
  const todayYM = today.slice(0, 7);

  if (mode === 'months') {
    // Vista de año: flechas cambian de año y se elige el mes.
    return (
      <div className="select-none">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => shift(-12)} aria-label="Año anterior" className={navBtn}><ChevronLeft /></button>
          <button type="button" onClick={() => setMode('days')} className="tabular min-h-[44px] rounded-full px-4 font-display text-[22px] text-selva hover:bg-selva/5" aria-label="Volver a los días">{y}</button>
          <button type="button" onClick={() => shift(12)} aria-label="Año siguiente" className={navBtn}><ChevronRight /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MESES_LARGO.map((name, i) => {
            const ym = `${y}-${p2(i + 1)}`;
            const sel = ym === valueYM;
            const hasMark = marks && [...marks].some((d) => d.startsWith(ym));
            return (
              <button key={ym} type="button" onClick={() => { setView(ym); setMode('days'); }} aria-pressed={sel} className={`relative min-h-[48px] rounded-xl text-[15px] font-semibold capitalize transition ${sel ? 'bg-selva text-white' : ym === todayYM ? 'text-terracota ring-1 ring-terracota' : 'bg-arena/70 text-noche hover:bg-selva/5'}`}>
                {name.slice(0, 3)}
                {hasMark && <span className={`absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${sel ? 'bg-oro' : 'bg-terracota'}`} />}
              </button>
            );
          })}
        </div>
        {y !== Number(today.slice(0, 4)) && (
          <div className="mt-3 text-center">
            <button type="button" onClick={() => { setView(todayYM); setMode('days'); }} className="min-h-[40px] rounded-full px-4 text-[14px] font-semibold text-selva hover:bg-selva/5">Volver a {today.slice(0, 4)}</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="Mes anterior" className={navBtn}><ChevronLeft /></button>
        <button type="button" onClick={() => setMode('months')} aria-label={`Cambiar mes o año (${MESES_LARGO[m - 1]} ${y})`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 font-display text-[20px] capitalize text-selva hover:bg-selva/5">
          {MESES_LARGO[m - 1]} <span className="tabular">{y}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-noche/50" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <button type="button" onClick={() => shift(1)} aria-label="Mes siguiente" className={navBtn}><ChevronRight /></button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {DIAS_CORTO.map((d) => <span key={d} className="pb-1 text-[12px] font-semibold text-noche/50">{d}</span>)}
        {cells.map((iso, i) =>
          iso ? (
            <button
              key={iso}
              type="button"
              onClick={() => onChange(iso)}
              aria-pressed={iso === value}
              aria-label={longDate(iso)}
              className={`tabular relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold transition ${iso === value ? 'bg-selva text-white' : iso === today ? 'text-terracota ring-1 ring-terracota' : 'text-noche hover:bg-selva/5'}`}
            >
              {Number(iso.slice(8))}
              {marks?.has(iso) && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${iso === value ? 'bg-oro' : 'bg-terracota'}`} />}
            </button>
          ) : (
            <span key={`e${i}`} />
          ),
        )}
      </div>
      {value !== today && (
        <div className="mt-2 text-center">
          <button type="button" onClick={() => onChange(today)} className="min-h-[40px] rounded-full px-4 text-[14px] font-semibold text-selva hover:bg-selva/5">Ir a hoy</button>
        </div>
      )}
    </div>
  );
}

/** Campo de fecha: botón con la fecha legible que despliega el calendario debajo. */
export function DateField({ label, value, onChange, hint, marks }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      {label && <span className="label mb-1.5 block">{label}</span>}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`field flex items-center justify-between gap-3 text-left ${open ? '!border-selva' : ''}`}>
        <span className="first-letter:uppercase">{value ? longDate(value) : 'Elegí una fecha'}</span>
        <CalendarIcon className="h-5 w-5 shrink-0 text-selva" />
      </button>
      {open && (
        <div className="mt-2 rounded-2xl border border-selva/10 bg-white p-3">
          <Calendar value={value} marks={marks} onChange={(d) => { onChange(d); setOpen(false); }} />
        </div>
      )}
      {hint && <span className="mt-1.5 block text-[14px] text-noche/60">{hint}</span>}
    </div>
  );
}
