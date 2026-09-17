import React, { createContext, useContext, useMemo, useState } from 'react';

const SelectedUserContext = createContext(null);

// "Usuario que el admin está viendo" — un cursor de sesión, no una
// preferencia duradera, por eso vive solo en memoria (sin AsyncStorage).
// Lo comparten Dashboard Usuario, Rutas por día, Calendario y Vehículos
// para que el admin elija una sola vez y navegue sin volver a buscar.
export function SelectedUserProvider({ children }) {
  const [selectedUser, setSelectedUser] = useState(null);

  const value = useMemo(() => ({ selectedUser, setSelectedUser }), [selectedUser]);

  return <SelectedUserContext.Provider value={value}>{children}</SelectedUserContext.Provider>;
}

export function useSelectedUser() {
  const ctx = useContext(SelectedUserContext);
  if (!ctx) throw new Error('useSelectedUser debe usarse dentro de <SelectedUserProvider>');
  return ctx;
}
