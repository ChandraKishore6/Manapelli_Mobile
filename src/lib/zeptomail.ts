const ZEPTOMAIL_API_KEY =
  process.env.EXPO_PUBLIC_ZEPTOMAIL_API_KEY ||
  "Zoho-enczapikey PHtE6r1eF+u/iDF98kBUtKPuEsf3NY4vrO1mflFO4YxHD6UHG01d/tAsljTi+k8oVvERFqHNyYlgtO+f4e6Bd2rsMzlJDmqyqK3sx/VYSPOZsbq6x00ctl4dd0HeUoDrdtNj1CDeutrdNA==";

const SENDER_EMAIL = "hello@manapelli.in";
const SENDER_NAME = "ManaPelli";

// Anti-bounce email syntax & domain validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Common domain typos that cause instant bounce failures
const COMMON_TYPO_DOMAINS: Record<string, string> = {
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
};

export function validateEmailForBounceProtection(rawEmail: string): {
  isValid: boolean;
  cleanEmail: string;
  error?: string;
  suggestion?: string;
} {
  const cleanEmail = rawEmail.trim().toLowerCase();
  
  if (!cleanEmail) {
    return { isValid: false, cleanEmail, error: 'Email address is required.' };
  }

  // Skip synthetic phone emails
  if (cleanEmail.endsWith('@phone.manapelli.in')) {
    return { isValid: false, cleanEmail, error: 'Cannot send email to synthetic phone address.' };
  }

  // Regex format check
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return { isValid: false, cleanEmail, error: 'Please enter a valid email address (e.g., name@gmail.com).' };
  }

  // Check common typos
  const domain = cleanEmail.split('@')[1];
  if (COMMON_TYPO_DOMAINS[domain]) {
    const suggestedDomain = COMMON_TYPO_DOMAINS[domain];
    const suggestedEmail = `${cleanEmail.split('@')[0]}@${suggestedDomain}`;
    return {
      isValid: false,
      cleanEmail,
      error: `Did you mean ${suggestedEmail}? Please check your email domain spelling.`,
      suggestion: suggestedEmail,
    };
  }

  return { isValid: true, cleanEmail };
}

export async function sendZeptoMail(
  toEmail: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  const validation = validateEmailForBounceProtection(toEmail);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const response = await fetch("https://cpaas.zoho.in/v1.1/email", {
      method: "POST",
      headers: {
        Authorization: ZEPTOMAIL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { address: SENDER_EMAIL, name: SENDER_NAME },
        to: [{ email_address: { address: validation.cleanEmail } }],
        subject,
        htmlbody: htmlBody,
      }),
    });

    if (response.ok) {
      return { success: true };
    }

    const errText = await response.text();
    console.error("[ZeptoMail] API error:", errText);
    return { success: false, error: errText || "Failed to send email via ZeptoMail" };
  } catch (err: any) {
    console.error("[ZeptoMail] Exception:", err);
    return { success: false, error: err?.message || "Network error sending email" };
  }
}
