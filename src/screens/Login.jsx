import React, { useState } from 'react';
import { PANEL_KEY } from '../lib/constants.js';
import { Button, ErrorBox, Field } from '../ui.jsx';

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
        <fieldset>
          <legend className="label mb-2">¿Con qué rol entrás?</legend>
          <div className="flex flex-col gap-2">
            {ROLE_INFO.map((r) => (
              <label key={r.role} className={`card flex min-h-[64px] cursor-pointer items-start gap-3 px-4 py-3 transition ${role === r.role ? '!border-selva ring-1 ring-selva' : ''}`}>
                <input type="radio" name="rol" value={r.role} checked={role === r.role} onChange={() => setRole(r.role)} className="mt-1.5 h-4 w-4 accent-[#1F4D3F]" />
                <span>
                  <span className="block text-[17px] font-semibold text-selva">{r.title}</span>
                  <span className="block text-[15px] text-noche/70">{r.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {role === 'terapeuta' && (
          <Field label="¿Quién sos?">
            <select className="field" value={therapistId} onChange={(e) => setTherapistId(e.target.value)}>
              {state.therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
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
