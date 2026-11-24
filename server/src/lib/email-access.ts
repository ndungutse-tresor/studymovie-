/**
 * Who may sign in. New learners use Gmail and confirm the address from the
 * emailed link. Any other address needs an administrator's approval, and
 * administrators themselves are always let in.
 */

const GMAIL = /@(gmail|googlemail)\.com$/i;

export function isGmail(email: string): boolean {
  return GMAIL.test(email.trim());
}

export const GMAIL_ONLY_MESSAGE = 'Use a Gmail address (ending in @gmail.com).';

export interface EmailAccess {
  email: string;
  role: 'LEARNER' | 'ADMIN';
  email_verified_at: unknown;
  email_approved_at: unknown;
}

export type SignInBlock = { code: 'EMAIL_NOT_GMAIL' | 'EMAIL_UNVERIFIED'; message: string };

export function signInBlock(user: EmailAccess): SignInBlock | null {
  if (user.role === 'ADMIN' || user.email_approved_at) return null;
  if (!isGmail(user.email)) {
    return {
      code: 'EMAIL_NOT_GMAIL',
      message: 'This account does not use a Gmail address. An administrator has to approve it before you can sign in.',
    };
  }
  if (!user.email_verified_at) {
    return {
      code: 'EMAIL_UNVERIFIED',
      message: 'Confirm your email first. Open the link we sent to your Gmail, or ask for a new one.',
    };
  }
  return null;
}
