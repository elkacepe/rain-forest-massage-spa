import React, { useState } from 'react';
import { updateSession } from '../lib/store.js';
import { therapistRow, isLocked } from '../lib/engine.js';
import { dateLabel, fromMin, toMin, minutesBetween, quincenaOf, todayISO, nowHHMM } from '../lib/dates.js';
import { massageById, placeName, therapistById } from '../lib/config.js';
import { PAYMENT_METHODS, STATUS, MODALITY } from '../lib/constants.js';
import { money } from '../lib/format.js';
import { BackLink, Button, DateField, Empty, ErrorBox, Field, PageTitle, Row, Segmented, Sheet, StatusPill } from '../ui.jsx';

export default function SessionDetail({ app }) {
  const { state, role, me, commit, back } = app;
  const s = state.sessions.find((x) => x.id === app.params.id);
  const [sheet, setSheet] = useState(null);
  const [errors, setErrors] = useState(null);

  if (!s || (role === 'terapeuta' && s.therapistId !== me.id)) {
    return (
      <div>
        <BackLink onClick={back} />
        <Empty title="Sesión no disponible">No existe o no corresponde a tu agenda.</Empty>
      </div>
    );
  }

  const { config } = state;
  const m = massageById(config, s.massageId);
  const t = therapistById(state, s.therapistId);
  const qid = quincenaOf(s.date);
  const locked = isLocked(state, qid);
  const canEdit = role !== 'terapeuta' && !locked;
  const r = config.rates;

  const apply = (patch, msg) => {
    const out = commit(updateSession(state, s.id, patch), msg);
    if (!out.ok) {
      setErrors(out.errors);
      setSheet(null); // el aviso queda visible; lo cargado en la hoja se conserva
      return false;
    }
    setErrors(null);
    setSheet(null);
    return true;
  };

  // Lo que le corresponde a la terapeuta por esta sesión: solo Dirección y la propia terapeuta.
  const showPay = role === 'direccion' || role === 'terapeuta';
  const payRow = showPay ? therapistRow(state, qid, s.therapistId) : null;
  const line = payRow?.lines.find((l) => l.sessionId === s.id) ?? null;

  return (
    <div className="mx-auto max-w-xl">
      <BackLink onClick={back} />
      <PageTitle eyebrow={`${s.code} · ${dateLabel(s.date)}`} title={`${m?.name} ${s.duration} min`} right={<StatusPill status={s.status} />} />

      <section className="card px-5 py-2">
        <Row label="Hora" value={`${s.time} – ${fromMin(toMin(s.time) + s.duration)}`} />
        <Row label="Terapeuta" value={t?.name} />
        <Row label="Modalidad" value={MODALITY[s.modality]} />
        <Row label={s.modality === 'cabina' ? 'Cabina' : 'Colonia'} value={placeName(config, s)} />
        <Row label="Cliente" value={s.client || '—'} />
        <Row label="Precio al momento" value={money(s.price)} />
        <Row label="Medio de pago" value={PAYMENT_METHODS[s.paymentMethod]} />
        {s.status === 'realizada' && <Row label="Propina" value={money(s.tip)} />}
        {['cancelada_con_cargo', 'no_show'].includes(s.status) && <Row label="Cargo al cliente" value={money((s.price * r.cancelClientPct) / 100)} strong />}
        {s.noticeHours != null && <Row label="Aviso de cancelación" value={`${fmtHours(s.noticeHours)} antes`} muted />}
      </section>

      {s.notes && (
        <section className="mt-4 card px-5 py-4">
          <p className="label mb-1">Notas</p>
          <p className="text-[16px] text-noche/80">{s.notes}</p>
        </section>
      )}

      {line && (
        <section className="mt-4 rounded-2xl bg-selva px-5 py-4 text-white">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/70">{role === 'terapeuta' ? 'Te corresponde por esta sesión' : 'Para la terapeuta'}</p>
          <div className="mt-1 flex items-baseline justify-between gap-4">
            <p className="text-[15px] text-white/80">{describeLine(line, payRow.rates.tierBonus)}</p>
            <p className="tabular font-display text-[30px] leading-none">{money(line.subtotal)}</p>
          </div>
        </section>
      )}

      {locked && role !== 'terapeuta' && <p className="mt-4 rounded-xl bg-oro/20 px-4 py-3 text-[15px]">La quincena de esta sesión ya no está abierta: no se puede modificar.</p>}

      <div className="mt-4">
        <ErrorBox errors={errors} />
      </div>

      {canEdit && (
        <div className="mt-6 flex flex-col gap-3">
          {s.status === 'agendada' && (
            <>
              <Button onClick={() => setSheet('done')}>Marcar realizada</Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => setSheet('cancel')}>Cancelar</Button>
                <Button variant="secondary" onClick={() => setSheet('noshow')}>No se presentó</Button>
              </div>
            </>
          )}
          {s.status === 'realizada' && <Button variant="secondary" onClick={() => setSheet('done')}>Editar propina y pago</Button>}
          {s.status !== 'agendada' && (
            <Button variant="ghost" onClick={() => apply({ status: 'agendada', noticeHours: null }, 'Sesión vuelta a Agendada.')}>Volver a Agendada</Button>
          )}
          <Button variant="ghost" onClick={() => setSheet('notes')}>Editar notas</Button>
        </div>
      )}

      {s.log?.length > 0 && (
        <section className="mt-8">
          <p className="label mb-2">Historial</p>
          <ol className="flex flex-col gap-1 text-[14px] text-noche/70">
            {s.log.map((l, i) => (
              <li key={i} className="tabular">{new Date(l.at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} · {STATUS[l.status]}</li>
            ))}
          </ol>
        </section>
      )}

      <DoneSheet open={sheet === 'done'} s={s} onClose={() => setSheet(null)} onSave={(p) => apply({ status: 'realizada', ...p }, 'Sesión marcada como Realizada.')} />
      <CancelSheet open={sheet === 'cancel'} s={s} state={state} role={role} onClose={() => setSheet(null)} onSave={(p) => apply(p, `Sesión: ${STATUS[p.status]}.`)} />
      <Sheet open={sheet === 'noshow'} title="¿El cliente no se presentó?" onClose={() => setSheet(null)}>
        <p className="text-[16px] text-noche/80">Se le cobra al cliente el {r.cancelClientPct} % de la tarifa: <strong>{money((s.price * r.cancelClientPct) / 100)}</strong>. La sesión no suma para el escalón de ventas.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="terracota" onClick={() => apply({ status: 'no_show' }, 'Marcada: No se presentó.')}>Confirmar</Button>
          <Button variant="secondary" onClick={() => setSheet(null)}>Volver</Button>
        </div>
      </Sheet>
      <NotesSheet open={sheet === 'notes'} s={s} onClose={() => setSheet(null)} onSave={(notes) => apply({ notes }, 'Notas guardadas.')} />
    </div>
  );
}

function fmtHours(h) {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(Math.abs(totalMin) / 60);
  const mm = Math.abs(totalMin) % 60;
  return `${totalMin < 0 ? '−' : ''}${hh} h${mm ? ` ${mm} min` : ''}`;
}

function describeLine(l, bonus) {
  if (l.status === 'realizada') {
    const up = l.baseRate + bonus;
    const rate = l.montoEscalon > 0 ? (l.montoBase > 0 ? `${l.baseRate} % / ${up} %` : `${up} % (escalón)`) : `${l.baseRate} %`;
    const out = [`Comisión ${rate}: ${money(l.comision)}`];
    if (l.viatico) out.push(`viático ${money(l.viatico)}`);
    if (l.propina) out.push(`propina ${money(l.propina)}`);
    return out.join(' · ');
  }
  if (l.pagoCancelacion) return 'Pago por cancelación tardía o ausencia';
  if (l.status === 'agendada') return 'Pendiente: se liquida cuando se realiza';
  return 'Sin pago';
}

function DoneSheet({ open, s, onClose, onSave }) {
  const [tip, setTip] = useState(String(s.tip || 0));
  const [pm, setPm] = useState(s.paymentMethod);
  return (
    <Sheet open={open} title="Sesión realizada" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div>
          <span className="label mb-1.5 block">Medio de pago</span>
          <Segmented name="Medio de pago" value={pm} onChange={setPm} options={Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value, label }))} />
        </div>
        <Field label="Propina" hint="Va completa para la terapeuta y no cuenta para el escalón.">
          <input className="field tabular" inputMode="decimal" value={tip} onChange={(e) => setTip(e.target.value.replace(/[^\d.]/g, ''))} />
        </Field>
        <Button onClick={() => onSave({ tip: Number(tip || 0), paymentMethod: pm })}>Guardar</Button>
      </div>
    </Sheet>
  );
}

function CancelSheet({ open, s, state, role, onClose, onSave }) {
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowHHMM());
  const r = state.config.rates;
  const mins = date && time ? minutesBetween(date, time, s.date, s.time) : null;
  const hours = mins == null ? null : mins / 60;
  const late = hours != null && hours < r.lateCancelHours;
  return (
    <Sheet open={open} title="Cancelar sesión" onClose={onClose}>
      <p className="mb-4 text-[16px] text-noche/80">¿Cuándo avisó el cliente? La sesión era el {dateLabel(s.date)} a las {s.time}.</p>
      <div className="flex flex-col gap-4">
        <DateField label="Fecha del aviso" value={date} onChange={setDate} />
        <Field label="Hora del aviso"><input type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>
      {hours != null && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-[15px] ${late ? 'bg-terracota/10 text-[#7A3413]' : 'bg-salvia/20 text-noche'}`}>
          {hours < 0 ? 'El aviso es posterior al horario: queda como cancelación con cargo.' : `Avisó con ${fmtHours(hours)} de anticipación.`}{' '}
          {late ? (
            <>
              <strong>Cancelada con cargo:</strong> se cobra {money((s.price * r.cancelClientPct) / 100)} al cliente
              {role === 'direccion' ? ` y la terapeuta recibe ${money((s.price * r.cancelTherapistPct) / 100)}` : ''}.
            </>
          ) : (
            <>
              <strong>Cancelada a tiempo:</strong> sin cargo y sin pago.
            </>
          )}
        </div>
      )}
      <div className="mt-6 flex flex-col gap-3">
        <Button variant="terracota" disabled={hours == null} onClick={() => onSave({ status: late ? 'cancelada_con_cargo' : 'cancelada_a_tiempo', noticeHours: Math.round(hours * 100) / 100 })}>
          Confirmar cancelación
        </Button>
        <Button variant="secondary" onClick={onClose}>Volver</Button>
      </div>
    </Sheet>
  );
}

function NotesSheet({ open, s, onClose, onSave }) {
  const [notes, setNotes] = useState(s.notes || '');
  return (
    <Sheet open={open} title="Notas" onClose={onClose}>
      <Field label="Notas operativas" hint="Sin datos de salud.">
        <textarea className="field min-h-[120px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button className="mt-5 w-full" onClick={() => onSave(notes)}>Guardar notas</Button>
    </Sheet>
  );
}
