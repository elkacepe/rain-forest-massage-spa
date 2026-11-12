import React, { useState } from 'react';
import { PANEL_KEY } from '../lib/constants.js';
import { Avatar, Button, CheckIcon, ErrorBox, Field } from '../ui.jsx';

const ROLE_INFO = [
  { role: 'direccion', title: 'Dirección', text: 'Liquidaciones, adelantos, panel y ajustes.' },
  { role: 'recepcion', title: 'Recepción', text: 'Cargar sesiones, cambiar estados y propinas.' },
  { role: 'terapeuta', title: 'Terapeuta', text: 'Tu agenda, tu acumulado y tus recibos.' },
];

export default function Login({ state, onLogin }) {
  const [key, setKey] = useState('');
  const [role, setRole] = useState('recepcion');
  const [therapistId, setTherapistId] = useState(state.therapists[0]?.id || '');
  const [err, setErr] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (key.trim() !== PANEL_KEY) {
      setErr(['La clave no coincide. Pedila a Dirección.']);
      return;
    }
    onLogin(role === 'terapeuta' ? { role, therapistId } : { role });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
      <div className="mb-10">
        <p className="font-display text-[44px] leading-[0.95] text-selva">Rain Forest</p>
        <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.24em] text-terracota">Massage Spa · México</p>
        <div className="mt-6 h-px w-16 bg-oro" />
        <p className="mt-6 text-[18px] text-noche/80">Sesiones y liquidaciones de terapeutas, sin cuaderno ni planilla.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-6">
        <fieldset className="min-w-0">
          <legend className="label mb-2">¿Con qué rol entrás?</legend>
          <div className="flex flex-col gap-2">
            {ROLE_INFO.map((r) => {
              const sel = role === r.role;
              return (
                <label key={r.role} className={`card flex min-h-[64px] cursor-pointer items-center gap-3 px-4 py-3 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-oro ${sel ? '!border-selva ring-1 ring-selva' : ''}`}>
                  <input type="radio" name="rol" value={r.role} checked={sel} onChange={() => setRole(r.role)} className="sr-only" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold text-selva">{r.title}</span>
                    <span className="block text-[15px] text-noche/70">{r.text}</span>
                  </span>
                  <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${sel ? 'border-selva bg-selva text-white' : 'border-selva/25'}`}>
                    {sel && <CheckIcon className="h-4 w-4" />}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {role === 'terapeuta' && (
          <fieldset className="min-w-0">
            <legend className="label mb-2">¿Quién sos?</legend>
            <div className="card divide-y divide-selva/10 overflow-hidden">
              {state.therapists.map((t) => {
                const sel = therapistId === t.id;
                return (
                  <label key={t.id} className={`flex min-h-[64px] cursor-pointer items-center gap-3 px-4 py-3 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-oro ${sel ? 'bg-selva/[0.06]' : 'hover:bg-arena/60'}`}>
                    <input type="radio" name="terapeuta" value={t.id} checked={sel} onChange={() => setTherapistId(t.id)} className="sr-only" />
                    <Avatar size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-semibold text-selva">{t.name}</span>
                      <span className="block truncate text-[14px] text-noche/60">{t.specialties.map((id) => state.config.catalog.find((m) => m.id === id)?.name).filter(Boolean).join(' · ')}</span>
                    </span>
                    <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${sel ? 'border-selva bg-selva text-white' : 'border-selva/25'}`}>
                      {sel && <CheckIcon className="h-4 w-4" />}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <Field label="Clave del panel" hint="Clave compartida del spa. No hay cuentas individuales.">
          <input className="field" type="password" autoComplete="off" value={key} onChange={(e) => { setKey(e.target.value); setErr(null); }} />
        </Field>

        <ErrorBox errors={err} />
        <Button type="submit">Entrar</Button>
      </form>

      <p className="mt-auto pt-10 text-[13px] text-noche/50">Datos de prueba sintéticos · se guardan solo en este navegador.</p>
    </main>
  );
}
