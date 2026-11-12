// Acciones sobre el estado (puras) y persistencia en localStorage.
import { STORAGE_KEY } from './constants.js';
import { quincenaOf, quincenaLabel, todayISO, prevQuincena } from './dates.js';
import { validateSession, priceFor, healthNoteIssue } from './schedule.js';
import { advanceCheck, makeSnapshot, isLocked } from './engine.js';

export const SCHEMA_VERSION = 1;

// ---------- persistencia ----------

/**
 * Carga el estado. La semilla se usa SOLO si no existe la clave propia de la app:
 * una lista guardada vacía es un dato válido, no una primera visita.
 */
export function loadState(storage, makeSeed) {
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (e) {
    return { status: 'error', error: 'El navegador no deja leer el almacenamiento local.', detail: String(e) };
  }
  if (raw === null) {
    const seed = makeSeed();
    const res = saveState(storage, seed);
    return { status: res.ok ? 'seeded' : 'seeded_unsaved', state: seed, error: res.error };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SCHEMA_VERSION || !Array.isArray(parsed.sessions)) throw new Error('Formato desconocido');
    return { status: 'ok', state: parsed };
  } catch (e) {
    return { status: 'error', error: 'Los datos guardados no se pueden leer. No los tocamos.', detail: String(e) };
  }
}

export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    const quota = /quota/i.test(String(e?.name) + String(e?.message));
    return { ok: false, error: quota ? 'No hay espacio en el almacenamiento del navegador.' : 'No se pudo guardar en este navegador.' };
  }
}

/** Restauración: borra solo la clave de este proyecto y vuelve a la semilla. */
export function restoreSeed(storage, makeSeed) {
  const seed = makeSeed();
  const res = saveState(storage, seed);
  return res.ok ? { ok: true, state: seed } : res;
}

// ---------- helpers ----------

const clone = (s) => JSON.parse(JSON.stringify(s));

function nextCode(state, kind) {
  const n = (state.counters[kind] || 0) + 1;
  state.counters[kind] = n;
  const prefix = kind === 'session' ? 'S' : 'A';
  return { id: `${prefix.toLowerCase()}${n}`, code: `${prefix}-${String(n).padStart(4, '0')}` };
}

/** La quincena nueva se abre sola al primer registro con fecha posterior. */
export function ensureQuincena(state, dateISO) {
  const qid = quincenaOf(dateISO);
  if (!state.quincenas[qid]) {
    state.quincenas[qid] = { id: qid, status: 'abierta', openedAt: new Date().toISOString(), history: [] };
  }
  return qid;
}

// ---------- sesiones ----------

export function createSession(state, draft) {
  const v = validateSession(state, draft);
  if (!v.ok) return { error: v.errors };
  const next = clone(state);
  ensureQuincena(next, draft.date);
  const { id, code } = nextCode(next, 'session');
  const session = {
    id,
    code,
    date: draft.date,
    time: draft.time,
    therapistId: draft.therapistId,
    massageId: draft.massageId,
    duration: Number(draft.duration),
    modality: draft.modality,
    cabinId: draft.modality === 'cabina' ? draft.cabinId : null,
    coloniaId: draft.modality === 'domicilio' ? draft.coloniaId : null,
    price: priceFor(next.config, draft.massageId, Number(draft.duration)), // precio al momento
    client: (draft.client || '').trim(),
    paymentMethod: draft.paymentMethod || 'efectivo',
    tip: 0,
    status: 'agendada',
    notes: (draft.notes || '').trim(),
    createdAt: new Date().toISOString(),
    log: [{ at: new Date().toISOString(), status: 'agendada' }],
  };
  next.sessions.push(session);
  return { state: next, session };
}

/** Cambios sobre una sesión existente: estado, propina, medio de pago, notas. */
export function updateSession(state, id, patch) {
  const s = state.sessions.find((x) => x.id === id);
  if (!s) return { error: ['La sesión no existe.'] };
  const qid = quincenaOf(s.date);
  if (isLocked(state, qid)) return { error: [`La quincena ${quincenaLabel(qid)} ya no está abierta: no se pueden modificar sus sesiones.`] };

  if (patch.tip !== undefined) {
    const tip = Number(patch.tip);
    if (!(tip >= 0)) return { error: ['La propina tiene que ser un número mayor o igual a cero.'] };
    const status = patch.status ?? s.status;
    if (tip > 0 && status !== 'realizada') return { error: ['Solo se registran propinas en sesiones Realizadas.'] };
  }
  if (patch.notes !== undefined) {
    const issue = healthNoteIssue(patch.notes);
    if (issue) return { error: [issue] };
  }
  // Volver a ocupar agenda (desde una cancelación) exige que el horario siga libre.
  if (patch.status && ['agendada', 'realizada'].includes(patch.status) && !['agendada', 'realizada'].includes(s.status)) {
    const v = validateSession(state, { ...s, notes: patch.notes ?? s.notes }, s.id);
    if (!v.ok) return { error: v.errors };
  }

  const next = clone(state);
  const t = next.sessions.find((x) => x.id === id);
  if (patch.status && patch.status !== t.status) {
    t.log = [...(t.log || []), { at: new Date().toISOString(), status: patch.status, ...(patch.noticeHours != null ? { noticeHours: patch.noticeHours } : {}) }];
    t.status = patch.status;
    if (patch.status !== 'realizada') t.tip = 0;
  }
  if (patch.noticeHours !== undefined) t.noticeHours = patch.noticeHours;
  if (patch.tip !== undefined) t.tip = Number(patch.tip);
  if (patch.paymentMethod) t.paymentMethod = patch.paymentMethod;
  if (patch.notes !== undefined) t.notes = patch.notes.trim();
  return { state: next, session: t };
}

// ---------- adelantos ----------

export function addAdvance(state, { therapistId, date, amount, reason }) {
  const amt = Number(amount);
  if (!therapistId) return { error: ['Elegí la terapeuta.'] };
  if (!date) return { error: ['Indicá la fecha del adelanto.'] };
  if (!reason || !reason.trim()) return { error: ['Anotá el motivo del adelanto.'] };
  const chk = advanceCheck(state, therapistId, date, amt);
  if (!chk.ok) return { error: [chk.reason], check: chk };
  const next = clone(state);
  ensureQuincena(next, date);
  const { id, code } = nextCode(next, 'advance');
  const adv = { id, code, therapistId, date, amount: amt, reason: reason.trim(), createdAt: new Date().toISOString() };
  next.advances.push(adv);
  return { state: next, advance: adv };
}

export function deleteAdvance(state, id) {
  const a = state.advances.find((x) => x.id === id);
  if (!a) return { error: ['El adelanto no existe.'] };
  if (isLocked(state, quincenaOf(a.date))) return { error: ['La quincena ya no está abierta.'] };
  const next = clone(state);
  next.advances = next.advances.filter((x) => x.id !== id);
  return { state: next };
}

// ---------- quincenas ----------

const FLOW = { abierta: ['en_revision'], en_revision: ['abierta', 'aprobada'], aprobada: ['pagada'], pagada: [] };

export function setQuincenaStatus(state, qid, status, { paymentDate } = {}) {
  const q = state.quincenas[qid];
  if (!q) return { error: ['La quincena no existe.'] };
  if (!FLOW[q.status].includes(status)) return { error: ['Ese cambio de estado no está permitido.'] };
  if (status === 'pagada' && !paymentDate) return { error: ['Para marcarla como Pagada hace falta la fecha de pago.'] };
  if (status === 'aprobada') {
    const prev = state.quincenas[prevQuincena(qid)];
    if (prev && (prev.status === 'abierta' || prev.status === 'en_revision')) {
      return { error: [`Primero aprobá la quincena anterior (${quincenaLabel(prev.id)}): su saldo puede pasar como «A descontar».`] };
    }
  }
  const next = clone(state);
  const nq = next.quincenas[qid];
  nq.history = [...(nq.history || []), { at: new Date().toISOString(), from: nq.status, to: status }];
  nq.status = status;
  if (status === 'aprobada') {
    nq.snapshot = makeSnapshot(state, qid); // copia de montos: cambiar tarifas después no la mueve
    nq.approvedAt = new Date().toISOString();
  }
  if (status === 'abierta') delete nq.snapshot;
  if (status === 'pagada') nq.paymentDate = paymentDate;
  return { state: next };
}

// ---------- configuración ----------

export function updateConfig(state, config) {
  const r = config.rates;
  const nums = [r.cabina, r.domicilio, r.tierThreshold, r.tierBonus, r.cancelClientPct, r.cancelTherapistPct, r.advanceMaxPct];
  if (nums.some((n) => !(Number(n) >= 0))) return { error: ['Revisá los porcentajes: tienen que ser números mayores o iguales a cero.'] };
  for (const m of config.catalog) for (const d of [60, 90]) if (!(Number(m.prices[d]) > 0)) return { error: [`Precio inválido en ${m.name} ${d} min.`] };
  for (const c of config.colonias) if (!(Number(c.viatico) >= 0)) return { error: [`Viático inválido en ${c.name}.`] };
  const next = clone(state);
  next.config = config;
  return { state: next };
}

export function updateTherapist(state, id, patch) {
  if (patch.specialties && patch.specialties.length === 0) return { error: ['Cada terapeuta necesita al menos una especialidad.'] };
  const next = clone(state);
  const t = next.therapists.find((x) => x.id === id);
  Object.assign(t, patch);
  return { state: next };
}

export { todayISO };
