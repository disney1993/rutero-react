// Deben coincidir con las reglas de rutero-api (app/Http/Controllers/*).
export const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]{2,50}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[0-9+\-\s()]{6,20}$/;
export const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
export const CODE_REGEX = /^[A-Za-z0-9]{8}$/;
export const PLATE_REGEX = /^[A-Za-z0-9\-\s]{1,20}$/;
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
