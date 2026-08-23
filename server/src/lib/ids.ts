import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

/** Human-transcribable code used on approval letters (e.g. "SR-7K4M-2XQ9"). */
export function accessCode(): string {
  const block = (length: number) =>
    Array.from({ length }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
  return `SR-${block(4)}-${block(4)}`;
}

export function randomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
