/** New accounts use Gmail; the server enforces the same rule. */
export function isGmail(email: string): boolean {
  return /@(gmail|googlemail)\.com$/i.test(email.trim());
}
