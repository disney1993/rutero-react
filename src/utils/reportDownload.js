import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api, errorMessage } from './apiClient';
import i18n from '../i18n';

const MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

function toUint8Array(data) {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return new Uint8Array(data);
}

function filenameFromHeaders(headers, format, period, date) {
  const cd = headers?.['content-disposition'] || headers?.['Content-Disposition'];
  if (typeof cd === 'string') {
    const utf = cd.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf?.[1]) {
      try {
        return decodeURIComponent(utf[1].trim());
      } catch {
        // fall through
      }
    }
    const plain = cd.match(/filename="?([^";]+)"?/i);
    if (plain?.[1]) return plain[1].trim();
  }
  return `report-${period}-${date}.${format}`;
}

function downloadBlobWeb(bytes, filename, mimeType) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * GET /reports/user-export as binary; web downloads a blob, native shares the file.
 * @param {{ period: 'day'|'month'|'year', date: string, format: 'xlsx'|'pdf', userId?: number|string, role?: string }} opts
 */
export async function downloadUserReport({ period, date, format, userId, role }) {
  const mimeType = MIME[format] || 'application/octet-stream';
  const resp = await api.get('/reports/user-export', {
    params: {
      period,
      date,
      format,
      ...(role ? { role } : {}),
      ...(userId != null ? { user_id: userId } : {}),
    },
    responseType: 'arraybuffer',
  });

  const filename = filenameFromHeaders(resp.headers, format, period, date);
  const bytes = toUint8Array(resp.data);

  if (Platform.OS === 'web') {
    downloadBlobWeb(bytes, filename, mimeType);
    return { filename };
  }

  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(bytes);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error(i18n.t('stats.shareUnavailable'));
  }

  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: filename,
    UTI: format === 'pdf' ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet',
  });

  return { filename };
}

export function reportDownloadError(err, fallback) {
  const data = err?.response?.data;
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    try {
      const text = new TextDecoder().decode(data instanceof ArrayBuffer ? data : data.buffer);
      const json = JSON.parse(text);
      if (json?.message) return json.message;
    } catch {
      // not JSON — use default message path
    }
  }
  return errorMessage(err, fallback || i18n.t('stats.exportError'));
}
