const ZEPTOMAIL_API_KEY =
  process.env.EXPO_PUBLIC_ZEPTOMAIL_API_KEY ||
  "Zoho-enczapikey PHtE6r1eF+u/iDF98kBUtKPuEsf3NY4vrO1mflFO4YxHD6UHG01d/tAsljTi+k8oVvERFqHNyYlgtO+f4e6Bd2rsMzlJDmqyqK3sx/VYSPOZsbq6x00ctl4dd0HeUoDrdtNj1CDeutrdNA==";

const SENDER_EMAIL = "hello@manapelli.in";
const SENDER_NAME = "ManaPelli";

export async function sendZeptoMail(
  toEmail: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://cpaas.zoho.in/v1.1/email", {
      method: "POST",
      headers: {
        Authorization: ZEPTOMAIL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { address: SENDER_EMAIL, name: SENDER_NAME },
        to: [{ email_address: { address: toEmail.trim().toLowerCase() } }],
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
