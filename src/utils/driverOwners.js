function isActiveJornadaEntry(entry, today) {
  const code = entry?.owner_month_code;
  if (!code) return false;
  if (code.type === 'day') {
    return String(code.valid_on || '').slice(0, 10) === today;
  }
  return code.month === today.slice(0, 7);
}

/**
 * Propietarios para los que conduce el usuario, uno por propietario: primero
 * los del equipo (vínculo permanente) y luego los de códigos vigentes (mes o
 * día). Un mismo propietario puede llegar por el equipo y por varios códigos
 * (el del mes y el de hoy); se queda la primera aparición. `today` es la
 * fecha local en formato AAAA-MM-DD.
 */
export function driverOwnerEntries(codeEntries, teamLinks, today) {
  const teamEntries = teamLinks.map((l) => ({
    id: `team-${l.id}`,
    team: true,
    owner_month_code: { owner_id: l.owner_id, owner: l.owner, type: 'team' },
  }));
  const active = codeEntries.filter((e) => isActiveJornadaEntry(e, today));

  const seen = new Set();
  return [...teamEntries, ...active].filter((e) => {
    const ownerId = e.owner_month_code.owner_id;
    if (seen.has(ownerId)) return false;
    seen.add(ownerId);
    return true;
  });
}
