// Motor de liquidación. Funciones puras: reciben el estado y devuelven montos.
import { quincenaOf, prevQuincena, quincenaRange, daysInRange, weekday, toMin, todayISO } from './dates.js';
import { round2 } from './format.js';
import { CHARGED_CANCEL, CANCEL_STATUSES } from './constants.js';
import { coloniaById } from './config.js';

const byDateTime = (a, b) => (a.date + a.time + a.code).localeCompare(b.date + b.time + b.code);

export function isLocked(state, qid) {
  const q = state.quincenas[qid];
  return !!q && q.status !== 'abierta';
}

export function hasSnapshot(state, qid) {
  const q = state.quincenas[qid];
  return !!q && (q.status === 'aprobada' || q.status === 'pagada') && !!q.snapshot;
}

/**
 * Detalle de una terapeuta en una quincena, calculado con la configuración actual.
 * Las sesiones Realizadas se ordenan por fecha y hora: las que caen después del tope suben de porcentaje.
 * Si una sesión cruza el tope, solo la parte excedente paga los puntos extra.
 */
export function computeTherapistLive(state, qid, therapistId, _depth = 0) {
  const { config } = state;
  const r = config.rates;
  const sessions = state.sessions
    .filter((s) => s.therapistId === therapistId && quincenaOf(s.date) === qid)
    .sort(byDateTime);

  let ventas = 0;
  const lines = [];
  const tot = { comisionBase: 0, comisionEscalon: 0, pagoCancelaciones: 0, viaticos: 0, propinas: 0, cargosCliente: 0 };
  let pendientes = 0;

  for (const s of sessions) {
    const line = {
      sessionId: s.id, code: s.code, date: s.date, time: s.time, massageId: s.massageId, duration: s.duration,
      modality: s.modality, cabinId: s.cabinId, coloniaId: s.coloniaId, status: s.status, price: s.price,
      ventaComputable: 0, baseRate: 0, montoBase: 0, montoEscalon: 0, comision: 0, viatico: 0, propina: 0,
      cargoCliente: 0, pagoCancelacion: 0, subtotal: 0,
    };
    if (s.status === 'realizada') {
      const base = s.modality === 'domicilio' ? r.domicilio : r.cabina;
      const before = ventas;
      ventas = round2(ventas + s.price);
      const enBase = Math.max(0, Math.min(s.price, r.tierThreshold - before));
      const excedente = round2(s.price - enBase);
      line.ventaComputable = s.price;
      line.baseRate = base;
      line.montoBase = enBase;
      line.montoEscalon = excedente;
      const cBase = round2((enBase * base) / 100);
      const cEsc = round2((excedente * (base + r.tierBonus)) / 100);
      line.comisionBaseParte = cBase;
      line.comisionEscalonParte = cEsc;
      // lo que el escalón agrega por encima de la tasa base
      line.extraEscalon = round2((excedente * r.tierBonus) / 100);
      line.comision = round2(cBase + cEsc);
      line.viatico = s.modality === 'domicilio' ? coloniaById(config, s.coloniaId)?.viatico ?? 0 : 0;
      line.propina = round2(s.tip || 0);
      tot.comisionBase = round2(tot.comisionBase + line.comision - line.extraEscalon);
      tot.comisionEscalon = round2(tot.comisionEscalon + line.extraEscalon);
      tot.viaticos = round2(tot.viaticos + line.viatico);
      tot.propinas = round2(tot.propinas + line.propina);
    } else if (CHARGED_CANCEL.includes(s.status)) {
      line.cargoCliente = round2((s.price * r.cancelClientPct) / 100);
      line.pagoCancelacion = round2((s.price * r.cancelTherapistPct) / 100);
      tot.pagoCancelaciones = round2(tot.pagoCancelaciones + line.pagoCancelacion);
      tot.cargosCliente = round2(tot.cargosCliente + line.cargoCliente);
    } else if (s.status === 'agendada') {
      pendientes += 1;
    }
    line.subtotal = round2(line.comision + line.pagoCancelacion + line.viatico + line.propina);
    lines.push(line);
  }

  const advances = state.advances
    .filter((a) => a.therapistId === therapistId && quincenaOf(a.date) === qid)
    .sort((a, b) => (a.date + a.code).localeCompare(b.date + b.code));
  const adelantos = round2(advances.reduce((acc, a) => acc + a.amount, 0));

  const aDescontar = _depth > 48 ? 0 : carryFromPrevious(state, qid, therapistId, _depth + 1);

  const comisiones = round2(tot.comisionBase + tot.comisionEscalon + tot.pagoCancelaciones);
  const ganado = round2(comisiones + tot.viaticos + tot.propinas);
  const neto = round2(ganado - adelantos - aDescontar);

  return {
    therapistId,
    qid,
    ventas,
    superoEscalon: ventas > r.tierThreshold,
    excedente: round2(Math.max(0, ventas - r.tierThreshold)),
    ...tot,
    comisiones,
    ganado,
    adelantos,
    aDescontar,
    neto,
    pendientes,
    lines,
    advances: advances.map((a) => ({ id: a.id, code: a.code, date: a.date, amount: a.amount, reason: a.reason })),
    rates: { ...r },
  };
}

/** Saldo negativo de la quincena anterior que pasa como «A descontar». */
export function carryFromPrevious(state, qid, therapistId, depth = 0) {
  const prev = prevQuincena(qid);
  if (!state.quincenas[prev]) return 0;
  const row = therapistRow(state, prev, therapistId, depth);
  return row && row.neto < 0 ? round2(-row.neto) : 0;
}

/** Fila de una terapeuta: copia guardada si la quincena está Aprobada o Pagada; si no, cálculo vivo. */
export function therapistRow(state, qid, therapistId, depth = 0) {
  if (hasSnapshot(state, qid)) {
    return state.quincenas[qid].snapshot.rows.find((r) => r.therapistId === therapistId) ?? null;
  }
  return computeTherapistLive(state, qid, therapistId, depth);
}

export function liquidationRows(state, qid) {
  if (hasSnapshot(state, qid)) return state.quincenas[qid].snapshot.rows;
  return state.therapists.map((t) => computeTherapistLive(state, qid, t.id));
}

export function totalsOf(rows) {
  const sum = (k) => round2(rows.reduce((acc, r) => acc + (r[k] || 0), 0));
  return {
    ventas: sum('ventas'),
    comisiones: sum('comisiones'),
    viaticos: sum('viaticos'),
    propinas: sum('propinas'),
    adelantos: sum('adelantos'),
    aDescontar: sum('aDescontar'),
    neto: sum('neto'),
    cargosCliente: sum('cargosCliente'),
    pagoCancelaciones: sum('pagoCancelaciones'),
  };
}

export function makeSnapshot(state, qid) {
  const rows = state.therapists.map((t) => computeTherapistLive(state, qid, t.id));
  return {
    takenAt: new Date().toISOString(),
    rows,
    totals: totalsOf(rows),
    therapistNames: Object.fromEntries(state.therapists.map((t) => [t.id, t.name])),
    rates: { ...state.config.rates },
    viaticos: Object.fromEntries(state.config.colonias.map((c) => [c.id, c.viatico])),
  };
}

/**
 * Límite de adelantos: el total no puede pasar del 40 % de lo ganado en la quincena.
 * Se compara contra (40 % de lo ganado) − adelantos ya registrados, así varios adelantos chicos
 * no pueden sumar más que el tope.
 */
export function advanceCheck(state, therapistId, dateISO, amount) {
  const qid = quincenaOf(dateISO);
  const pct = state.config.rates.advanceMaxPct;
  const row = computeTherapistLive(state, qid, therapistId);
  const tope = round2((row.ganado * pct) / 100);
  const disponible = round2(Math.max(0, tope - row.adelantos));
  const base = { qid, ganado: row.ganado, yaRegistrados: row.adelantos, tope, disponible, pct };
  if (!(amount > 0)) return { ok: false, reason: 'El monto tiene que ser mayor a cero.', ...base };
  if (isLocked(state, qid)) {
    return { ok: false, reason: `La quincena está ${state.quincenas[qid].status === 'en_revision' ? 'en revisión' : 'cerrada'}: no se pueden registrar adelantos.`, ...base };
  }
  if (amount > disponible + 0.001) {
    return {
      ok: false,
      reason: `Supera el ${pct} % de lo ganado. Lleva ganado ${fmt(row.ganado)} y ya tiene ${fmt(row.adelantos)} en adelantos: el máximo disponible es ${fmt(disponible)}.`,
      ...base,
    };
  }
  return { ok: true, ...base };
}

const fmt = (n) => `$${round2(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** Métricas de la quincena para Dirección. */
export function metrics(state, qid, today = todayISO()) {
  const { config } = state;
  const rows = liquidationRows(state, qid);
  const totals = totalsOf(rows);
  const sessions = state.sessions.filter((s) => quincenaOf(s.date) === qid);
  const realizadas = sessions.filter((s) => s.status === 'realizada');
  const cerradas = sessions.filter((s) => s.status !== 'agendada');
  const canceladas = sessions.filter((s) => CANCEL_STATUSES.includes(s.status));

  const ingresos = round2(totals.ventas + totals.cargosCliente);
  const pagosComision = totals.comisiones; // incluye el 20 % de cancelaciones
  const ticket = realizadas.length ? round2(totals.ventas / realizadas.length) : 0;

  // Ocupación: minutos ocupados por sesiones realizadas en cabina (duración + preparación)
  // sobre minutos de apertura × cabinas, desde el inicio de la quincena hasta hoy (o su cierre).
  const { start, end } = quincenaRange(qid);
  const until = end < today ? end : today;
  const days = until >= start ? daysInRange(start, until) : [];
  const dispPorCabina = days.reduce((acc, d) => {
    const h = config.hours[weekday(d)];
    return acc + (toMin(h.close) - toMin(h.open));
  }, 0);
  const disponibles = dispPorCabina * config.cabins.length;
  const ocupados = realizadas
    .filter((s) => s.modality === 'cabina' && s.date <= until)
    .reduce((acc, s) => acc + s.duration + config.prepMinutes, 0);

  const ranking = rows
    .map((r) => ({ therapistId: r.therapistId, ventas: r.ventas, neto: r.neto, sesiones: realizadas.filter((s) => s.therapistId === r.therapistId).length, superoEscalon: r.superoEscalon }))
    .sort((a, b) => b.ventas - a.ventas);

  return {
    ingresos,
    ventas: totals.ventas,
    cargosCliente: totals.cargosCliente,
    pctComisiones: ingresos ? pagosComision / ingresos : NaN,
    comisiones: pagosComision,
    ticket,
    ocupacion: disponibles ? ocupados / disponibles : NaN,
    ocupados,
    disponibles,
    pctCancelaciones: cerradas.length ? canceladas.length / cerradas.length : NaN,
    canceladas: canceladas.length,
    cerradas: cerradas.length,
    realizadas: realizadas.length,
    totalAPagar: totals.neto,
    ranking,
    totals,
  };
}
