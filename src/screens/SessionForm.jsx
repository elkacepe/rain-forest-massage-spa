import React, { useMemo, useState } from 'react';
import { createSession } from '../lib/store.js';
import { freeSlots, validateSession, priceFor } from '../lib/schedule.js';
import { dateLabel, quincenaOf, quincenaLabel, weekday } from '../lib/dates.js';
import { PAYMENT_METHODS } from '../lib/constants.js';
import { massageById } from '../lib/config.js';
import { BackLink, Button, DateField, ErrorBox, Field, PageTitle, Segmented, Money } from '../ui.jsx';

export default function SessionForm({ app }) {
  const { state, role, today, commit, go, back } = app;
  const { config } = state;
  const [d, setD] = useState({
    date: app.params.date || today,
    modality: 'cabina',
    massageId: 'relajante',
    duration: 60,
    therapistId: '',
    cabinId: 'ceiba',
    coloniaId: 'roma',
    time: '',
    client: '',
    paymentMethod: 'efectivo',
    notes: '',
  });
  const [errors, setErrors] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (patch) => {
    setD((x) => ({ ...x, ...patch }));
    setErrors(null);
  };

  const massage = massageById(config, d.massageId);
  const able = state.therapists.filter((t) => t.active && t.specialties.includes(d.massageId));
  const therapistId = able.some((t) => t.id === d.therapistId) ? d.therapistId : '';
  const draft = { ...d, therapistId };
  const slots = useMemo(() => freeSlots(state, draft), [state, d.date, d.modality, d.massageId, d.duration, therapistId, d.cabinId, d.coloniaId]); // eslint-disable-line
  const price = priceFor(config, d.massageId, d.duration);
  const qid = quincenaOf(d.date);
  const q = state.quincenas[qid];
  const hours = config.hours[weekday(d.date)];

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    if (!draft.time) return setErrors(['Elegí un horario.']);
    if (!draft.client.trim()) return setErrors(['Anotá el nombre del cliente.']);
    const v = validateSession(state, draft);
    if (!v.ok) return setErrors(v.errors);
    setBusy(true);
    const res = createSession(state, draft);
    const out = commit(res, `Sesión ${res.session?.code ?? ''} agendada.`);
    setBusy(false);
    if (!out.ok) return setErrors(out.errors); // lo escrito queda en el formulario
    go('sesion', { id: res.session.id });
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl">
      <BackLink onClick={back} />
      <PageTitle eyebrow="Recepción" title="Nueva sesión" />

      <div className="flex flex-col gap-6">
        <DateField label="Fecha" value={d.date} onChange={(v) => set({ date: v, time: '' })} hint={`Abierto de ${hours.open} a ${hours.close} · quincena ${quincenaLabel(qid)}${q ? '' : ' (se abre con esta sesión)'}`} />

        <div>
          <span className="label mb-1.5 block">Modalidad</span>
          <Segmented name="Modalidad" value={d.modality} onChange={(v) => set({ modality: v, time: '' })} options={[{ value: 'cabina', label: 'En cabina' }, { value: 'domicilio', label: 'A domicilio' }]} />
        </div>

        <Field label="Masaje">
          <select className="field" value={d.massageId} onChange={(e) => set({ massageId: e.target.value, time: '' })}>
            {config.catalog.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </Field>

        <div>
          <span className="label mb-1.5 block">Duración</span>
          <Segmented name="Duración" value={Number(d.duration)} onChange={(v) => set({ duration: v, time: '' })} options={[60, 90].map((min) => ({ value: min, label: `${min} min`, sub: `$${massage.prices[min].toLocaleString('en-US')}` }))} />
        </div>

        <Field label="Terapeuta" hint={`Solo aparecen quienes hacen ${massage.name}.`}>
          <select className="field" value={therapistId} onChange={(e) => set({ therapistId: e.target.value, time: '' })}>
            <option value="">Elegí una terapeuta</option>
            {able.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>

        {d.modality === 'cabina' ? (
          <div>
            <span className="label mb-1.5 block">Cabina</span>
            <Segmented name="Cabina" value={d.cabinId} onChange={(v) => set({ cabinId: v, time: '' })} options={config.cabins.map((c) => ({ value: c.id, label: c.name.replace('Cabina ', '') }))} />
          </div>
        ) : (
          <Field label="Colonia" hint="La terapeuta queda bloqueada 45 min antes y después por el traslado.">
            <select className="field" value={d.coloniaId} onChange={(e) => set({ coloniaId: e.target.value, time: '' })}>
              {config.colonias.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{role === 'direccion' ? ` · viático $${c.viatico}` : ''}</option>
              ))}
            </select>
          </Field>
        )}

        <div>
          <span className="label mb-1.5 block">Horario</span>
          {!therapistId ? (
            <p className="rounded-xl bg-white px-4 py-3 text-[15px] text-noche/60">Elegí la terapeuta para ver los horarios libres.</p>
          ) : slots.length === 0 ? (
            <p className="rounded-xl bg-white px-4 py-3 text-[15px] text-noche/70">No queda ningún horario libre ese día con esta combinación. Probá otra cabina, otra terapeuta u otra fecha.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((t) => (
                <button key={t} type="button" onClick={() => set({ time: t })} aria-pressed={d.time === t} className={`tabular min-h-[44px] min-w-[68px] rounded-xl border px-3 text-[15px] font-semibold ${d.time === t ? 'border-selva bg-selva text-white' : 'border-selva/20 bg-white text-selva'}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-[14px] text-noche/60">Ya descuenta {config.prepMinutes} min de preparación de cabina y los traslados.</p>
        </div>

        <Field label="Cliente" hint="Nombre de referencia. Usá datos sintéticos en las pruebas.">
          <input className="field" value={d.client} onChange={(e) => set({ client: e.target.value })} autoComplete="off" />
        </Field>

        <div>
          <span className="label mb-1.5 block">Medio de pago previsto</span>
          <Segmented name="Medio de pago" value={d.paymentMethod} onChange={(v) => set({ paymentMethod: v })} options={Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value, label }))} />
        </div>

        <Field label="Notas" hint="Sin datos de salud. Solo lo operativo: acceso, timbre, estacionamiento.">
          <textarea className="field min-h-[88px]" value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>

        <div className="card flex items-center justify-between px-4 py-4">
          <div>
            <p className="label">Precio de lista</p>
            <p className="text-[15px] text-noche/70">{massage.name} {d.duration} min{d.time ? ` · ${d.time}` : ''}</p>
          </div>
          <Money value={price} className="font-display text-[28px] text-selva" />
        </div>

        <ErrorBox errors={errors} />
        {q && q.status !== 'abierta' && <ErrorBox errors={[`La quincena ${quincenaLabel(qid)} ya no está abierta: no se pueden cargar sesiones con esta fecha.`]} />}
        <Button type="submit" disabled={busy}>Agendar sesión</Button>
      </div>
    </form>
  );
}
