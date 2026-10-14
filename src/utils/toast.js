import { showMessage } from 'react-native-flash-message';
import { haptics } from './haptics';

const DEFAULTS = { duration: 3000, floating: true };

export function toastSuccess(message) {
  haptics.success();
  showMessage({ ...DEFAULTS, message, type: 'success', icon: 'success' });
}

export function toastError(message) {
  haptics.error();
  showMessage({ ...DEFAULTS, duration: 4000, message, type: 'danger', icon: 'danger' });
}

export function toastInfo(message) {
  showMessage({ ...DEFAULTS, message, type: 'info', icon: 'info' });
}
