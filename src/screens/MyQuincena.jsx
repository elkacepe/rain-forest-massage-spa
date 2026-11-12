import React from 'react';
import { therapistRow } from '../lib/engine.js';
import { quincenaLabel, quincenaOf } from '../lib/dates.js';
import { money } from '../lib/format.js';
import { Q_STATUS } from '../lib/constants.js';
import { Empty, QPill, Row, TierBadge } from '../ui.jsx';

export default function MyQuincena({ app }) {
  const { state, me, today, go } = app;
  const qid = quincenaOf(today);
  const row = therapistRow(state, qid, me.id);
  const r = row.rates;
  const progress = Math.min(1, row.ventas / r.tierThreshold);
  const q = state.quincenas[qid];

  // Recibos: todas las quincenas con algo para esta terapeuta.
  const mine = Object.keys(state.quincenas)
    .sort()
    .reverse()
    .map((id) => ({ id, row: therapistRow(state, id, me.id), q: state.quincenas[id] }))
    .filter((x) => x.row && (x.row.lines.length || x.row.adelantos || x.row.aDescontar));

  return (
    <div className="mx-auto max-w-xl">
      <p className="label mb-1">Hola, {me.short}</p>
      <h1 className="text-[34px] leading-[1.1]">
        Esta quincena llevás <span className="tabular whitespace-nowrap text-terracota">{money(row.neto)}</span>
      </h1>
      <p className="mt-2 text-[16px] text-noche/70">
        {quincenaLabel(qid)} · {q ? Q_STATUS[q.status] : 'Abierta'}
        {row.pendientes > 0 && ` · ${row.pendientes} ${row.pendientes === 1 ? 'sesión agendada' : 'sesiones agendadas'} por delante`}
      </p>

      <section className="card mt-6 px-5 py-5">
        <div className="flex items-baseline justify-between">
          <p className="label">Ventas para el escalón</p>
          {row.superoEscalon && <TierBadge />}
        </div>
        <p className="tabular mt-2 font-display text-[28px] leading-none">
          {money(row.ventas)} <span className="font-sans text-[16px] text-noche/60">de {money(r.tierThreshold)}</span>
        </p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-selva/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Avance hacia el escalón">
          <div className={`h-full rounded-full ${row.superoEscalon ? 'bg-oro' : 'bg-selva'}`} style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-3 text-[15px] text-noche/75">
          {row.superoEscalon
            ? `Pasaste el escalón: los ${money(row.excedente)} que superan ${money(r.tierThreshold)} pagan ${r.tierBonus} puntos más.`
            : `Te faltan ${money(r.tierThreshold - row.ventas)} en ventas para que lo que siga pague ${r.tierBonus} puntos más. Las propinas no cuentan.`}
        </p>
      </section>

      <section className="card mt-4 px-5 py-2">
        <Row label="Comisiones" value={money(row.comisiones)} />
        <Row label="Viáticos" value={money(row.viaticos)} />
        <Row label="Propinas" value={money(row.propinas)} />
        {row.adelantos > 0 && <Row label="Adelantos" value={`−${money(row.adelantos)}`} />}
        {row.aDescontar > 0 && <Row label="A descontar" value={`−${money(row.aDescontar)}`} />}
        <div className="border-t border-selva/10">
          <Row label="Neto hasta hoy" value={money(row.neto)} strong />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-[24px]">Mis recibos</h2>
        {mine.length === 0 ? (
          <Empty title="Todavía no hay recibos">Cuando tengas sesiones realizadas, tu recibo aparece acá.</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {mine.map(({ id, row: rw, q: qq }) => (
              <li key={id}>
                <button type="button" onClick={() => go('recibo', { qid: id })} className="card flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:border-selva/40">
                  <div>
                    <p className="text-[17px] font-semibold">{quincenaLabel(id)}</p>
                    <div className="mt-1"><QPill status={qq.status} /></div>
                  </div>
                  <p className="tabular font-display text-[26px] text-selva">{money(rw.neto)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
