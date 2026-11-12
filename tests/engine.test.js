import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSeed, scenarioQuincena } from '../src/lib/seed.js';
import { computeTherapistLive, liquidationRows, advanceCheck, metrics, therapistRow } from '../src/lib/engine.js';
import { createSession, updateSession, addAdvance, setQuincenaStatus, updateConfig, loadState, saveState } from '../src/lib/store.js';
import { validateSession } from '../src/lib/schedule.js';
import { quincenaOf, quincenaRange, addDays, nextQuincena } from '../src/lib/dates.js';
import { STORAGE_KEY } from '../src/lib/constants.js';

const TODAY = '2026-11-12';
const seed = () => makeSeed(TODAY);

// Estado mínimo para casos controlados
function blank() {
  const s = seed();
  s.sessions = []; s.advances = []; s.quincenas = {}; s.counters = { session: 0, advance: 0 };
  return s;
}
function addDone(st, d) {
  const r = createSession(st, d); assert.ok(r.state, JSON.stringify(r.error));
  const u = updateSession(r.state, r.session.id, { status: 'realizada', ...(d.tip ? { tip: d.tip } : {}) });
  assert.ok(u.state, JSON.stringify(u.error));
  return u.state;
}

test('la semilla genera el caso del briefing', () => {
  const st = seed();
  const q = scenarioQuincena(TODAY);
  assert.equal(q, '2026-11-1');
  const rows = liquidationRows(st, q);
  const by = Object.fromEntries(rows.map(r => [r.therapistId, r]));
  assert.ok(by.t1.superoEscalon, 'Valentina supera el escalón');
  assert.equal(by.t1.ventas, 43800);
  const polanco = st.sessions.filter(s => s.therapistId === 't2' && quincenaOf(s.date) === q && s.coloniaId === 'polanco' && s.status === 'realizada');
  assert.equal(polanco.length, 6);
  const late = st.sessions.filter(s => s.therapistId === 't3' && quincenaOf(s.date) === q && s.status === 'cancelada_con_cargo');
  assert.equal(late.length, 2);
  assert.equal(by.t4.adelantos, 2500);
  console.log('Resumen semilla', rows.map(r => ({ t: r.therapistId, ventas: r.ventas, com: r.comisiones, via: r.viaticos, prop: r.propinas, adel: r.adelantos, neto: r.neto })));
});

test('C2 cabina 35 % y domicilio 45 % + viático', () => {
  let st = blank();
  st = addDone(st, { date: '2026-11-03', time: '10:00', therapistId: 't1', massageId: 'thai', duration: 90, modality: 'cabina', cabinId: 'ceiba' });
  st = addDone(st, { date: '2026-11-04', time: '10:00', therapistId: 't1', massageId: 'thai', duration: 90, modality: 'domicilio', coloniaId: 'polanco' });
  const r = computeTherapistLive(st, '2026-11-1', 't1');
  assert.equal(r.lines[0].comision, 560);  // 1600 × 35 %
  assert.equal(r.lines[1].comision, 720);  // 1600 × 45 %
  assert.equal(r.viaticos, 220);
  assert.equal(r.neto, 1500);
});

test('C3 y C4: escalón solo sobre el excedente, propinas fuera del escalón', () => {
  let st = blank();
  // 25 sesiones cabina de $1,600 = $40,000 justo; propinas grandes no deben empujar el escalón
  const days = ['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08','2026-11-09','2026-11-10'];
  let n = 0;
  for (const d of days) for (const t of ['09:00','10:45','12:30']) {
    if (n === 25) break;
    st = addDone(st, { date: d, time: t, therapistId: 't1', massageId: 'deep', duration: 90, modality: 'cabina', cabinId: 'ceiba', tip: 500 });
    n++;
  }
  let r = computeTherapistLive(st, '2026-11-1', 't1');
  assert.equal(r.ventas, 40000);
  assert.equal(r.superoEscalon, false);
  assert.equal(r.comisiones, 14000);
  assert.equal(r.propinas, 12500);
  // una más de $1,600: todo el monto es excedente → 40 %
  st = addDone(st, { date: '2026-11-10', time: '14:15', therapistId: 't1', massageId: 'deep', duration: 90, modality: 'cabina', cabinId: 'ceiba' });
  r = computeTherapistLive(st, '2026-11-1', 't1');
  assert.equal(r.excedente, 1600);
  assert.equal(r.comisiones, 14000 + 640);
  assert.equal(r.comisionEscalon, 80);
  assert.equal(r.neto, 14640 + 12500);
});

test('C3: una sesión que cruza el tope se divide', () => {
  let st = blank();
  // 24 × 1600 = 38,400; la siguiente de 1,600 deja 1,600 en base y 0... usamos 25ª de 1,600 tras 38,400+1,250
  const d0 = ['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08','2026-11-09'];
  let n = 0;
  for (const d of d0) for (const t of ['09:00','10:45','12:30']) { if (n === 24) break; st = addDone(st, { date: d, time: t, therapistId: 't1', massageId: 'deep', duration: 90, modality: 'cabina', cabinId: 'ceiba' }); n++; }
  st = addDone(st, { date: '2026-11-10', time: '09:00', therapistId: 't1', massageId: 'deep', duration: 60, modality: 'cabina', cabinId: 'ceiba' }); // 39,650
  st = addDone(st, { date: '2026-11-10', time: '11:15', therapistId: 't1', massageId: 'deep', duration: 90, modality: 'domicilio', coloniaId: 'roma' }); // cruza: 350 base, 1250 excedente
  const r = computeTherapistLive(st, '2026-11-1', 't1');
  const last = r.lines.at(-1);
  assert.equal(last.montoBase, 350);
  assert.equal(last.montoEscalon, 1250);
  assert.equal(last.comision, 350 * 0.45 + 1250 * 0.50);
});

test('C1: conflictos de cabina y terapeuta con preparación y traslado', () => {
  let st = blank();
  st = createSession(st, { date: '2026-11-03', time: '10:00', therapistId: 't1', massageId: 'thai', duration: 60, modality: 'cabina', cabinId: 'ceiba' }).state;
  // misma cabina a las 11:00 (termina 11:00 + 15 prep) → rechazo
  assert.equal(validateSession(st, { date: '2026-11-03', time: '11:00', therapistId: 't2', massageId: 'relajante', duration: 60, modality: 'cabina', cabinId: 'ceiba' }).ok, false);
  assert.equal(validateSession(st, { date: '2026-11-03', time: '11:15', therapistId: 't2', massageId: 'relajante', duration: 60, modality: 'cabina', cabinId: 'ceiba' }).ok, true);
  // misma terapeuta en otra cabina a las 11:00 → rechazo por preparación
  assert.equal(validateSession(st, { date: '2026-11-03', time: '11:00', therapistId: 't1', massageId: 'thai', duration: 60, modality: 'cabina', cabinId: 'bambu' }).ok, false);
  // domicilio necesita 45 min antes y después
  assert.equal(validateSession(st, { date: '2026-11-03', time: '11:30', therapistId: 't1', massageId: 'thai', duration: 60, modality: 'domicilio', coloniaId: 'roma' }).ok, false);
  assert.equal(validateSession(st, { date: '2026-11-03', time: '12:00', therapistId: 't1', massageId: 'thai', duration: 60, modality: 'domicilio', coloniaId: 'roma' }).ok, true);
  // especialidad y cierre
  assert.equal(validateSession(st, { date: '2026-11-03', time: '12:00', therapistId: 't2', massageId: 'thai', duration: 60, modality: 'cabina', cabinId: 'bambu' }).ok, false);
  assert.equal(validateSession(st, { date: '2026-11-03', time: '17:00', therapistId: 't2', massageId: 'relajante', duration: 90, modality: 'cabina', cabinId: 'bambu' }).ok, false);
  // al cancelar se libera
  const id = st.sessions[0].id;
  st = updateSession(st, id, { status: 'cancelada_a_tiempo' }).state;
  assert.equal(validateSession(st, { date: '2026-11-03', time: '10:00', therapistId: 't2', massageId: 'relajante', duration: 60, modality: 'cabina', cabinId: 'ceiba' }).ok, true);
});

test('C6: cancelación tardía y No se presentó: 50 % cliente, 20 % terapeuta, fuera del escalón', () => {
  let st = blank();
  const a = createSession(st, { date: '2026-11-03', time: '10:00', therapistId: 't3', massageId: 'terapeutico', duration: 90, modality: 'cabina', cabinId: 'ceiba' });
  st = updateSession(a.state, a.session.id, { status: 'cancelada_con_cargo', noticeHours: 1 }).state;
  const b = createSession(st, { date: '2026-11-04', time: '10:00', therapistId: 't3', massageId: 'relajante', duration: 60, modality: 'cabina', cabinId: 'ceiba' });
  st = updateSession(b.state, b.session.id, { status: 'no_show' }).state;
  const r = computeTherapistLive(st, '2026-11-1', 't3');
  assert.equal(r.ventas, 0);
  assert.equal(r.cargosCliente, 800 + 500);
  assert.equal(r.pagoCancelaciones, 320 + 200);
  assert.equal(r.neto, 520);
});

test('C5: adelantos topeados al 40 % de lo ganado menos lo ya adelantado', () => {
  let st = blank();
  st = addDone(st, { date: '2026-11-03', time: '10:00', therapistId: 't4', massageId: 'deep', duration: 90, modality: 'cabina', cabinId: 'ceiba' });
  st = addDone(st, { date: '2026-11-04', time: '10:00', therapistId: 't4', massageId: 'deep', duration: 90, modality: 'cabina', cabinId: 'ceiba', tip: 300 });
  // ganado = 560 + 560 + 300 = 1420 → tope 568
  assert.equal(advanceCheck(st, 't4', '2026-11-05', 600).ok, false);
  let r = addAdvance(st, { therapistId: 't4', date: '2026-11-05', amount: 300, reason: 'x' }); st = r.state;
  r = addAdvance(st, { therapistId: 't4', date: '2026-11-06', amount: 268, reason: 'x' }); assert.ok(r.state); st = r.state;
  r = addAdvance(st, { therapistId: 't4', date: '2026-11-06', amount: 1, reason: 'x' });
  assert.ok(r.error && /40 %/.test(r.error[0]), 'tercer adelanto chico rechazado con motivo');
  assert.equal(computeTherapistLive(st, '2026-11-1', 't4').neto, 1420 - 568);
});

test('saldo negativo pasa como A descontar a la quincena siguiente', () => {
  let st = blank();
  st = addDone(st, { date: '2026-11-03', time: '10:00', therapistId: 't4', massageId: 'deep', duration: 90, modality: 'cabina', cabinId: 'ceiba' });
  st = addAdvance(st, { therapistId: 't4', date: '2026-11-05', amount: 224, reason: 'x' }).state;
  // la sesión se corrige a cancelada a tiempo → neto negativo
  st = updateSession(st, st.sessions[0].id, { status: 'cancelada_a_tiempo' }).state;
  assert.equal(computeTherapistLive(st, '2026-11-1', 't4').neto, -224);
  st = addDone(st, { date: '2026-11-18', time: '10:00', therapistId: 't4', massageId: 'deep', duration: 90, modality: 'cabina', cabinId: 'ceiba' });
  const r = computeTherapistLive(st, '2026-11-2', 't4');
  assert.equal(r.aDescontar, 224);
  assert.equal(r.neto, 560 - 224);
});

test('C7: aprobada no cambia con tarifas nuevas; revisión bloquea carga; pagada exige fecha', () => {
  let st = seed();
  const q = '2026-11-1';
  const before = liquidationRows(st, q).find(r => r.therapistId === 't1').neto;
  st = setQuincenaStatus(st, q, 'en_revision').state;
  assert.ok(createSession(st, { date: '2026-11-14', time: '17:00', therapistId: 't2', massageId: 'relajante', duration: 60, modality: 'cabina', cabinId: 'bambu' }).error);
  st = setQuincenaStatus(st, q, 'aprobada').state;
  const cfg = JSON.parse(JSON.stringify(st.config)); cfg.rates.cabina = 50; cfg.colonias[2].viatico = 999;
  st = updateConfig(st, cfg).state;
  assert.equal(liquidationRows(st, q).find(r => r.therapistId === 't1').neto, before);
  assert.ok(setQuincenaStatus(st, q, 'pagada').error);
  assert.ok(setQuincenaStatus(st, q, 'pagada', { paymentDate: '2026-11-16' }).state);
});

test('C10: neto del recibo = fila de la liquidación', () => {
  const st = seed();
  for (const r of liquidationRows(st, '2026-11-1')) {
    const rec = therapistRow(st, '2026-11-1', r.therapistId);
    const sum = rec.lines.reduce((a, l) => a + l.subtotal, 0) - rec.adelantos - rec.aDescontar;
    assert.equal(Math.round(sum * 100), Math.round(r.neto * 100));
  }
});

test('la quincena nueva se abre sola', () => {
  let st = seed();
  const r = createSession(st, { date: '2026-12-02', time: '10:00', therapistId: 't2', massageId: 'relajante', duration: 60, modality: 'cabina', cabinId: 'bambu' });
  assert.equal(r.state.quincenas['2026-12-1'].status, 'abierta');
});

test('persistencia: semilla solo sin clave; lista vacía se respeta; fallo no altera', () => {
  const mem = new Map();
  const storage = { getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, v) };
  const a = loadState(storage, seed);
  assert.equal(a.status, 'seeded');
  const empty = { ...a.state, sessions: [], advances: [] };
  saveState(storage, empty);
  const b = loadState(storage, seed);
  assert.equal(b.status, 'ok');
  assert.equal(b.state.sessions.length, 0);
  const broken = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.equal(saveState(broken, empty).ok, false);
  assert.ok(mem.has(STORAGE_KEY));
});

test('métricas', () => {
  const m = metrics(seed(), '2026-11-1', TODAY);
  assert.ok(m.ingresos > 0 && m.ticket > 0 && m.ocupacion > 0 && m.ocupacion < 1);
  console.log('Métricas', { ingresos: m.ingresos, pctCom: m.pctComisiones.toFixed(3), ticket: m.ticket, ocup: m.ocupacion.toFixed(3), canc: m.pctCancelaciones.toFixed(3), aPagar: m.totalAPagar });
});
