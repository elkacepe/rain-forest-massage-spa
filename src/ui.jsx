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
