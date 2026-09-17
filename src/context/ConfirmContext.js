import React, { createContext, useContext, useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dialog, Button } from '../components/ui';

const ConfirmContext = createContext(null);

// Confirmación imperativa tipo SweetAlert (const ok = await confirm({...})).
export function ConfirmProvider({ children }) {
  const { t } = useTranslation();
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
      <Dialog visible={!!request} onDismiss={() => resolveWith(false)}>
        <Dialog.Title>{request?.title || t('alerts.confirmDeleteTitle')}</Dialog.Title>
        <Dialog.Content>
          <Text className="text-sm text-onSurface dark:text-onSurface-dark">{request?.message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="text" onPress={() => resolveWith(false)}>
            {request?.cancelLabel || t('common.cancel')}
          </Button>
          <Button
            mode="text"
            onPress={() => resolveWith(true)}
            textClassName={request?.destructive ? 'text-error dark:text-error-dark' : undefined}
          >
            {request?.confirmLabel || t('common.confirm')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
