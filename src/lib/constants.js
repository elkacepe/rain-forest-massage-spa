// Claves y valores fijos. La clave del panel es compartida, vive en el código y está documentada
// en README.md. No es autenticación real: solo evita que alguien entre por accidente.
export const STORAGE_KEY = 'rainforest-spa.liquidaciones.v1';
export const ROLE_KEY = 'rainforest-spa.rol.v1'; // en sessionStorage
export const PANEL_KEY = 'selva2026';

export const STATUS = {
  agendada: 'Agendada',
  realizada: 'Realizada',
  cancelada_a_tiempo: 'Cancelada a tiempo',
  cancelada_con_cargo: 'Cancelada con cargo',
  no_show: 'No se presentó',
};

export const ACTIVE_STATUSES = ['agendada', 'realizada']; // ocupan agenda; las cancelaciones liberan
export const CHARGED_CANCEL = ['cancelada_con_cargo', 'no_show'];
export const CANCEL_STATUSES = ['cancelada_a_tiempo', 'cancelada_con_cargo', 'no_show'];

export const Q_STATUS = {
  abierta: 'Abierta',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  pagada: 'Pagada',
};

export const PAYMENT_METHODS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };

export const MODALITY = { cabina: 'Cabina', domicilio: 'Domicilio' };

export const ROLES = { direccion: 'Dirección', recepcion: 'Recepción', terapeuta: 'Terapeuta' };

// Palabras que delatan datos de salud en las notas. Las notas son operativas, no clínicas.
export const HEALTH_WORDS = [
  'lesión', 'lesion', 'embaraz', 'diabet', 'hernia', 'presión', 'presion arterial', 'hipertens',
  'cirug', 'operad', 'fractura', 'medicament', 'enfermedad', 'diagn', 'cáncer', 'cancer',
  'alergi', 'dolor', 'contractura', 'esguince', 'tendinitis', 'ciática', 'ciatica', 'migraña',
];
