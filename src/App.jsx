import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadState, saveState, restoreSeed } from './lib/store.js';
import { makeSeed } from './lib/seed.js';
import { ROLE_KEY, ROLES } from './lib/constants.js';
import { quincenaOf, quincenaLabel, todayISO } from './lib/dates.js';
import { therapistById } from './lib/config.js';
import { Toast, Button, Sheet } from './ui.jsx';
import Login from './screens/Login.jsx';
import Agenda from './screens/Agenda.jsx';
import SessionForm from './screens/SessionForm.jsx';
import SessionDetail from './screens/SessionDetail.jsx';
import MyQuincena from './screens/MyQuincena.jsx';
import Liquidacion from './screens/Liquidacion.jsx';
import Recibo from './screens/Recibo.jsx';
import Adelantos from './screens/Adelantos.jsx';
import Panel from './screens/Panel.jsx';
import Ajustes from './screens/Ajustes.jsx';

// Qué pantallas ve cada rol. El control es de interfaz: no es autenticación real.
const ACCESS = {
  direccion: ['agenda', 'nueva', 'sesion', 'liquidacion', 'recibo', 'adelantos', 'panel', 'ajustes'],
  recepcion: ['agenda', 'nueva', 'sesion'],
  terapeuta: ['agenda', 'sesion', 'mi', 'recibo'],
};
const HOME = { direccion: 'liquidacion', recepcion: 'agenda', terapeuta: 'mi' };
const NAV = {
  direccion: [
    ['agenda', 'Agenda'],
    ['liquidacion', 'Liquidación'],
    ['panel', 'Panel'],
    ['adelantos', 'Adelantos'],
    ['ajustes', 'Ajustes'],
  ],
  recepcion: [
    ['agenda', 'Agenda'],
    ['nueva', 'Nueva sesión'],
  ],
  terapeuta: [
    ['mi', 'Mi quincena'],
    ['agenda', 'Mi agenda'],
  ],
};

function readRole() {
  try {
    return JSON.parse(sessionStorage.getItem(ROLE_KEY)) || null;
  } catch {
    return null;
  }
}

export default function App() {
  const [boot] = useState(() => loadState(window.localStorage, () => makeSeed()));
  const [state, setState] = useState(boot.state || null);
  const [loadError, setLoadError] = useState(boot.status === 'error' ? boot : null);
  const [auth, setAuth] = useState(readRole);
  const [route, setRoute] = useState({ name: null, params: {} });
  const stack = useRef([]);
  const [toast, setToast] = useState(boot.status === 'seeded_unsaved' ? { kind: 'error', text: 'No se pudo guardar en este navegador: los cambios no van a persistir.' } : null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const today = todayISO();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const role = auth?.role;
  const current = route.name && role && ACCESS[role].includes(route.name) ? route.name : role ? HOME[role] : null;

  const go = useCallback((name, params = {}) => {
    stack.current.push(route);
    setRoute({ name, params });
    window.scrollTo(0, 0);
  }, [route]);
  const tab = useCallback((name, params = {}) => {
    stack.current = [];
    setRoute({ name, params });
    window.scrollTo(0, 0);
  }, []);
  const back = useCallback(() => {
    const prev = stack.current.pop();
    setRoute(prev && prev.name ? prev : { name: null, params: {} });
    window.scrollTo(0, 0);
  }, []);

  /**
   * Guarda primero y recién después confirma. Si localStorage falla, el estado en pantalla no cambia
   * (el formulario conserva lo escrito y no se alteran códigos, cantidades ni estados).
   */
  const commit = useCallback((res, successText) => {
    if (res.error) return { ok: false, errors: res.error };
    const saved = saveState(window.localStorage, res.state);
    if (!saved.ok) {
      setToast({ kind: 'error', text: saved.error });
      return { ok: false, errors: [`${saved.error} No se guardó nada: lo que escribiste sigue en pantalla para reintentar.`] };
    }
    setState(res.state);
    if (successText) setToast({ kind: 'ok', text: successText });
    return { ok: true, res };
  }, []);

  const doRestore = () => {
    const r = restoreSeed(window.localStorage, () => makeSeed());
    setConfirmRestore(false);
    if (!r.ok) {
      setToast({ kind: 'error', text: r.error });
      return;
    }
    setState(r.state);
    setLoadError(null);
    stack.current = [];
    setRoute({ name: null, params: {} });
    setToast({ kind: 'ok', text: 'Datos de prueba restaurados.' });
  };

  const login = (a) => {
    try {
      sessionStorage.setItem(ROLE_KEY, JSON.stringify(a));
    } catch {
      /* si falla, el rol dura hasta recargar */
    }
    setAuth(a);
    stack.current = [];
    setRoute({ name: null, params: {} });
  };
  const logout = () => {
    try {
      sessionStorage.removeItem(ROLE_KEY);
    } catch {
      /* nada */
    }
    setAuth(null);
  };

  if (loadError) {
    return (
      <main className="mx-auto max-w-md px-5 py-12">
        <h1 className="text-[32px] leading-tight">No pudimos leer los datos</h1>
        <p className="mt-3 text-[16px] text-noche/80">{loadError.error} Podés intentar recargar la página. Si el problema sigue, restaurá los datos de prueba (esto reemplaza lo guardado de esta app y nada más).</p>
        <p className="mt-2 text-[13px] text-noche/50">{loadError.detail}</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={() => window.location.reload()}>Recargar</Button>
          <Button variant="danger" onClick={() => setConfirmRestore(true)}>Restaurar datos de prueba</Button>
        </div>
        <RestoreSheet open={confirmRestore} onClose={() => setConfirmRestore(false)} onConfirm={doRestore} />
        <Toast toast={toast} />
      </main>
    );
  }

  if (!auth || (auth.role === 'terapeuta' && !therapistById(state, auth.therapistId))) {
    return (
      <>
        <Login state={state} onLogin={login} />
        <Toast toast={toast} />
      </>
    );
  }

  const me = auth.role === 'terapeuta' ? therapistById(state, auth.therapistId) : null;
  const app = { state, role, me, today, go, tab, back, commit, toast: setToast, params: route.params, openRestore: () => setConfirmRestore(true) };

  const screens = { agenda: Agenda, nueva: SessionForm, sesion: SessionDetail, mi: MyQuincena, liquidacion: Liquidacion, recibo: Recibo, adelantos: Adelantos, panel: Panel, ajustes: Ajustes };
  const Screen = screens[current];
  const navActive = NAV[role].some(([n]) => n === current) ? current : NAV[role].find(([n]) => n === (current === 'recibo' ? (role === 'terapeuta' ? 'mi' : 'liquidacion') : current === 'sesion' ? 'agenda' : current))?.[0];

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 border-b border-selva/10 bg-arena/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0 leading-none">
            <p className="font-display text-[20px] text-selva">Rain Forest</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-noche/60">Massage Spa</p>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate rounded-full bg-salvia/25 px-3 py-1 text-[13px] font-semibold text-noche">
              {ROLES[role]}
              {me ? ` · ${me.short}` : ''}
            </span>
            <button type="button" onClick={logout} className="min-h-[40px] rounded-lg px-2 text-[14px] font-semibold text-noche/70 underline-offset-2 hover:text-selva hover:underline">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pt-6">
        <Screen app={app} key={current + JSON.stringify(route.params)} />
      </main>

      <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-40 border-t border-selva/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-5xl" style={{ gridTemplateColumns: `repeat(${NAV[role].length}, minmax(0,1fr))` }}>
          {NAV[role].map(([name, label]) => {
            const active = navActive === name;
            return (
              <li key={name}>
                <button type="button" onClick={() => tab(name)} aria-current={active ? 'page' : undefined} className={`flex min-h-[60px] w-full flex-col items-center justify-center gap-1 px-1 text-[13px] font-semibold leading-tight ${active ? 'text-selva' : 'text-noche/55'}`}>
                  <span aria-hidden className={`h-1 w-6 rounded-full ${active ? 'bg-terracota' : 'bg-transparent'}`} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <RestoreSheet open={confirmRestore} onClose={() => setConfirmRestore(false)} onConfirm={doRestore} />
      <Toast toast={toast} />
    </div>
  );
}

function RestoreSheet({ open, onClose, onConfirm }) {
  return (
    <Sheet open={open} title="¿Restaurar los datos de prueba?" onClose={onClose}>
      <p className="text-[16px] text-noche/80">Se reemplazan las sesiones, adelantos, quincenas y ajustes de esta app por la semilla sintética. No toca nada más del navegador. No se puede deshacer.</p>
      <div className="mt-6 flex flex-col gap-3">
        <Button variant="terracota" onClick={onConfirm}>Sí, restaurar</Button>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
      </div>
    </Sheet>
  );
}

// Opciones de quincena para los selectores: las existentes + la de hoy.
export function quincenaOptions(state, today) {
  const set = new Set(Object.keys(state.quincenas));
  set.add(quincenaOf(today));
  return [...set].sort().reverse();
}
export { quincenaLabel };
