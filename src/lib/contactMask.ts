/**
 * Masks phone numbers showing only starting 4 digits + XXXX.
 * Example: "+91 9700103106" -> "+91 9700XXXX"
 * Example: "9700103106" -> "9700XXXX"
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
      return `${countryCode} ${visible}XXXX`;
    } else {
      const prefix = trimmed.slice(0, 3);
      const rest = trimmed.slice(3);
      const visible = rest.slice(0, 4);
      return `${prefix} ${visible}XXXX`;
    }
  }

  const visible = trimmed.slice(0, 4);
  return `${visible}XXXX`;
}

/**
 * Masks email addresses showing starting 4 characters + XXXX + domain.
 * Example: "chandrareddy106@gmail.com" -> "chanXXXX@gmail.com"
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

  return `${visibleUser}XXXX${domainPart}`;
}
