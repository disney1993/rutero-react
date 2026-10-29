// Capacidad de propietario / conductor según los flags que appendea la API
// en el usuario (`has_owner_capability`, `has_driver_capability`, `work_mode`,
// `effective_work_mode`).

export function isOwnerCapable(user, isAdmin = false) {
  return !!isAdmin || !!user?.has_owner_capability;
}

// Conductor puro: se ha unido a códigos y aún no tiene capacidad de propietario
// (ni vehículos ni códigos de mes propios).
export function isDriverOnly(user, isAdmin = false) {
  return !isAdmin && !!user?.has_driver_capability && !user?.has_owner_capability;
}

/**
 * Cambio de modo: cualquier no-admin con capacidad de propietario puede
 * probar modo conductor (y volver). Conductores puros quedan bloqueados
 * hasta ganar capacidad de propietario (p. ej. añadir un vehículo).
 * No exige has_driver_capability: el owner demo debe poder entrar a driver
 * para unirse a códigos.
 */
export function canSwitchWorkMode(user, isAdmin = false) {
  return !isAdmin && !!user?.has_owner_capability;
}

/** Iconos MaterialCommunityIcons alineados entre chip y selector. */
export const WORK_MODE_ICONS = {
  owner: 'briefcase-outline',
  driver: 'steering',
};

/**
 * Modo UX activo: owner | driver.
 * Con capacidad de propietario, work_mode (preferencia) manda aunque aún no
 * tenga has_driver_capability — así puede ver UI de unir códigos. Conductor
 * puro → siempre driver. effective_work_mode es fallback de la API.
 */
export function resolveWorkMode(user, isAdmin = false) {
  if (isAdmin) return 'owner';
  const owner = !!user?.has_owner_capability;
  const driver = !!user?.has_driver_capability;
  if (owner) {
    if (user?.work_mode === 'driver' || user?.work_mode === 'owner') {
      return user.work_mode;
    }
    if (user?.effective_work_mode === 'owner' || user?.effective_work_mode === 'driver') {
      return user.effective_work_mode;
    }
    return 'owner';
  }
  if (driver) return 'driver';
  if (user?.effective_work_mode === 'owner' || user?.effective_work_mode === 'driver') {
    return user.effective_work_mode;
  }
  return 'owner';
}

/**
 * Aplica la respuesta de PATCH /user/preferences al usuario en sesión,
 * forzando work_mode + effective_work_mode para feedback inmediato.
 */
export function mergeWorkModePreference(userPatch, mode) {
  const data = userPatch && typeof userPatch === 'object' ? userPatch : {};
  return {
    ...data,
    work_mode: data.work_mode === 'owner' || data.work_mode === 'driver' ? data.work_mode : mode,
    effective_work_mode:
      data.effective_work_mode === 'owner' || data.effective_work_mode === 'driver'
        ? data.effective_work_mode
        : mode,
  };
}

/** ¿Está la UI en modo conductor (jornadas visitadas)? */
export function isDriverWorkMode(user, isAdmin = false) {
  return resolveWorkMode(user, isAdmin) === 'driver';
}

// Pestaña vehículos: admin y modo propietario (incl. usuarios nuevos sin
// flags, para el primer coche). Oculta en modo conductor (puro o preferencia).
export function canManageVehicles(user, isAdmin = false) {
  if (isAdmin) return true;
  return resolveWorkMode(user, isAdmin) !== 'driver';
}

/**
 * FAB de crear viaje: visible en modo propietario, o en modo conductor
 * cuando hay jornada activa (código unido). Oculto si conductor sin jornada.
 */
export function canShowCreateFab({ user, isAdmin = false, hasJoinedJornada = false } = {}) {
  if (isAdmin) return true;
  if (resolveWorkMode(user, isAdmin) === 'owner') return true;
  return !!hasJoinedJornada;
}
