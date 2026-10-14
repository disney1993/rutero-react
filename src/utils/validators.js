// Deben coincidir con las reglas de rutero-api (app/Http/Controllers/*).
export const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]{2,50}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[0-9+\-\s()]{6,20}$/;
export const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
export const CODE_REGEX = /^[A-Za-z0-9]{8}$/;
// Matrícula: solo letras y números (sin espacios ni guiones), hasta 12. Cubre
// los formatos habituales (ES 1234ABC, FR AB123CD, DE MAB1234, UK AB12CDE...).
export const PLATE_REGEX = /^[A-Za-z0-9]{1,12}$/;
export const PLATE_MAX_LENGTH = 12;

// Normaliza lo que se escribe: mayúsculas y fuera todo lo que no sea alfanumérico.
export function sanitizePlate(text) {
  return (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, PLATE_MAX_LENGTH);
}
// Debe coincidir con la validación de avatar_color en rutero-api (AuthController).
export const HEX_COLOR_REGEX = /^#[A-Fa-f0-9]{6}$/;
// Mínimo 6 caracteres, al menos una mayúscula, un número y un símbolo.
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

export function isValidName(value) {
  return NAME_REGEX.test(value.trim());
}

export function isValidEmail(value) {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidPhone(value) {
  return PHONE_REGEX.test(value.trim());
}

export function isValidPassword(value) {
  return value.length <= 72 && PASSWORD_REGEX.test(value);
}

export function isValidHexColor(value) {
  return HEX_COLOR_REGEX.test(value.trim());
}
