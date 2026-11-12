import React, { useMemo, useState } from 'react';
import { addDays, dateLabel, quincenaOf, quincenaLabel, toMin, fromMin, weekday } from '../lib/dates.js';
import { massageById, placeName, therapistById } from '../lib/config.js';
import { Q_STATUS } from '../lib/constants.js';
import { Avatar, Button, Calendar, CalendarIcon, ChevronLeft, ChevronRight, Empty, PageTitle, StatusPill, Money } from '../ui.jsx';

export default function Agenda({ app }) {
  const { state, role, me, today, go } = app;
  const [date, setDate] = useState(app.params.date || today);
  const [who, setWho] = useState(me ? me.id : 'all');
  const canLoad = role !== 'terapeuta';

  const sessions = useMemo(
    () =>
      state.sessions
        .filter((s) => s.date === date && (who === 'all' || s.therapistId === who))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [state.sessions, date, who],
  );

  // Semana de lunes a domingo que contiene la fecha elegida. Las flechas avanzan de a un día.
  const mondayOffset = (weekday(date) + 6) % 7;
  const week = Array.from({ length: 7 }, (_, i) => addDays(date, i - mondayOffset));
  const qid = quincenaOf(date);
  const q = state.quincenas[qid];
  const locked = q && q.status !== 'abierta';
  const [calOpen, setCalOpen] = useState(false);
  const marks = useMemo(() => new Set(state.sessions.filter((s) => who === 'all' || s.therapistId === who).map((s) => s.date)), [state.sessions, who]);
  const pick = (d) => { setDate(d); setCalOpen(false); };

  return (
    <div>
      <PageTitle
        eyebrow={role === 'terapeuta' ? 'Mi agenda' : 'Agenda'}
        title={date === today ? 'Hoy' : dateLabel(date)}
        right={canLoad && !locked ? <Button size="sm" onClick={() => go('nueva', { date })}>+ Sesión</Button> : null}
      />

      <div className="card mb-4 px-2 py-3">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Día anterior" onClick={() => setDate(addDays(date, -1))} className="flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-selva hover:bg-selva/5"><ChevronLeft /></button>
          <div className="grid flex-1 grid-cols-7 gap-0.5">
            {week.map((d) => {
              const sel = d === date;
              const has = marks.has(d);
              return (
                <button key={d} type="button" onClick={() => setDate(d)} aria-pressed={sel} aria-label={dateLabel(d)} className={`flex min-h-[58px] flex-col items-center justify-center rounded-2xl text-[12px] transition ${sel ? 'bg-selva text-white' : 'text-noche hover:bg-selva/5'}`}>
                  <span className={`uppercase ${sel ? 'text-white/75' : d === today ? 'font-bold text-terracota' : 'text-noche/55'}`}>{dateLabel(d).split(' ')[0]}</span>
                  <span className="tabular text-[17px] font-semibold">{Number(d.slice(8))}</span>
                  <span aria-hidden className={`mt-0.5 h-1 w-1 rounded-full ${has ? (sel ? 'bg-oro' : 'bg-terracota') : 'bg-transparent'}`} />
                </button>
              );
            })}
          </div>
          <button type="button" aria-label="Día siguiente" onClick={() => setDate(addDays(date, 1))} className="flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-selva hover:bg-selva/5"><ChevronRight /></button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-selva/10 px-2 pt-2">
          <button type="button" onClick={() => setCalOpen((o) => !o)} aria-expanded={calOpen} className="inline-flex min-h-[40px] items-center gap-2 rounded-full px-3 text-[14px] font-semibold text-selva hover:bg-selva/5">
            <CalendarIcon className="h-[18px] w-[18px]" /> {calOpen ? 'Cerrar calendario' : 'Ver mes'}
          </button>
          {date !== today && (
            <button type="button" onClick={() => pick(today)} className="min-h-[40px] rounded-full px-3 text-[14px] font-semibold text-terracota hover:bg-terracota/5">Ir a hoy</button>
          )}
        </div>
        {calOpen && (
          <div className="mt-2 border-t border-selva/10 px-1 pt-3">
            <Calendar value={date} onChange={pick} marks={marks} />
          </div>
        )}
      </div>

      {role !== 'terapeuta' && (
        <div className="no-scrollbar -mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Filtrar por terapeuta">
          {[{ id: 'all', short: 'Todas' }, ...state.therapists].map((t) => {
            const sel = who === t.id;
            return (
              <button key={t.id} type="button" role="radio" aria-checked={sel} onClick={() => setWho(t.id)} className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border py-1 text-[15px] font-semibold transition ${t.id === 'all' ? 'px-4' : 'pl-1 pr-4'} ${sel ? 'border-selva bg-selva text-white' : 'border-selva/15 bg-white text-selva hover:border-selva/40'}`}>
                {t.id !== 'all' && <Avatar size={34} active={sel} />}
                {t.short}
              </button>
            );
          })}
        </div>
      )}

      {locked && (
        <p className="mb-4 rounded-xl bg-oro/20 px-4 py-3 text-[15px] text-noche">
          La quincena {quincenaLabel(qid)} está <strong>{Q_STATUS[q.status].toLowerCase()}</strong>: ya no se cargan ni se modifican sesiones.
        </p>
      )}

      {sessions.length === 0 ? (
        <Empty
          title={role === 'terapeuta' ? 'No tenés sesiones este día' : 'Día sin sesiones'}
          action={canLoad && !locked ? <Button onClick={() => go('nueva', { date })}>Cargar una sesión</Button> : null}
        >
          {role === 'terapeuta' ? 'Cuando recepción te asigne una, aparece acá.' : 'Todavía no se cargó ninguna sesión para esta fecha.'}
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((s) => {
            const m = massageById(state.config, s.massageId);
            const t = therapistById(state, s.therapistId);
            const cancelled = !['agendada', 'realizada'].includes(s.status);
            return (
              <li key={s.id}>
                <button type="button" onClick={() => go('sesion', { id: s.id })} className={`card flex w-full gap-4 px-4 py-4 text-left transition hover:border-selva/40 ${cancelled ? 'opacity-70' : ''}`}>
                  <div className="w-14 shrink-0">
                    <p className="tabular font-display text-[24px] leading-none text-selva">{s.time}</p>
                    <p className="tabular mt-1 text-[13px] text-noche/60">{fromMin(toMin(s.time) + s.duration)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className={`text-[17px] font-semibold text-selva ${cancelled ? 'line-through decoration-noche/40' : ''}`}>{m?.name} · {s.duration} min</p>
                    </div>
                    <p className="mt-0.5 truncate text-[15px] text-noche/80">
                      {role !== 'terapeuta' && <>{t?.short} · </>}
                      {s.modality === 'domicilio' ? 'Domicilio · ' : ''}{placeName(state.config, s)}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <StatusPill status={s.status} />
                      <span className="tabular text-[13px] text-noche/50">{s.code}</span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {sessions.length > 0 && role !== 'terapeuta' && (
        <p className="mt-4 text-right text-[14px] text-noche/60">
          {sessions.filter((s) => s.status === 'realizada').length} realizadas · cobrado en sesiones <Money value={sessions.filter((s) => s.status === 'realizada').reduce((a, s) => a + s.price, 0)} />
        </p>
      )}
    </div>
  );
}
