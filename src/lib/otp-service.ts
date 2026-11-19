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
    // 1. Generate OTP and check if account already exists via secure database function
    const { data: rpcRes, error: rpcErr } = await supabase.rpc(
      'generate_registration_otp',
      { p_email: cleanEmail }
    );

    if (rpcErr) {
      console.error('[OTP] RPC generation error:', rpcErr.message);
      return { success: false, error: 'Failed to generate verification code. Please try again.' };
    }

    const res = rpcRes as any;

    // 2. If account already exists in profiles or auth.users, prompt user to sign in
    if (res?.is_already_registered) {
      return {
        success: false,
        isAlreadyRegistered: true,
        email: cleanEmail,
        error: res.message || 'An account with this email already exists in ManaPelli! Please log in.',
      };
    }

    if (!res?.success || !res?.otp_code) {
      return {
        success: false,
        error: res?.error || 'Failed to generate verification code. Please try again.',
      };
    }

    const otpCode = res.otp_code;

    // 3. Send OTP via ZeptoMail
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
    const { data: rpcRes, error: rpcErr } = await supabase.rpc(
      'verify_registration_otp',
      { p_email: cleanEmail, p_otp: cleanOtp }
    );

    if (rpcErr) {
      console.error('[OTP] Verification RPC error:', rpcErr.message);
      return { success: false, error: 'Verification failed. Please try again.' };
    }

    const res = rpcRes as any;
    if (!res?.success) {
      return { success: false, error: res?.error || 'Invalid or expired OTP code. Please check and try again.' };
    }

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
    const { data: rpcRes, error: rpcErr } = await supabase.rpc(
      'generate_password_reset_otp',
      { p_email: cleanEmail }
    );

    if (rpcErr) {
      console.error('[OTP] Forgot password RPC error:', rpcErr.message);
      return { success: false, error: 'Failed to request password reset code. Please try again.' };
    }

    const res = rpcRes as any;
    if (!res?.success || !res?.otp_code) {
      return {
        success: false,
        error: res?.error || 'This email is not registered in our database. Please check your email or create a profile.',
      };
    }

    const resetOtp = res.otp_code;

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
    const { data: rpcRes, error: rpcErr } = await supabase.rpc(
      'reset_password_with_otp',
      {
        p_email: cleanEmail,
        p_otp: cleanOtp,
        p_new_password: newPassword,
      }
    );

    if (rpcErr) {
      console.error('[OTP] Reset password RPC error:', rpcErr.message);
      return { success: false, error: 'Failed to reset password. Please try again.' };
    }

    const res = rpcRes as any;
    if (!res?.success) {
      return { success: false, error: res?.error || 'Failed to reset password. Please check your OTP code.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reset password.' };
  }
}
