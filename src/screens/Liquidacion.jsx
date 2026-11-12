import React, { useState } from 'react';
import { liquidationRows, totalsOf, hasSnapshot } from '../lib/engine.js';
import { setQuincenaStatus } from '../lib/store.js';
import { quincenaLabel, quincenaOf, dateLabel, prevQuincena } from '../lib/dates.js';
import { therapistById } from '../lib/config.js';
import { money } from '../lib/format.js';
import { quincenaOptions } from '../App.jsx';
import { Button, DateField, Empty, ErrorBox, PageTitle, QPill, QuincenaSelect, Sheet, TierBadge } from '../ui.jsx';

const STEPS = ['abierta', 'en_revision', 'aprobada', 'pagada'];
const STEP_LABEL = { abierta: 'Abierta', en_revision: 'En revisión', aprobada: 'Aprobada', pagada: 'Pagada' };

function defaultQ(state, today) {
  // La más vieja que todavía no está pagada; si no hay, la de hoy.
  const open = Object.values(state.quincenas).filter((q) => q.status !== 'pagada').map((q) => q.id).sort();
  return open[0] || quincenaOf(today);
}

export default function Liquidacion({ app }) {
  const { state, today, go, commit } = app;
  const [qid, setQid] = useState(app.params.qid || defaultQ(state, today));
  const [errors, setErrors] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payDate, setPayDate] = useState(today);

  const q = state.quincenas[qid];
  const status = q?.status || 'abierta';
  const rows = liquidationRows(state, qid);
  const totals = totalsOf(rows);
  const pendientes = rows.reduce((a, r) => a + (r.pendientes || 0), 0);
  const hasData = rows.some((r) => r.lines.length || r.adelantos || r.aDescontar);
  const nameOf = (tid) => (hasSnapshot(state, qid) && q.snapshot.therapistNames?.[tid]) || therapistById(state, tid)?.name || tid;

  const move = (to, extra) => {
    if (!q) return setErrors(['Esta quincena todavía no tiene registros.']);
    const msg = { en_revision: 'Quincena en revisión: la carga de sesiones quedó cerrada.', abierta: 'Quincena reabierta.', aprobada: 'Quincena aprobada: los montos quedaron congelados.', pagada: 'Quincena marcada como pagada.' }[to];
    const out = commit(setQuincenaStatus(state, qid, to, extra), msg);
    setErrors(out.ok ? null : out.errors);
    if (out.ok) setPayOpen(false);
    return out;
  };

  return (
    <div>
      <PageTitle eyebrow="Dirección" title="Liquidación" />

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <QuincenaSelect value={qid} options={quincenaOptions(state, today)} onChange={(v) => { setQid(v); setErrors(null); }} labelOf={(id) => `Quincena ${quincenaLabel(id)}`} />
      </div>

      {/* Estado de la quincena */}
      <ol className="mb-5 grid grid-cols-4 gap-1" aria-label="Estado de la quincena">
        {STEPS.map((st, i) => {
          const reached = STEPS.indexOf(status) >= i;
          return (
            <li key={st} className="flex flex-col gap-1.5">
              <span className={`h-1.5 rounded-full ${reached ? (st === status ? 'bg-terracota' : 'bg-selva') : 'bg-selva/10'}`} />
              <span className={`text-[12px] font-semibold leading-tight ${st === status ? 'text-selva' : 'text-noche/50'}`}>{STEP_LABEL[st]}</span>
            </li>
          );
        })}
      </ol>

      {hasData && (
        <div className="mb-6 flex flex-col gap-3">
          {status === 'abierta' && (
            <>
              {pendientes > 0 && <p className="rounded-xl bg-oro/20 px-4 py-3 text-[15px]">Hay {pendientes} {pendientes === 1 ? 'sesión Agendada' : 'sesiones Agendadas'} sin cerrar. No suman hasta que recepción las marque.</p>}
              <Button onClick={() => move('en_revision')}>Pasar a revisión</Button>
              <p className="text-[14px] text-noche/60">Al pasar a revisión ya no se pueden cargar ni modificar sesiones de esta quincena.</p>
            </>
          )}
          {status === 'en_revision' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => move('aprobada')}>Aprobar quincena</Button>
              <Button variant="secondary" onClick={() => move('abierta')}>Reabrir para corregir</Button>
            </div>
          )}
          {status === 'aprobada' && <Button variant="terracota" onClick={() => setPayOpen(true)}>Marcar como pagada</Button>}
          {hasSnapshot(state, qid) && (
            <p className="text-[14px] text-noche/60">
              Montos congelados el {new Date(q.snapshot.takenAt).toLocaleDateString('es-AR')}: aunque cambien las tarifas, esta quincena no se mueve.
              {q.paymentDate && ` Pagada el ${dateLabel(q.paymentDate)}.`}
            </p>
          )}
          <ErrorBox errors={errors} />
        </div>
      )}

      {!hasData ? (
        <Empty title="Quincena sin movimientos">Cuando recepción cargue sesiones con fecha en {quincenaLabel(qid)}, la liquidación se arma sola.</Empty>
      ) : (
        <>
          {/* Total */}
          <section className="mb-6 flex items-end justify-between gap-4 rounded-2xl bg-selva px-5 py-5 text-white">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/70">Total a pagar</p>
              <p className="mt-1 text-[14px] text-white/75">Ventas {money(totals.ventas)}</p>
            </div>
            <p className="tabular font-display text-[38px] leading-none">{money(totals.neto)}</p>
          </section>

          {/* Móvil */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {rows.map((r) => (
              <li key={r.therapistId}>
                <button type="button" onClick={() => go('recibo', { qid, therapistId: r.therapistId })} className="card flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:border-selva/40">
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold text-selva">{nameOf(r.therapistId)}</p>
                    {r.superoEscalon && <div className="mt-1"><TierBadge /></div>}
                    <dl className="tabular mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[13px] text-noche/70">
                      <dt>Ventas</dt><dd className="text-right">{money(r.ventas)}</dd>
                      <dt>Comisiones</dt><dd className="text-right">{money(r.comisiones)}</dd>
                      <dt>Viáticos</dt><dd className="text-right">{money(r.viaticos)}</dd>
                      <dt>Propinas</dt><dd className="text-right">{money(r.propinas)}</dd>
                      {(r.adelantos > 0 || r.aDescontar > 0) && (<><dt>Adelantos</dt><dd className="text-right">−{money(r.adelantos + r.aDescontar)}</dd></>)}
                    </dl>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="label !text-[11px]">Neto</p>
                    <p className={`tabular font-display text-[28px] leading-none ${r.neto < 0 ? 'text-terracota' : 'text-selva'}`}>{money(r.neto)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* Escritorio */}
          <div className="hidden overflow-x-auto rounded-2xl border border-selva/10 bg-white lg:block">
            <table className="w-full">
              <thead className="bg-selva/[0.04]">
                <tr className="label text-left">
                  <th className="py-3 pl-5 pr-4">Terapeuta</th>
                  <th className="px-4 py-3 text-right">Ventas</th>
                  <th className="px-4 py-3 text-right">Comisiones</th>
                  <th className="px-4 py-3 text-right">Viáticos</th>
                  <th className="px-4 py-3 text-right">Propinas</th>
                  <th className="px-4 py-3 text-right">Adelantos</th>
                  <th className="py-3 pl-4 pr-5 text-right">Neto</th>
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-selva/10 text-[15px]">
                {rows.map((r) => (
                  <tr key={r.therapistId} className="cursor-pointer hover:bg-arena/60" onClick={() => go('recibo', { qid, therapistId: r.therapistId })}>
                    <td className="py-4 pl-5 pr-4">
                      <span className="font-semibold text-selva">{nameOf(r.therapistId)}</span>
                      {r.superoEscalon && <span className="ml-2"><TierBadge /></span>}
                    </td>
                    <td className="px-4 py-4 text-right">{money(r.ventas)}</td>
                    <td className="px-4 py-4 text-right">{money(r.comisiones)}</td>
                    <td className="px-4 py-4 text-right">{money(r.viaticos)}</td>
                    <td className="px-4 py-4 text-right">{money(r.propinas)}</td>
                    <td className="px-4 py-4 text-right">{r.adelantos + r.aDescontar ? `−${money(r.adelantos + r.aDescontar)}` : '—'}</td>
                    <td className={`py-4 pl-4 pr-5 text-right font-display text-[26px] ${r.neto < 0 ? 'text-terracota' : 'text-selva'}`}>{money(r.neto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="tabular border-t-2 border-selva/20 text-[15px] font-semibold">
                <tr>
                  <td className="py-4 pl-5 pr-4">Total</td>
                  <td className="px-4 py-4 text-right">{money(totals.ventas)}</td>
                  <td className="px-4 py-4 text-right">{money(totals.comisiones)}</td>
                  <td className="px-4 py-4 text-right">{money(totals.viaticos)}</td>
                  <td className="px-4 py-4 text-right">{money(totals.propinas)}</td>
                  <td className="px-4 py-4 text-right">−{money(totals.adelantos + totals.aDescontar)}</td>
                  <td className="py-4 pl-4 pr-5 text-right font-display text-[28px] font-normal">{money(totals.neto)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-3 text-[14px] text-noche/60">Tocá una terapeuta para ver el detalle sesión por sesión y compartir su recibo.</p>
        </>
      )}

      <Sheet open={payOpen} title="Marcar como pagada" onClose={() => setPayOpen(false)}>
        <DateField label="Fecha de pago" value={payDate} onChange={setPayDate} hint="Obligatoria. Queda registrada en cada recibo." />
        <Button className="mt-5 w-full" onClick={() => move('pagada', { paymentDate: payDate })}>Confirmar pago</Button>
        <div className="mt-3"><ErrorBox errors={errors} /></div>
      </Sheet>
    </div>
  );
}
