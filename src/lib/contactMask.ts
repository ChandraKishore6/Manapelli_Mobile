/**
 * Masks phone numbers showing only starting 4 digits, replacing remaining digits with X.
 * Example: "+91 9700103106" -> "+91 9700XXXXXX"
 * Example: "9700103106" -> "9700XXXXXX"
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return 'Unavailable / Managed by Bureau';
  const trimmed = phone.trim();
  if (!trimmed || trimmed.length <= 4) return 'XXXX';

  if (trimmed.startsWith('+')) {
    const parts = trimmed.split(' ');
    if (parts.length > 1) {
      const countryCode = parts[0];
      const num = parts.slice(1).join('');
      const visible = num.slice(0, 4);
      const masked = 'X'.repeat(Math.max(num.length - 4, 4));
      return `${countryCode} ${visible}${masked}`;
    } else {
      const prefix = trimmed.slice(0, 3);
      const rest = trimmed.slice(3);
      const visible = rest.slice(0, 4);
      const masked = 'X'.repeat(Math.max(rest.length - 4, 4));
      return `${prefix} ${visible}${masked}`;
    }
  }

  const visible = trimmed.slice(0, 4);
  const masked = 'X'.repeat(Math.max(trimmed.length - 4, 4));
  return `${visible}${masked}`;
}

/**
 * Masks email addresses showing starting 4 characters of username, replacing remainder with X.
 * Example: "madhukarreddy106@gmail.com" -> "madhXXXX@gmail.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return 'Unavailable / Managed by Bureau';
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return 'XXXX@xxxx.com';

  const userPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex);

  const visibleLen = Math.min(userPart.length, 4);
  const visibleUser = userPart.slice(0, visibleLen);
  const maskedUser = 'X'.repeat(Math.max(userPart.length - visibleLen, 4));

  return `${visibleUser}${maskedUser}${domainPart}`;
}
