import React, { useState } from 'react';
import { updateConfig, updateTherapist } from '../lib/store.js';
import { PANEL_KEY, STORAGE_KEY } from '../lib/constants.js';
import { Button, ErrorBox, PageTitle } from '../ui.jsx';

function Num({ label, value, onChange, suffix, prefix }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-[16px]">{label}</span>
      <span className="flex items-center gap-1.5">
        {prefix && <span className="text-noche/60">{prefix}</span>}
        <input className="field tabular !w-[104px] !py-2 text-right" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))} />
        {suffix && <span className="w-5 text-noche/60">{suffix}</span>}
      </span>
    </label>
  );
}

export default function Ajustes({ app }) {
  const { state, commit, openRestore } = app;
  const [cfg, setCfg] = useState(() => JSON.parse(JSON.stringify(state.config)));
  const [errors, setErrors] = useState(null);
  const [tErr, setTErr] = useState(null);
  const r = cfg.rates;
  const setRate = (k, v) => setCfg((c) => ({ ...c, rates: { ...c.rates, [k]: v } }));

  const save = () => {
    const norm = JSON.parse(JSON.stringify(cfg));
    for (const k of Object.keys(norm.rates)) norm.rates[k] = Number(norm.rates[k]);
    norm.catalog.forEach((m) => { m.prices = { 60: Number(m.prices[60]), 90: Number(m.prices[90]) }; });
    norm.colonias.forEach((c) => { c.viatico = Number(c.viatico); });
    const out = commit(updateConfig(state, norm), 'Ajustes guardados.');
    setErrors(out.ok ? null : out.errors);
  };

  const toggleSpec = (t, mid) => {
    const has = t.specialties.includes(mid);
    const specialties = has ? t.specialties.filter((x) => x !== mid) : [...t.specialties, mid];
    const out = commit(updateTherapist(state, t.id, { specialties }), 'Especialidades actualizadas.');
    setTErr(out.ok ? null : out.errors);
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle eyebrow="Dirección" title="Ajustes" />
      <p className="mb-6 text-[15px] text-noche/70">Los cambios de tarifas y reglas recalculan las quincenas abiertas o en revisión. Las aprobadas y pagadas quedan congeladas. Cada sesión guarda su precio del momento.</p>

      <section className="card mb-6 px-5 py-4">
        <h2 className="mb-2 text-[22px]">Comisiones</h2>
        <Num label="En cabina" value={r.cabina} onChange={(v) => setRate('cabina', v)} suffix="%" />
        <Num label="A domicilio" value={r.domicilio} onChange={(v) => setRate('domicilio', v)} suffix="%" />
        <Num label="Escalón: ventas por quincena" value={r.tierThreshold} onChange={(v) => setRate('tierThreshold', v)} prefix="$" />
        <Num label="Puntos extra sobre el excedente" value={r.tierBonus} onChange={(v) => setRate('tierBonus', v)} suffix="pts" />
        <h3 className="mb-1 mt-4 font-sans text-[15px] font-semibold uppercase tracking-[0.08em] text-noche/70">Cancelaciones y adelantos</h3>
        <Num label="Aviso mínimo sin cargo" value={r.lateCancelHours} onChange={(v) => setRate('lateCancelHours', v)} suffix="h" />
        <Num label="Cargo al cliente" value={r.cancelClientPct} onChange={(v) => setRate('cancelClientPct', v)} suffix="%" />
        <Num label="Pago a la terapeuta" value={r.cancelTherapistPct} onChange={(v) => setRate('cancelTherapistPct', v)} suffix="%" />
        <Num label="Tope de adelantos sobre lo ganado" value={r.advanceMaxPct} onChange={(v) => setRate('advanceMaxPct', v)} suffix="%" />
      </section>

      <section className="card mb-6 px-5 py-4">
        <h2 className="mb-2 text-[22px]">Tarifas</h2>
        <div className="mb-1 grid grid-cols-[1fr_104px_104px] gap-2 text-right label"><span className="text-left">Masaje</span><span>60 min</span><span>90 min</span></div>
        {cfg.catalog.map((m, i) => (
          <div key={m.id} className="grid grid-cols-[1fr_104px_104px] items-center gap-2 py-1.5">
            <span className="text-[16px]">{m.name}</span>
            {[60, 90].map((d) => (
              <input key={d} aria-label={`${m.name} ${d} min`} className="field tabular !py-2 text-right" inputMode="decimal" value={m.prices[d]} onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, '');
                setCfg((c) => { const n = JSON.parse(JSON.stringify(c)); n.catalog[i].prices[d] = v; return n; });
              }} />
            ))}
          </div>
        ))}
      </section>

      <section className="card mb-6 px-5 py-4">
        <h2 className="mb-2 text-[22px]">Viáticos por colonia</h2>
        {cfg.colonias.map((c, i) => (
          <Num key={c.id} label={c.name} value={c.viatico} prefix="$" onChange={(v) => setCfg((x) => { const n = JSON.parse(JSON.stringify(x)); n.colonias[i].viatico = v; return n; })} />
        ))}
      </section>

      <div className="sticky bottom-20 z-10 mb-10 flex flex-col gap-3 rounded-2xl bg-arena/95 py-3 backdrop-blur">
        <ErrorBox errors={errors} />
        <Button onClick={save}>Guardar ajustes</Button>
      </div>

      <section className="card mb-6 px-5 py-4">
        <h2 className="mb-1 text-[22px]">Especialidades</h2>
        <p className="mb-3 text-[15px] text-noche/60">Cada masaje solo se asigna a quien lo tiene marcado. Se guarda al tocar.</p>
        <ErrorBox errors={tErr} />
        <ul className="divide-y divide-selva/10">
          {state.therapists.map((t) => (
            <li key={t.id} className="py-3">
              <p className="mb-2 text-[16px] font-semibold text-selva">{t.name}</p>
              <div className="flex flex-wrap gap-2">
                {state.config.catalog.map((m) => {
                  const on = t.specialties.includes(m.id);
                  return (
                    <button key={m.id} type="button" aria-pressed={on} onClick={() => toggleSpec(t, m.id)} className={`min-h-[40px] rounded-full border px-3 text-[14px] font-semibold ${on ? 'border-selva bg-selva text-white' : 'border-selva/20 bg-white text-noche/60'}`}>
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card px-5 py-4">
        <h2 className="mb-2 text-[22px]">Datos</h2>
        <p className="text-[15px] text-noche/70">Todo se guarda en este navegador bajo la clave <code className="rounded bg-arena px-1">{STORAGE_KEY}</code>. Clave del panel: definida en el código ({PANEL_KEY.replace(/./g, '•')}). No hay alta de usuarios ni recuperación.</p>
        <Button variant="danger" className="mt-4 w-full" onClick={openRestore}>Restaurar datos de prueba</Button>
      </section>
    </div>
  );
}
