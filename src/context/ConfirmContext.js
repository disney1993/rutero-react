import React, { createContext, useContext, useState } from 'react';
import { Portal, Dialog, Text, Button, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

const ConfirmContext = createContext(null);

// Confirmación imperativa tipo SweetAlert (const ok = await confirm({...}))
// pero construida sobre el Dialog de react-native-paper: mismo look que el
// resto de la app y sin arriesgar otra dependencia nativa en un stack donde
// ya hemos tenido varios conflictos de versiones esta sesión.
export function ConfirmProvider({ children }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [request, setRequest] = useState(null);

  const confirm = (options) => new Promise((resolve) => {
    setRequest({ ...options, resolve });
  });

  const resolveWith = (value) => {
    request?.resolve(value);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Portal>
        <Dialog visible={!!request} onDismiss={() => resolveWith(false)}>
          <Dialog.Title>{request?.title || t('alerts.confirmDeleteTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{request?.message}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => resolveWith(false)}>{request?.cancelLabel || t('common.cancel')}</Button>
            <Button
              onPress={() => resolveWith(true)}
              textColor={request?.destructive ? theme.colors.error : undefined}
            >
              {request?.confirmLabel || t('common.confirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
