import React from 'react';
import { therapistRow, hasSnapshot } from '../lib/engine.js';
import { quincenaLabel, dateLabel } from '../lib/dates.js';
import { massageById, therapistById, cabinById, coloniaById } from '../lib/config.js';
import { STATUS, Q_STATUS } from '../lib/constants.js';
import { money } from '../lib/format.js';
import { BackLink, Button, Empty, QPill, Row, TierBadge } from '../ui.jsx';

export function receiptText(state, qid, row, name) {
  const q = state.quincenas[qid];
  const status = q ? Q_STATUS[q.status] : 'Abierta';
  const realizadas = row.lines.filter((l) => l.status === 'realizada').length;
  const out = [
    '*Rain Forest Massage Spa*',
    `Recibo de liquidación · ${quincenaLabel(qid)}`,
    `Terapeuta: ${name}`,
    `Estado: ${status}${q?.paymentDate ? ` · pagado el ${dateLabel(q.paymentDate, { withWeekday: false })}` : ''}`,
    '',
    `Sesiones realizadas: ${realizadas} · Ventas: ${money(row.ventas)}`,
    `Comisiones: ${money(row.comisiones)}${row.comisionEscalon ? ` (incluye ${money(row.comisionEscalon)} por escalón)` : ''}`,
  ];
  if (row.pagoCancelaciones) out.push(`  de ellas, por cancelaciones: ${money(row.pagoCancelaciones)}`);
  out.push(`Viáticos: ${money(row.viaticos)}`, `Propinas: ${money(row.propinas)}`);
  if (row.adelantos) out.push(`Adelantos: −${money(row.adelantos)}`);
  if (row.aDescontar) out.push(`A descontar (quincena anterior): −${money(row.aDescontar)}`);
  out.push('', `*Neto a cobrar: ${money(row.neto)}*`);
  if (row.neto < 0) out.push('El saldo negativo pasa a la próxima quincena como «A descontar».');
  if (!q || q.status === 'abierta' || q.status === 'en_revision') out.push('', '_Montos provisorios hasta la aprobación._');
  return out.join('\n');
}

export default function Recibo({ app }) {
  const { state, role, me, back } = app;
  const { qid, therapistId } = app.params;
  const tid = role === 'terapeuta' ? me.id : therapistId;
  if (role === 'terapeuta' && therapistId && therapistId !== me.id) {
    return (
      <div>
        <BackLink onClick={back} />
        <Empty title="Recibo no disponible">Solo podés ver tus propios recibos.</Empty>
      </div>
    );
  }
  const row = therapistRow(state, qid, tid);
  const q = state.quincenas[qid];
  const name = (hasSnapshot(state, qid) && q.snapshot.therapistNames?.[tid]) || therapistById(state, tid)?.name || '—';
  if (!row) return <Empty title="Sin datos">No hay liquidación para esta terapeuta en la quincena.</Empty>;

  const text = receiptText(state, qid, row, name);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      app.toast({ kind: 'ok', text: 'Texto del recibo copiado.' });
    } catch {
      app.toast({ kind: 'error', text: 'El navegador no dejó copiar el texto.' });
    }
  };
  const lines = row.lines.filter((l) => l.status !== 'agendada');
  const frozen = hasSnapshot(state, qid);

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink onClick={back} />

      <article className="card overflow-hidden">
        <header className="border-b border-selva/10 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label">Recibo de liquidación</p>
              <h1 className="mt-1 text-[30px] leading-tight">{name}</h1>
              <p className="mt-1 text-[16px] text-noche/70">Quincena {quincenaLabel(qid)}</p>
            </div>
            <QPill status={q?.status || 'abierta'} />
          </div>
          {row.superoEscalon && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-[15px] text-noche/80">
              <TierBadge /> Pasó {money(row.rates.tierThreshold)} en ventas: los {money(row.excedente)} de excedente pagan {row.rates.tierBonus} puntos más.
            </p>
          )}
          {frozen && <p className="mt-3 text-[14px] text-noche/60">Montos congelados al aprobar{q.paymentDate ? ` · pagado el ${dateLabel(q.paymentDate)}` : ''}.</p>}
          {!frozen && <p className="mt-3 text-[14px] text-noche/60">Provisorio: puede cambiar hasta que Dirección apruebe la quincena.</p>}
        </header>

        <section className="px-5 py-3">
          <Row label={`Ventas realizadas (${row.lines.filter((l) => l.status === 'realizada').length})`} value={money(row.ventas)} muted />
          <Row label="Comisión base" value={money(row.comisionBase)} />
          {row.comisionEscalon > 0 && <Row label={`Extra por escalón (+${row.rates.tierBonus} pts)`} value={money(row.comisionEscalon)} />}
          {row.pagoCancelaciones > 0 && <Row label={`Cancelaciones tardías y ausencias (${row.rates.cancelTherapistPct} %)`} value={money(row.pagoCancelaciones)} />}
          <Row label="Viáticos" value={money(row.viaticos)} />
          <Row label="Propinas" value={money(row.propinas)} />
          {row.adelantos > 0 && <Row label="Adelantos" value={`−${money(row.adelantos)}`} />}
          {row.aDescontar > 0 && <Row label="A descontar (quincena anterior)" value={`−${money(row.aDescontar)}`} />}
        </section>

        <div className="flex items-end justify-between gap-4 bg-selva px-5 py-5 text-white">
          <p className="text-[15px] font-semibold uppercase tracking-[0.08em] text-white/75">Neto a cobrar</p>
          <p className={`tabular font-display text-[40px] leading-none ${row.neto < 0 ? 'text-oro' : ''}`}>{money(row.neto)}</p>
        </div>
        {row.neto < 0 && <p className="bg-oro/20 px-5 py-3 text-[15px]">El saldo negativo pasa a la próxima quincena como «A descontar».</p>}
      </article>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-terracota px-5 text-[16px] font-bold text-white hover:brightness-95">Compartir por WhatsApp</a>
        <Button variant="secondary" className="flex-1" onClick={copy}>Copiar texto</Button>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-[24px]">Sesión por sesión</h2>
        {lines.length === 0 ? (
          <Empty title="Sin sesiones cerradas">Todavía no hay sesiones realizadas ni canceladas en esta quincena.</Empty>
        ) : (
          <>
            {/* Móvil: tarjetas compactas */}
            <ul className="flex flex-col divide-y divide-selva/10 rounded-2xl border border-selva/10 bg-white md:hidden">
              {lines.map((l) => (
                <li key={l.sessionId} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">{dateLabel(l.date)} · {l.time}</p>
                    <p className="truncate text-[14px] text-noche/70">{massageById(state.config, l.massageId)?.name ?? l.massageId} {l.duration}′ · {place(state, l)}</p>
                    <p className="text-[13px] text-noche/60">{lineDetail(l, row.rates.tierBonus)}</p>
                  </div>
                  <p className="tabular shrink-0 text-right text-[17px] font-semibold">{money(l.subtotal)}</p>
                </li>
              ))}
            </ul>
            {/* Escritorio: tabla */}
            <div className="hidden overflow-hidden rounded-2xl border border-selva/10 bg-white md:block">
              <table className="w-full text-[15px]">
                <thead className="bg-selva/[0.04] text-left">
                  <tr className="label">
                    <th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Sesión</th><th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Tarifa</th><th className="px-4 py-3 text-right">Comisión</th><th className="px-4 py-3 text-right">Viático</th><th className="px-4 py-3 text-right">Propina</th><th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="tabular divide-y divide-selva/10">
                  {lines.map((l) => (
                    <tr key={l.sessionId}>
                      <td className="px-4 py-3 whitespace-nowrap">{dateLabel(l.date)} {l.time}</td>
                      <td className="px-4 py-3">{massageById(state.config, l.massageId)?.name ?? l.massageId} {l.duration}′<span className="block text-[13px] text-noche/60">{place(state, l)}</span></td>
                      <td className="px-4 py-3 text-[14px]">{STATUS[l.status]}</td>
                      <td className="px-4 py-3 text-right">{money(l.price)}</td>
                      <td className="px-4 py-3 text-right">{money(l.comision + l.pagoCancelacion)}<span className="block text-[12px] text-noche/60">{rateLabel(l, row.rates.tierBonus)}</span></td>
                      <td className="px-4 py-3 text-right">{l.viatico ? money(l.viatico) : '—'}</td>
                      <td className="px-4 py-3 text-right">{l.propina ? money(l.propina) : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(l.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {row.advances.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[24px]">Adelantos</h2>
          <ul className="card divide-y divide-selva/10">
            {row.advances.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[15px] font-semibold">{dateLabel(a.date)} · {a.code}</p>
                  <p className="text-[14px] text-noche/70">{a.reason}</p>
                </div>
                <p className="tabular text-[17px] font-semibold">−{money(a.amount)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {role === 'direccion' && <p className="mt-8 text-[13px] text-noche/50">El neto de este recibo sale del mismo cálculo que la fila de la liquidación.</p>}
    </div>
  );
}

function place(state, l) {
  if (l.modality === 'cabina') return cabinById(state.config, l.cabinId)?.name ?? 'Cabina';
  return `Domicilio ${coloniaById(state.config, l.coloniaId)?.name ?? ''}`;
}
function rateLabel(l, bonus) {
  if (l.status === 'realizada') {
    if (l.montoEscalon > 0) return l.montoBase > 0 ? `${l.baseRate} % / ${l.baseRate + bonus} %` : `${l.baseRate + bonus} %`;
    return `${l.baseRate} %`;
  }
  if (l.pagoCancelacion) return 'cancelación';
  return '';
}
function lineDetail(l, bonus) {
  if (l.status === 'realizada') {
    const p = [`${money(l.price)} × ${rateLabel(l, bonus)} = ${money(l.comision)}`];
    if (l.viatico) p.push(`viático ${money(l.viatico)}`);
    if (l.propina) p.push(`propina ${money(l.propina)}`);
    return p.join(' · ');
  }
  if (l.pagoCancelacion) return `${STATUS[l.status]} · 20 % de ${money(l.price)}`;
  return STATUS[l.status];
}
