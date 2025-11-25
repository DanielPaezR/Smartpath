// frontend/src/utils/statusNormalizer.ts
export type VisitStatus = 'pending' | 'in-progress' | 'in_progress' | 'completed' | 'skipped';

/**
 * Normaliza cualquier formato de status a un formato consistente
 */
export const normalizeStatus = (status: string): VisitStatus => {
  if (!status) return 'pending';
  
  const normalized = status.toLowerCase().trim();
  
  // Convierte cualquier variación de "in progress" a 'in-progress'
  if (normalized === 'in_progress' || normalized === 'in-progress' || normalized === 'in progress') {
    return 'in-progress';
  }
  
  // Para otros status, verifica si está en la lista de manera compatible
  const validStatuses: VisitStatus[] = ['pending', 'completed', 'skipped'];
  if (validStatuses.indexOf(normalized as VisitStatus) !== -1) {
    return normalized as VisitStatus;
  }
  
  // Valor por defecto para status desconocidos
  console.warn(`Status desconocido: "${status}", usando "pending" por defecto`);
  return 'pending';
};

/**
 * Convierte el status a formato de base de datos (si es necesario)
 */
export const toDatabaseStatus = (status: VisitStatus): string => {
  // Si tu BD usa 'in_progress', convierte a ese formato
  return status === 'in-progress' ? 'in_progress' : status;
};

/**
 * Convierte el status a formato de frontend (si es necesario)
 */
export const toFrontendStatus = (status: string): VisitStatus => {
  return normalizeStatus(status);
};

/**
 * Verifica si un status indica que la visita está en progreso
 */
export const isVisitInProgress = (status: string): boolean => {
  const normalized = normalizeStatus(status);
  return normalized === 'in-progress';
};

/**
 * Verifica si un status indica que la visita está completada
 */
export const isVisitCompleted = (status: string): boolean => {
  const normalized = normalizeStatus(status);
  return normalized === 'completed';
};