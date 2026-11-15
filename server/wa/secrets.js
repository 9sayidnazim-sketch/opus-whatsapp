// Memory rule 3: never store secrets. Used before any memory write and to redact logs.
const luhn = (digits) => {
  let sum = 0;
  for (let i = digits.length - 1, double = false; i >= 0; i -= 1, double = !double) {
    let n = Number(digits[i]);
    if (double) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
};

const PATTERNS = [
  ['api_key', /\b(?:sk|pk|rk)[-_](?:live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{16,}\b/],
  ['api_key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['api_key', /\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/],
  ['api_key', /\bwak_[A-Za-z0-9_-]{20,}\b/],
  ['token', /\bEAA[A-Za-z0-9]{30,}\b/],
  ['token', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/],
  ['token', /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/i],
  ['token', /\b[a-f0-9]{40,}\b/i],
  ['password', /\b(?:password|passcode|passwd|pwd|mpin|pin)\b\s*(?:is|=|:)\s*\S{3,}/i],
  ['otp', /\b(?:otp|one[- ]time (?:code|password)|verification code|security code)\b\D{0,20}\d{4,8}\b/i],
  ['id_number', /\b784[- ]?\d{4}[- ]?\d{7}[- ]?\d\b/],
  ['id_number', /\b\d{3}-\d{2}-\d{4}\b/],
];
const CARD = /\b(?:\d[ -]?){13,19}\b/g;

export function findSecrets(text) {
  const value = String(text ?? '');
  const kinds = new Set();
  for (const [kind, pattern] of PATTERNS) if (pattern.test(value)) kinds.add(kind);
  for (const match of value.match(CARD) ?? []) {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) kinds.add('card_number');
  }
  return [...kinds];
}

export const hasSecret = (text) => findSecrets(text).length > 0;

export function redact(text) {
  let value = String(text ?? '');
  for (const [kind, pattern] of PATTERNS) value = value.replace(new RegExp(pattern.source, pattern.flags + 'g'), `[${kind}]`);
  return value.replace(CARD, (match) => {
    const digits = match.replace(/\D/g, '');
    return digits.length >= 13 && luhn(digits) ? '[card_number]' : match;
  });
}
