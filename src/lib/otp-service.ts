import { supabase } from './supabase';
import { sendZeptoMail, validateEmailForBounceProtection } from './zeptomail';

export async function sendRegistrationOtp(rawEmail: string): Promise<{
  success: boolean;
  isAlreadyRegistered?: boolean;
  email?: string;
  error?: string;
}> {
  const validation = validateEmailForBounceProtection(rawEmail);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }
  const cleanEmail = validation.cleanEmail;

  try {
    // 1. Check if email exists in profiles table
    const { data: manaProfile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', cleanEmail)
      .maybeSingle();

    // 2. Check if email exists in compatibility_entries
    const { data: existingEntry } = await supabase
      .from('compatibility_entries')
      .select('id, is_email_verified, step_completed, password_hash')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (
      manaProfile ||
      (existingEntry &&
        existingEntry.is_email_verified &&
        (existingEntry.step_completed >= 3 || existingEntry.password_hash))
    ) {
      return {
        success: false,
        isAlreadyRegistered: true,
        email: cleanEmail,
        error: 'An account with this email already exists in ManaPelli! Please log in.',
      };
    }

    // 3. Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 4. Upsert OTP into compatibility_entries with source: 'normal_profile'
    const { error: upsertErr } = await supabase
      .from('compatibility_entries')
      .upsert(
        {
          email: cleanEmail,
          otp_code: otpCode,
          otp_expires_at: otpExpiresAt,
          is_email_verified: false,
          source: 'normal_profile',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );

    if (upsertErr) {
      console.error('[OTP] Database upsert error:', upsertErr.message);
      return { success: false, error: 'Failed to generate verification code. Please try again.' };
    }

    // 5. Send OTP via ZeptoMail
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #8B1E3F; margin: 0; font-size: 24px; font-weight: 700;">ManaPelli</h1>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px;">Email Verification Code</p>
        </div>
        <p style="color: #334155; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
          Welcome to ManaPelli Matrimony! Use the 6-digit verification code below to verify your email address and continue creating your profile:
        </p>
        <div style="background-color: #FFF0F3; border: 2px dashed #F8C8D2; padding: 18px; text-align: center; border-radius: 10px; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #8B1E3F; font-family: monospace;">${otpCode}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          This verification code will expire in 10 minutes. If you did not request this code, please ignore this email.
        </p>
      </div>
    `;

    const emailSent = await sendZeptoMail(
      cleanEmail,
      'Your ManaPelli Email Verification OTP',
      htmlBody
    );

    if (!emailSent.success) {
      return { success: false, error: emailSent.error || 'Failed to deliver verification email.' };
    }

    return { success: true, email: cleanEmail };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An error occurred while sending OTP.' };
  }
}

export async function verifyRegistrationOtp(
  rawEmail: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  const cleanOtp = otp.trim();

  if (!cleanOtp || cleanOtp.length !== 6) {
    return { success: false, error: 'Please enter the 6-digit OTP code sent to your email.' };
  }

  try {
    const { data: entry, error: fetchErr } = await supabase
      .from('compatibility_entries')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (fetchErr || !entry || !entry.otp_code || entry.otp_code !== cleanOtp) {
      return { success: false, error: 'Invalid 6-digit OTP code. Please check and try again.' };
    }

    if (entry.otp_expires_at && new Date(entry.otp_expires_at) < new Date()) {
      return { success: false, error: 'OTP code has expired. Please request a new verification code.' };
    }

    // Mark verified
    await supabase
      .from('compatibility_entries')
      .update({
        is_email_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('email', cleanEmail);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Verification failed.' };
  }
}

export async function sendForgotPasswordOtp(rawEmail: string): Promise<{
  success: boolean;
  email?: string;
  error?: string;
}> {
  const validation = validateEmailForBounceProtection(rawEmail);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }
  const cleanEmail = validation.cleanEmail;

  try {
    // Check if email exists in profiles table
    const { data: manaProfile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', cleanEmail)
      .maybeSingle();

    const { data: entry } = await supabase
      .from('compatibility_entries')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!manaProfile && !entry) {
      return {
        success: false,
        error: 'This email is not registered in our database. Please check your email or create a profile.',
      };
    }

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    const { error: upsertErr } = await supabase
      .from('compatibility_entries')
      .upsert(
        {
          email: cleanEmail,
          otp_code: resetOtp,
          otp_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );

    if (upsertErr) {
      console.error('[OTP] Forgot password upsert error:', upsertErr.message);
      return { success: false, error: 'Failed to generate password reset code. Please try again.' };
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #b91c1c; margin: 0; font-size: 24px; font-weight: 700;">ManaPelli</h1>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px;">Password Reset Request</p>
        </div>
        <p style="color: #334155; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
          You requested to reset your ManaPelli account password. Use the 6-digit OTP code below to verify your request:
        </p>
        <div style="background-color: #fef2f2; border: 2px dashed #f87171; padding: 18px; text-align: center; border-radius: 10px; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #b91c1c; font-family: monospace;">${resetOtp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          This OTP code will expire in 15 minutes. If you did not request a password reset, please ignore this email.
        </p>
      </div>
    `;

    const emailSent = await sendZeptoMail(
      cleanEmail,
      'Your ManaPelli Password Reset Code',
      htmlBody
    );

    if (!emailSent.success) {
      return { success: false, error: emailSent.error || 'Failed to deliver password reset email.' };
    }

    return { success: true, email: cleanEmail };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to request password reset code.' };
  }
}

export async function resetPasswordWithOtp(
  rawEmail: string,
  otp: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  const cleanOtp = otp.trim();

  if (!cleanOtp || cleanOtp.length !== 6) {
    return { success: false, error: 'OTP code must be 6 digits.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  try {
    const { data: entry, error: fetchErr } = await supabase
      .from('compatibility_entries')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (fetchErr || !entry || !entry.otp_code || entry.otp_code !== cleanOtp) {
      return { success: false, error: 'Invalid or missing 6-digit OTP code. Please check and try again.' };
    }

    if (entry.otp_expires_at && new Date(entry.otp_expires_at) < new Date()) {
      return { success: false, error: 'OTP code has expired. Please request a new reset code.' };
    }

    // 1. Clear OTP code in database
    await supabase
      .from('compatibility_entries')
      .update({
        otp_code: null,
        otp_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('email', cleanEmail);

    // 2. Update profiles table last_password column
    await supabase
      .from('profiles')
      .update({ last_password: newPassword })
      .ilike('email', cleanEmail);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reset password.' };
  }
}
