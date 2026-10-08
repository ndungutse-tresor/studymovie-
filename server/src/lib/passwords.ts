import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { passwordIssues as checkPasswordIssues } from './password-policy.js';

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, config.auth.bcryptRounds);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function passwordIssues(password: string): string[] {
  return checkPasswordIssues(password);
}
