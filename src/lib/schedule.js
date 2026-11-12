// Agenda: horario del negocio, cabinas, traslados y especialidades.
import { toMin, fromMin, weekday, quincenaOf, quincenaLabel } from './dates.js';
import { ACTIVE_STATUSES, HEALTH_WORDS } from './constants.js';
import { cabinById, massageById, coloniaById, therapistById } from './config.js';

const overlap = (a, b) => a[0] < b[1] && b[0] < a[1];

/** Intervalo que ocupa la cabina: duración + preparación. */
export function cabinBlock(config, s) {
  const st = toMin(s.time);
  return [st, st + s.duration + config.prepMinutes];
}

/** Intervalo que bloquea a la terapeuta. Domicilio: ±45 min de traslado. Cabina: duración + preparación. */
export function therapistBlock(config, s) {
  const st = toMin(s.time);
  if (s.modality === 'domicilio') return [st - config.travelMinutes, st + s.duration + config.travelMinutes];
  return [st, st + s.duration + config.prepMinutes];
}

export function healthNoteIssue(notes) {
  const t = (notes || '').toLowerCase();
  const hit = HEALTH_WORDS.find((w) => t.includes(w));
  return hit ? 'Las notas no pueden incluir datos de salud. Anotá solo datos operativos (acceso, timbre, preferencias de música).' : null;
}

/**
 * Valida una sesión (nueva o editada). Devuelve { ok, errors: string[] }.
 * ignoreId: id de la propia sesión al editar o reactivar.
 */
export function validateSession(state, draft, ignoreId = null) {
  const { config } = state;
  const errors = [];
  const req = ['date', 'time', 'therapistId', 'massageId', 'duration', 'modality'];
  for (const k of req) if (!draft[k]) errors.push('Completá todos los campos obligatorios.');
  if (errors.length) return { ok: false, errors: [errors[0]] };
  if (draft.modality === 'cabina' && !draft.cabinId) return { ok: false, errors: ['Elegí una cabina.'] };
  if (draft.modality === 'domicilio' && !draft.coloniaId) return { ok: false, errors: ['Elegí la colonia del domicilio.'] };

  const qid = quincenaOf(draft.date);
  const q = state.quincenas[qid];
  if (q && q.status !== 'abierta') {
    errors.push(`La quincena ${quincenaLabel(qid)} está ${q.status === 'en_revision' ? 'en revisión' : q.status === 'aprobada' ? 'aprobada' : 'pagada'}: ya no se pueden cargar ni modificar sesiones.`);
    return { ok: false, errors };
  }

  const t = therapistById(state, draft.therapistId);
  const m = massageById(config, draft.massageId);
  if (!t || !t.active) errors.push('La terapeuta no está disponible.');
  if (!m) errors.push('El masaje no existe en el catálogo.');
  if (t && m && !t.specialties.includes(m.id)) errors.push(`${t.name} no tiene ${m.name} entre sus especialidades.`);

  const h = config.hours[weekday(draft.date)];
  const st = toMin(draft.time);
  const end = st + Number(draft.duration);
  if (st < toMin(h.open)) errors.push(`El spa abre a las ${h.open}.`);
  if (end > toMin(h.close)) errors.push(`No entra antes del cierre: termina ${fromMin(end)} y el spa cierra a las ${h.close}.`);

  const others = state.sessions.filter((s) => s.id !== ignoreId && s.date === draft.date && ACTIVE_STATUSES.includes(s.status));
  const d = { ...draft, duration: Number(draft.duration) };

  if (d.modality === 'cabina') {
    const blk = cabinBlock(config, d);
    for (const o of others) {
      if (o.modality !== 'cabina' || o.cabinId !== d.cabinId) continue;
      const ob = cabinBlock(config, o);
      if (overlap(blk, ob)) {
        errors.push(`${cabinById(config, d.cabinId).name} está ocupada de ${fromMin(ob[0])} a ${fromMin(ob[1])} (${o.code}, incluye ${config.prepMinutes} min de preparación).`);
        break;
      }
    }
  }

  const tb = therapistBlock(config, d);
  for (const o of others) {
    if (o.therapistId !== d.therapistId) continue;
    const ob = therapistBlock(config, o);
    if (overlap(tb, ob)) {
      const extra = o.modality === 'domicilio' || d.modality === 'domicilio' ? 'contando traslados de domicilio' : `contando ${config.prepMinutes} min de preparación`;
      errors.push(`${t?.name ?? 'La terapeuta'} ya tiene ${o.code} a las ${o.time} (bloqueada de ${fromMin(Math.max(0, ob[0]))} a ${fromMin(ob[1])}, ${extra}).`);
      break;
    }
  }

  const noteIssue = healthNoteIssue(draft.notes);
  if (noteIssue) errors.push(noteIssue);

  return { ok: errors.length === 0, errors };
}

/** Horarios de inicio libres (cada 15 min) para un borrador dado. */
export function freeSlots(state, draft, ignoreId = null) {
  if (!draft.date || !draft.duration || !draft.therapistId || !draft.massageId) return [];
  if (draft.modality === 'cabina' && !draft.cabinId) return [];
  if (draft.modality === 'domicilio' && !draft.coloniaId) return [];
  const h = state.config.hours[weekday(draft.date)];
  const out = [];
  for (let m = toMin(h.open); m + Number(draft.duration) <= toMin(h.close); m += 15) {
    const time = fromMin(m);
    const v = validateSession(state, { ...draft, time, notes: '' }, ignoreId);
    if (v.ok) out.push(time);
  }
  return out;
}

export function priceFor(config, massageId, duration) {
  return massageById(config, massageId)?.prices?.[duration] ?? 0;
}

export { coloniaById };
