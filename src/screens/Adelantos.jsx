import React, { useState } from 'react';
import { addAdvance, deleteAdvance } from '../lib/store.js';
import { advanceCheck, isLocked } from '../lib/engine.js';
import { quincenaOf, quincenaLabel, dateLabel } from '../lib/dates.js';
import { therapistById } from '../lib/config.js';
import { money } from '../lib/format.js';
import { Button, Empty, ErrorBox, Field, PageTitle, Row, Sheet } from '../ui.jsx';

export default function Adelantos({ app }) {
  const { state, today, commit } = app;
  const [f, setF] = useState({ therapistId: state.therapists[0]?.id || '', date: today, amount: '', reason: '' });
  const [errors, setErrors] = useState(null);
  const [del, setDel] = useState(null);
  const set = (p) => {
    setF((x) => ({ ...x, ...p }));
    setErrors(null);
  };

  const chk = f.therapistId && f.date ? advanceCheck(state, f.therapistId, f.date, Number(f.amount) || 0.01) : null;
  const qid = f.date ? quincenaOf(f.date) : null;

  const submit = (e) => {
    e.preventDefault();
    const out = commit(addAdvance(state, { ...f, amount: Number(f.amount) }), 'Adelanto registrado.');
    if (!out.ok) return setErrors(out.errors.map((x) => `Rechazado: ${x}`));
    setF((x) => ({ ...x, amount: '', reason: '' }));
  };

  const list = [...state.advances].sort((a, b) => (b.date + b.code).localeCompare(a.date + a.code));

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle eyebrow="Dirección" title="Adelantos" />

      <form onSubmit={submit} className="card flex flex-col gap-5 px-5 py-5">
        <Field label="Terapeuta">
          <select className="field" value={f.therapistId} onChange={(e) => set({ therapistId: e.target.value })}>
            {state.therapists.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha"><input type="date" className="field" value={f.date} onChange={(e) => set({ date: e.target.value })} /></Field>
          <Field label="Monto"><input className="field tabular" inputMode="decimal" placeholder="0" value={f.amount} onChange={(e) => set({ amount: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
        </div>
        <Field label="Motivo">
          <input className="field" value={f.reason} onChange={(e) => set({ reason: e.target.value })} placeholder="Ej.: pedido por WhatsApp" />
        </Field>

        {chk && (
          <div className="rounded-xl bg-arena px-4 py-2">
            <Row label={`Ganado en ${quincenaLabel(qid)}`} value={money(chk.ganado)} />
            <Row label={`Tope ${chk.pct} %`} value={money(chk.tope)} />
            <Row label="Adelantos ya registrados" value={`−${money(chk.yaRegistrados)}`} />
            <div className="border-t border-selva/10"><Row label="Disponible para adelantar" value={money(chk.disponible)} strong /></div>
          </div>
        )}
        <p className="text-[14px] text-noche/60">Se descuenta solo en la liquidación de esa quincena. Si supera el neto, el saldo pasa a la siguiente como «A descontar».</p>

        <ErrorBox errors={errors} />
        <Button type="submit">Registrar adelanto</Button>
      </form>

      <section className="mt-10">
        <h2 className="mb-3 text-[24px]">Registrados</h2>
        {list.length === 0 ? (
          <Empty title="Sin adelantos">Ninguna terapeuta pidió adelantos todavía.</Empty>
        ) : (
          <ul className="card divide-y divide-selva/10">
            {list.map((a) => {
              const locked = isLocked(state, quincenaOf(a.date));
              return (
                <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-4">
                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold">{therapistById(state, a.therapistId)?.name}</p>
                    <p className="text-[14px] text-noche/70">{dateLabel(a.date)} · {a.code} · {a.reason}</p>
                    {!locked && (
                      <button type="button" onClick={() => setDel(a)} className="mt-1 min-h-[36px] text-[14px] font-semibold text-[#9A4520] underline-offset-2 hover:underline">Anular</button>
                    )}
                  </div>
                  <p className="tabular shrink-0 text-[18px] font-semibold">{money(a.amount)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Sheet open={!!del} title="¿Anular el adelanto?" onClose={() => setDel(null)}>
        {del && <p className="text-[16px] text-noche/80">{del.code} de {money(del.amount)} para {therapistById(state, del.therapistId)?.name}. Deja de descontarse en la liquidación.</p>}
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="terracota" onClick={() => { const out = commit(deleteAdvance(state, del.id), 'Adelanto anulado.'); if (!out.ok) setErrors(out.errors); setDel(null); }}>Anular</Button>
          <Button variant="secondary" onClick={() => setDel(null)}>Volver</Button>
        </div>
      </Sheet>
    </div>
  );
}
