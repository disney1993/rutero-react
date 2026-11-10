// Validación de identificadores fiscales españoles (igual que en la API,
// app/Support/SpanishTaxId.php): DNI, NIE, CIF, IBAN y código postal.

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export function normalizeTaxId(value) {
  return String(value ?? '').replace(/[\s\-.]/g, '').toUpperCase();
}

export function isDni(v) {
  return /^\d{8}[A-Z]$/.test(v) && DNI_LETTERS[Number(v.slice(0, 8)) % 23] === v[8];
}

export function isNie(v) {
  if (!/^[XYZ]\d{7}[A-Z]$/.test(v)) return false;
  const number = Number(`${'XYZ'.indexOf(v[0])}${v.slice(1, 8)}`);
  return DNI_LETTERS[number % 23] === v[8];
}

export function isCif(v) {
  if (!/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    let n = Number(v[i + 1]);
    if (i % 2 === 0) {
      n *= 2;
      n = Math.floor(n / 10) + (n % 10);
    }
    sum += n;
  }
  const control = (10 - (sum % 10)) % 10;
  const letter = 'JABCDEFGHI'[control];
  const last = v[8];
  if ('PQRSNW'.includes(v[0])) return last === letter;
  if ('ABEH'.includes(v[0])) return last === String(control);
  return last === String(control) || last === letter;
}

export function isValidTaxId(value) {
  const v = normalizeTaxId(value);
  return isDni(v) || isNie(v) || isCif(v);
}

export function isValidIban(value) {
  const v = normalizeTaxId(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return false;
  if (v.startsWith('ES') && v.length !== 24) return false;
  const rearranged = v.slice(4) + v.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const digits = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of digits) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
}

export function isValidPostalCode(value) {
  const v = String(value ?? '').trim();
  const province = Number(v.slice(0, 2));
  return /^\d{5}$/.test(v) && province >= 1 && province <= 52;
}

/** "Calle Mayor, 1, Calahorra, La Rioja, 26500, España" → "Calle Mayor, 1". */
export function shortPlace(place) {
  return String(place || '').split(',').map((p) => p.trim()).filter(Boolean).slice(0, 2).join(', ');
}
