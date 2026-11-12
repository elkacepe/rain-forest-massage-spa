import React, { useMemo, useState } from 'react';
import { addDays, dateLabel, quincenaOf, quincenaLabel, toMin, fromMin } from '../lib/dates.js';
import { massageById, placeName, therapistById } from '../lib/config.js';
import { Q_STATUS } from '../lib/constants.js';
import { Button, Empty, PageTitle, StatusPill, Money } from '../ui.jsx';

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

  const week = Array.from({ length: 7 }, (_, i) => addDays(date, i - 3));
  const qid = quincenaOf(date);
  const q = state.quincenas[qid];
  const locked = q && q.status !== 'abierta';

  return (
    <div>
      <PageTitle
        eyebrow={role === 'terapeuta' ? 'Mi agenda' : 'Agenda'}
        title={date === today ? 'Hoy' : dateLabel(date)}
        right={canLoad && !locked ? <Button size="sm" onClick={() => go('nueva', { date })}>+ Sesión</Button> : null}
      />

      <div className="mb-4 flex items-center gap-2">
        <button type="button" aria-label="Semana anterior" onClick={() => setDate(addDays(date, -7))} className="min-h-[44px] min-w-[36px] rounded-lg text-[20px] text-noche/60 hover:text-selva">‹</button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {week.map((d) => {
            const sel = d === date;
            const has = state.sessions.some((s) => s.date === d && (who === 'all' || s.therapistId === who));
            const [, , dd] = d.split('-');
            return (
              <button key={d} type="button" onClick={() => setDate(d)} aria-pressed={sel} className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl text-[12px] ${sel ? 'bg-selva text-white' : 'bg-white text-noche'} ${d === today && !sel ? 'ring-1 ring-terracota' : ''}`}>
                <span className="uppercase opacity-70">{dateLabel(d).split(' ')[0]}</span>
                <span className="tabular text-[17px] font-semibold">{Number(dd)}</span>
                <span aria-hidden className={`mt-0.5 h-1 w-1 rounded-full ${has ? (sel ? 'bg-oro' : 'bg-terracota') : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>
        <button type="button" aria-label="Semana siguiente" onClick={() => setDate(addDays(date, 7))} className="min-h-[44px] min-w-[36px] rounded-lg text-[20px] text-noche/60 hover:text-selva">›</button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {date !== today && (
          <Button size="sm" variant="ghost" onClick={() => setDate(today)}>Ir a hoy</Button>
        )}
        <input type="date" className="field !w-auto !py-2 text-[15px]" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Elegir fecha" />
        {role !== 'terapeuta' && (
          <select className="field !w-auto !py-2 text-[15px]" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filtrar por terapeuta">
            <option value="all">Todas las terapeutas</option>
            {state.therapists.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

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
