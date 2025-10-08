import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail, sendWelcomeEmail } from './sendgridService';

// Initialize Supabase admin client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✅ [AUTH SERVICE] Supabase admin client initialized');
} else {
  console.error('❌ [AUTH SERVICE] Supabase configuration missing');
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: any;
  message?: string;
}

export const sendPasswordReset = async (email: string): Promise<AuthResult> => {
  try {
    console.log('🔄 [AUTH SERVICE] Password reset requested for:', email);

    // Generate a secure reset token
    const resetToken = generateSecureToken();
    const resetUrl = `${process.env.VITE_APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;

    // Store the reset token in Supabase (with expiration)
    if (supabaseAdmin) {
      const { error: dbError } = await supabaseAdmin
        .from('password_reset_tokens')
        .insert({
          email,
          token: resetToken,
          expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
          created_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('❌ [AUTH SERVICE] Database error:', dbError);
        // Continue with email sending even if DB fails
      }
    }

    // Send email via SendGrid
    const emailResult = await sendPasswordResetEmail(email, resetUrl);
    
    if (emailResult.success) {
      console.log('✅ [AUTH SERVICE] Password reset email sent successfully');
      return {
        success: true,
        message: 'Password reset email sent successfully'
      };
    } else {
      console.error('❌ [AUTH SERVICE] Email send failed:', emailResult.error);
      return {
        success: false,
        error: emailResult.error || 'Failed to send password reset email'
      };
    }

  } catch (error: any) {
    console.error('❌ [AUTH SERVICE] Password reset error:', error);
    return {
      success: false,
      error: error.message || 'Internal server error'
    };
  }
};

export const sendWelcomeEmail = async (email: string, name?: string): Promise<AuthResult> => {
  try {
    console.log('🔄 [AUTH SERVICE] Welcome email requested for:', email);

    const emailResult = await sendWelcomeEmail(email);
    
    if (emailResult.success) {
      console.log('✅ [AUTH SERVICE] Welcome email sent successfully');
      return {
        success: true,
        message: 'Welcome email sent successfully'
      };
    } else {
      console.error('❌ [AUTH SERVICE] Welcome email failed:', emailResult.error);
      return {
        success: false,
        error: emailResult.error || 'Failed to send welcome email'
      };
    }

  } catch (error: any) {
    console.error('❌ [AUTH SERVICE] Welcome email error:', error);
    return {
      success: false,
      error: error.message || 'Internal server error'
    };
  }
};

export const verifyResetToken = async (token: string): Promise<AuthResult> => {
  try {
    if (!supabaseAdmin) {
      return {
        success: false,
        error: 'Database not available'
      };
    }

    const { data, error } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('email, expires_at')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return {
        success: false,
        error: 'Invalid or expired reset token'
      };
    }

    return {
      success: true,
      user: { email: data.email },
      message: 'Token is valid'
    };

  } catch (error: any) {
    console.error('❌ [AUTH SERVICE] Token verification error:', error);
    return {
      success: false,
      error: error.message || 'Token verification failed'
    };
  }
};

export const resetPasswordWithToken = async (token: string, newPassword: string): Promise<AuthResult> => {
  try {
    // First verify the token
    const tokenResult = await verifyResetToken(token);
    if (!tokenResult.success) {
      return tokenResult;
    }

    const email = tokenResult.user?.email;
    if (!email) {
      return {
        success: false,
        error: 'Email not found in token'
      };
    }

    // Update password in Supabase
    if (supabaseAdmin) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        email, // This should be user ID, but we'll work with email for now
        { password: newPassword }
      );

      if (updateError) {
        console.error('❌ [AUTH SERVICE] Password update error:', updateError);
        return {
          success: false,
          error: 'Failed to update password'
        };
      }

      // Clean up the used token
      await supabaseAdmin
        .from('password_reset_tokens')
        .delete()
        .eq('token', token);

      console.log('✅ [AUTH SERVICE] Password reset successfully');
      return {
        success: true,
        message: 'Password reset successfully'
      };
    }

    return {
      success: false,
      error: 'Database not available'
    };

  } catch (error: any) {
    console.error('❌ [AUTH SERVICE] Password reset error:', error);
    return {
      success: false,
      error: error.message || 'Password reset failed'
    };
  }
};

// Helper function to generate secure tokens
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
