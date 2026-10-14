import i18n from '../i18n';

// El predeterminado primero; el resto en el orden en que llegan.
export function sortVehiclesDefaultFirst(list) {
  return [...list].sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default));
}

// Mismas reglas que VehicleController::destroy en rutero-api, para avisar
// antes de intentar el borrado. Devuelve el motivo o null si se puede borrar.
export function vehicleDeleteBlockReason(vehicle) {
  if (vehicle?.is_default) {
    return i18n.t('vehicles.deleteBlockedDefault');
  }
  if (vehicle?.rutas_count > 0) {
    return i18n.t('vehicles.deleteBlockedRutas', { count: vehicle.rutas_count });
  }
  return null;
}
