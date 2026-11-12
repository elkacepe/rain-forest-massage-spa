// Semilla con datos 100 % sintéticos. Reproduce el caso del briefing:
//  · Valentina supera el escalón de $40,000 de ventas.
//  · Mariana hizo seis domicilios en Polanco.
//  · A Lucía le cancelaron dos sesiones sobre la hora (con cargo).
//  · Camila pidió un adelanto la semana pasada.
// Las fechas se arman relativas a hoy para que siempre haya una quincena abierta para revisar.
import { DEFAULT_CONFIG } from './config.js';
import { SCHEMA_VERSION, createSession, ensureQuincena } from './store.js';
import { addDays, quincenaOf, quincenaRange, prevQuincena, todayISO, toMin, fromMin, weekday } from './dates.js';
import { validateSession } from './schedule.js';
import { makeSnapshot, totalsOf } from './engine.js';

export const SEED_THERAPISTS = [
  { id: 't1', name: 'Valentina Robledo', short: 'Valentina', specialties: ['relajante', 'deep', 'thai', 'terapeutico'], active: true },
  { id: 't2', name: 'Mariana Olvera', short: 'Mariana', specialties: ['relajante', 'holistico', 'piedras'], active: true },
  { id: 't3', name: 'Lucía Ferrer', short: 'Lucía', specialties: ['relajante', 'holistico', 'terapeutico'], active: true },
  { id: 't4', name: 'Camila Ibarra', short: 'Camila', specialties: ['deep', 'thai', 'piedras', 'terapeutico'], active: true },
  { id: 't5', name: 'Renata Solís', short: 'Renata', specialties: ['relajante', 'holistico', 'piedras', 'terapeutico'], active: true },
];

const CLIENTS = [
  'Andrea Mena', 'Bruno Calles', 'Carla Ugalde', 'Diego Arrieta', 'Elena Paz', 'Fernanda Quiroz', 'Gael Ontiveros',
  'Helena Ruiz', 'Iván Sepúlveda', 'Julia Barragán', 'Karen Vidal', 'Leonel Garza', 'Mónica Tapia', 'Nicolás Prado',
  'Olivia Cervantes', 'Pablo Medina', 'Regina Lazo', 'Sofía Ventura', 'Tomás Elizondo', 'Ximena Duarte',
];
const TIPS = [0, 150, 200, 0, 100, 250, 0, 300, 120, 0];
const PAYS = ['tarjeta', 'efectivo', 'transferencia', 'tarjeta'];

function emptyState() {
  return {
    version: SCHEMA_VERSION,
    config: JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
    therapists: JSON.parse(JSON.stringify(SEED_THERAPISTS)),
    sessions: [],
    advances: [],
    quincenas: {},
    counters: { session: 0, advance: 0 },
  };
}

/** Escenario: la quincena actual si ya pasaron 9 días o más; si no, la anterior. */
export function scenarioQuincena(today) {
  const q = quincenaOf(today);
  const { start } = quincenaRange(q);
  const elapsed = Number(today.split('-')[2]) - Number(start.split('-')[2]);
  return elapsed >= 9 ? q : prevQuincena(q);
}

export function makeSeed(today = todayISO()) {
  let state = emptyState();
  let n = 0;

  // Busca el primer horario libre desde `time` (y otra cabina si hace falta).
  const place = (p) => {
    const h = state.config.hours[weekday(p.date)];
    const cabins = p.modality === 'cabina' ? [p.cabinId || 'ceiba', ...state.config.cabins.map((c) => c.id)] : [null];
    for (let m = toMin(p.time); m + p.duration <= toMin(h.close); m += 15) {
      for (const cabinId of cabins) {
        const draft = { ...p, time: fromMin(m), cabinId, client: CLIENTS[n % CLIENTS.length], paymentMethod: PAYS[n % PAYS.length], notes: p.notes || '' };
        if (validateSession(state, draft).ok) {
          const res = createSession(state, draft);
          state = res.state;
          n += 1;
          return res.state.sessions[res.state.sessions.length - 1];
        }
      }
    }
    return null;
  };
  const finish = (s, status, extra = {}) => {
    if (!s) return;
    const t = state.sessions.find((x) => x.id === s.id);
    t.status = status;
    t.log.push({ at: new Date().toISOString(), status, ...(extra.noticeHours != null ? { noticeHours: extra.noticeHours } : {}) });
    if (status === 'realizada') t.tip = extra.tip ?? TIPS[n % TIPS.length];
    if (extra.noticeHours != null) t.noticeHours = extra.noticeHours;
  };

  const scenQ = scenarioQuincena(today);
  const scenStart = quincenaRange(scenQ).start;
  const prevQ = prevQuincena(scenQ);
  const prevStart = quincenaRange(prevQ).start;

  // ---- Quincena anterior: ya pagada, para tener recibos históricos ----
  for (const off of [2, 3, 4]) {
    const d = addDays(prevStart, off);
    finish(place({ date: d, time: '10:00', therapistId: 't1', massageId: 'deep', duration: 90, modality: 'cabina' }), 'realizada');
    finish(place({ date: d, time: '10:00', therapistId: 't2', massageId: 'relajante', duration: 60, modality: 'domicilio', coloniaId: 'roma' }), 'realizada');
    finish(place({ date: d, time: '12:00', therapistId: 't3', massageId: 'holistico', duration: 90, modality: 'cabina' }), 'realizada');
    finish(place({ date: d, time: '13:00', therapistId: 't4', massageId: 'thai', duration: 60, modality: 'cabina' }), 'realizada');
    finish(place({ date: d, time: '15:00', therapistId: 't5', massageId: 'piedras', duration: 60, modality: 'cabina' }), 'realizada');
  }
  ensureQuincena(state, prevStart);
  const pq = state.quincenas[prevQ];
  pq.snapshot = makeSnapshot(state, prevQ);
  pq.status = 'pagada';
  pq.approvedAt = new Date().toISOString();
  pq.paymentDate = addDays(scenStart, 1) <= today ? addDays(scenStart, 1) : scenStart;
  pq.history = [{ at: pq.approvedAt, from: 'abierta', to: 'pagada', seed: true }];

  // ---- Quincena del escenario (abierta) ----
  for (let off = 0; off <= 8; off++) {
    const d = addDays(scenStart, off);

    // Valentina: alto volumen, supera el escalón.
    finish(place({ date: d, time: '09:00', therapistId: 't1', massageId: 'thai', duration: 90, modality: 'cabina', cabinId: 'ceiba' }), 'realizada');
    finish(place({ date: d, time: '11:00', therapistId: 't1', massageId: 'deep', duration: 90, modality: 'cabina', cabinId: 'ceiba' }), 'realizada');
    if (off === 2 || off === 5) {
      finish(place({ date: d, time: '14:15', therapistId: 't1', massageId: 'terapeutico', duration: 60, modality: 'domicilio', coloniaId: 'condesa' }), 'realizada');
    } else {
      finish(place({ date: d, time: '13:30', therapistId: 't1', massageId: 'terapeutico', duration: 60, modality: 'cabina', cabinId: 'ceiba' }), 'realizada');
    }
    if (off >= 6) finish(place({ date: d, time: '16:00', therapistId: 't1', massageId: 'deep', duration: 60, modality: 'cabina', cabinId: 'ceiba' }), 'realizada');

    // Mariana: seis domicilios en Polanco + cabina los otros días.
    if ([0, 1, 3, 4, 6, 7].includes(off)) {
      const mm = ['relajante', 'piedras', 'holistico'][off % 3];
      const dur = off % 2 === 0 ? 90 : 60;
      finish(place({ date: d, time: '10:00', therapistId: 't2', massageId: mm, duration: dur, modality: 'domicilio', coloniaId: 'polanco', notes: 'Edificio con caseta: avisar al llegar.' }), 'realizada');
    } else {
      finish(place({ date: d, time: '15:00', therapistId: 't2', massageId: 'relajante', duration: 60, modality: 'cabina', cabinId: 'helecho' }), 'realizada');
    }

    // Lucía: dos cancelaciones con menos de 3 h de aviso.
    finish(place({ date: d, time: '10:00', therapistId: 't3', massageId: 'holistico', duration: 60, modality: 'cabina', cabinId: 'helecho' }), 'realizada');
    const l2 = place({ date: d, time: '13:00', therapistId: 't3', massageId: 'terapeutico', duration: 90, modality: 'cabina', cabinId: 'helecho' });
    if (off === 3) finish(l2, 'cancelada_con_cargo', { noticeHours: 1.5 });
    else if (off === 6) finish(l2, 'cancelada_con_cargo', { noticeHours: 2 });
    else if (off % 2 === 0) finish(l2, 'realizada');
    else finish(l2, 'realizada', { tip: 0 });

    // Camila: Deep tissue en cabina y Piedras a domicilio.
    finish(place({ date: d, time: '09:30', therapistId: 't4', massageId: 'deep', duration: 90, modality: 'cabina', cabinId: 'bambu' }), 'realizada');
    finish(place({ date: d, time: '14:30', therapistId: 't4', massageId: 'piedras', duration: 60, modality: off % 2 ? 'domicilio' : 'cabina', coloniaId: off % 4 === 1 ? 'roma' : 'delvalle', cabinId: 'bambu' }), 'realizada');

    // Renata: una ausencia, una cancelación a tiempo y un domicilio.
    const r1 = place({ date: d, time: '12:00', therapistId: 't5', massageId: off % 2 ? 'holistico' : 'relajante', duration: 60, modality: 'cabina', cabinId: 'bambu' });
    if (off === 2) finish(r1, 'no_show');
    else if (off === 5) finish(r1, 'cancelada_a_tiempo', { noticeHours: 26 });
    else finish(r1, 'realizada');
    if (off === 7) finish(place({ date: d, time: '16:00', therapistId: 't5', massageId: 'piedras', duration: 90, modality: 'domicilio', coloniaId: 'delvalle' }), 'realizada');
  }

  // Adelanto de Camila: la semana pasada, mal anotado en el cuaderno; acá queda con fecha y motivo.
  const advDate = addDays(scenStart, 4);
  state.counters.advance = 1;
  state.advances.push({ id: 'a1', code: 'A-0001', therapistId: 't4', date: advDate, amount: 2500, reason: 'Pedido por WhatsApp — gastos personales', createdAt: new Date().toISOString() });

  // ---- Agenda próxima: sesiones Agendadas desde hoy ----
  const upcoming = [
    { off: 0, time: '10:00', therapistId: 't2', massageId: 'piedras', duration: 90, modality: 'cabina', cabinId: 'helecho' },
    { off: 0, time: '12:00', therapistId: 't1', massageId: 'thai', duration: 60, modality: 'cabina', cabinId: 'ceiba' },
    { off: 0, time: '16:00', therapistId: 't3', massageId: 'relajante', duration: 60, modality: 'domicilio', coloniaId: 'roma' },
    { off: 1, time: '09:00', therapistId: 't4', massageId: 'deep', duration: 90, modality: 'cabina', cabinId: 'bambu' },
    { off: 1, time: '11:00', therapistId: 't5', massageId: 'holistico', duration: 90, modality: 'domicilio', coloniaId: 'condesa' },
    { off: 1, time: '15:00', therapistId: 't2', massageId: 'relajante', duration: 60, modality: 'domicilio', coloniaId: 'polanco' },
    { off: 2, time: '10:00', therapistId: 't1', massageId: 'terapeutico', duration: 90, modality: 'cabina', cabinId: 'ceiba' },
  ];
  for (const u of upcoming) {
    const d = addDays(today, u.off);
    place({ ...u, date: d });
  }

  state.seedInfo = { scenarioQuincena: scenQ, previousQuincena: prevQ, builtFor: today };
  return state;
}

export { totalsOf };
