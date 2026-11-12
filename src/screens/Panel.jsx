import React, { useState } from 'react';
import { metrics, hasSnapshot } from '../lib/engine.js';
import { quincenaLabel, quincenaOf } from '../lib/dates.js';
import { therapistById } from '../lib/config.js';
import { money, pct } from '../lib/format.js';
import { quincenaOptions } from '../App.jsx';
import { Empty, PageTitle, QuincenaSelect, TierBadge } from '../ui.jsx';

function Tile({ label, value, note, strong }) {
  return (
    <div className={`rounded-2xl px-4 py-4 ${strong ? 'bg-selva text-white' : 'card'}`}>
      <p className={`text-[12px] font-semibold uppercase tracking-[0.08em] ${strong ? 'text-white/70' : 'text-noche/70'}`}>{label}</p>
      <p className="tabular mt-2 font-display text-[28px] leading-none">{value}</p>
      {note && <p className={`mt-2 text-[13px] leading-snug ${strong ? 'text-white/70' : 'text-noche/60'}`}>{note}</p>}
    </div>
  );
}

export default function Panel({ app }) {
  const { state, today, go } = app;
  const [qid, setQid] = useState(quincenaOf(today));
  const m = metrics(state, qid, today);
  const nameOf = (tid) => (hasSnapshot(state, qid) && state.quincenas[qid].snapshot.therapistNames?.[tid]) || therapistById(state, tid)?.name || tid;
  const maxV = Math.max(1, ...m.ranking.map((r) => r.ventas));
  const empty = m.realizadas === 0 && m.cerradas === 0;

  return (
    <div>
      <PageTitle eyebrow="Dirección" title="Panel" />
      <div className="mb-6 max-w-md">
        <QuincenaSelect value={qid} options={quincenaOptions(state, today)} onChange={setQid} labelOf={(id) => `Quincena ${quincenaLabel(id)}`} />
      </div>

      {empty ? (
        <Empty title="Sin datos todavía">Las métricas aparecen cuando hay sesiones realizadas o canceladas en la quincena.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Tile strong label="Ingresos" value={money(m.ingresos)} note={`Sesiones ${money(m.ventas)} + cargos ${money(m.cargosCliente)}`} />
            <Tile label="A pagar" value={money(m.totalAPagar)} note="Neto de todas las terapeutas" />
            <Tile label="En comisiones" value={pct(m.pctComisiones, 1)} note={`${money(m.comisiones)} de los ingresos`} />
            <Tile label="Ticket promedio" value={money(Math.round(m.ticket))} note={`${m.realizadas} sesiones realizadas`} />
            <Tile label="Ocupación cabinas" value={pct(m.ocupacion, 0)} note={`${m.ocupados.toLocaleString('en-US')} de ${m.disponibles.toLocaleString('en-US')} min`} />
            <Tile label="Cancelaciones" value={pct(m.pctCancelaciones, 1)} note={`${m.canceladas} de ${m.cerradas} sesiones cerradas`} />
          </div>

          <section className="mt-10">
            <h2 className="mb-1 text-[24px]">Ranking por terapeuta</h2>
            <p className="mb-4 text-[15px] text-noche/60">Ordenado por ventas realizadas. El neto incluye viáticos y propinas, menos adelantos.</p>
            <ol className="card divide-y divide-selva/10">
              {m.ranking.map((r, i) => (
                <li key={r.therapistId}>
                  <button type="button" onClick={() => go('recibo', { qid, therapistId: r.therapistId })} className="w-full px-4 py-4 text-left hover:bg-arena/50">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 text-[16px] font-semibold text-selva">
                        <span className="tabular mr-2 text-noche/50">{i + 1}</span>
                        {nameOf(r.therapistId)}
                      </p>
                      <p className="tabular shrink-0 text-[16px] font-semibold">{money(r.ventas)}</p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-selva/10">
                      <div className={`h-full rounded-full ${r.superoEscalon ? 'bg-oro' : 'bg-salvia'}`} style={{ width: `${(r.ventas / maxV) * 100}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[14px] text-noche/70">
                      <span>{r.sesiones} sesiones {r.superoEscalon && <span className="ml-1"><TierBadge /></span>}</span>
                      <span className="tabular">Neto {money(r.neto)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          </section>
          <p className="mt-6 text-[13px] text-noche/50">Ocupación: minutos de sesiones realizadas en cabina (duración + {state.config.prepMinutes} min de preparación) sobre los minutos de apertura de las {state.config.cabins.length} cabinas, desde el inicio de la quincena hasta hoy. Cancelaciones: canceladas y ausencias sobre sesiones ya cerradas.</p>
        </>
      )}
    </div>
  );
}
