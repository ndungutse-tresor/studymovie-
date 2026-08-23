import bcrypt from 'bcryptjs';
import { config } from '../config.js';

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, config.auth.bcryptRounds);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

/** Mirrors the client-side rule so the two never drift apart. */
export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 10) issues.push('at least 10 characters');
  if (!/[a-z]/.test(password)) issues.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) issues.push('an uppercase letter');
  if (!/[0-9]/.test(password)) issues.push('a number');
  return issues;
}
