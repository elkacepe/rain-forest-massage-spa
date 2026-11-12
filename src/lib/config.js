// Configuración inicial. Precios: los que publica el negocio. Todo lo demás es de prueba.

export const DEFAULT_CONFIG = {
  catalog: [
    { id: 'relajante', name: 'Relajante', prices: { 60: 1000, 90: 1300 } },
    { id: 'holistico', name: 'Holístico', prices: { 60: 1100, 90: 1450 } },
    { id: 'piedras', name: 'Piedras calientes', prices: { 60: 1200, 90: 1550 } },
    { id: 'deep', name: 'Deep tissue', prices: { 60: 1250, 90: 1600 } },
    { id: 'thai', name: 'Thai', prices: { 60: 1250, 90: 1600 } },
    { id: 'terapeutico', name: 'Terapéutico', prices: { 60: 1250, 90: 1600 } },
  ],
  cabins: [
    { id: 'ceiba', name: 'Cabina Ceiba' },
    { id: 'helecho', name: 'Cabina Helecho' },
    { id: 'bambu', name: 'Cabina Bambú' },
  ],
  colonias: [
    { id: 'roma', name: 'Roma Norte', viatico: 120 },
    { id: 'condesa', name: 'Condesa', viatico: 150 },
    { id: 'polanco', name: 'Polanco', viatico: 220 },
    { id: 'delvalle', name: 'Del Valle', viatico: 250 },
  ],
  // 0 = domingo … 6 = sábado
  hours: {
    0: { open: '09:00', close: '20:00' },
    1: { open: '09:00', close: '18:00' },
    2: { open: '09:00', close: '18:00' },
    3: { open: '09:00', close: '18:00' },
    4: { open: '09:00', close: '18:00' },
    5: { open: '09:00', close: '18:00' },
    6: { open: '09:00', close: '20:00' },
  },
  prepMinutes: 15,
  travelMinutes: 45,
  rates: {
    cabina: 35, // % del precio
    domicilio: 45,
    tierThreshold: 40000, // ventas realizadas por quincena
    tierBonus: 5, // puntos extra sobre el excedente
    cancelClientPct: 50,
    cancelTherapistPct: 20,
    lateCancelHours: 3,
    advanceMaxPct: 40,
  },
};

export function massageById(config, id) {
  return config.catalog.find((m) => m.id === id);
}
export function cabinById(config, id) {
  return config.cabins.find((c) => c.id === id);
}
export function coloniaById(config, id) {
  return config.colonias.find((c) => c.id === id);
}
export function therapistById(state, id) {
  return state.therapists.find((t) => t.id === id);
}
export function placeName(config, s) {
  if (s.modality === 'cabina') return cabinById(config, s.cabinId)?.name ?? '—';
  return coloniaById(config, s.coloniaId)?.name ?? '—';
}
