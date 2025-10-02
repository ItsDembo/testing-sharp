import { Request, Response } from 'express';
import { sendPasswordReset, verifyResetToken, resetPasswordWithToken } from '../services/authService';

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    console.log('🔄 [PASSWORD RESET] Request received for:', email);
    
    const result = await sendPasswordReset(email);

    if (result.success) {
      res.json({
        success: true,
        message: result.message || 'Password reset email sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to send password reset email'
      });
    }
  } catch (error: any) {
    console.error('❌ [PASSWORD RESET] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

export const verifyPasswordResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Reset token is required'
      });
    }

    console.log('🔍 [PASSWORD RESET] Verifying token:', token);
    
    const result = await verifyResetToken(token);

    if (result.success) {
      res.json({
        success: true,
        message: result.message || 'Token is valid',
        user: result.user
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Invalid or expired token'
      });
    }
  } catch (error: any) {
    console.error('❌ [PASSWORD RESET] Token verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Reset token and new password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    console.log('🔄 [PASSWORD RESET] Resetting password for token:', token);
    
    const result = await resetPasswordWithToken(token, password);

    if (result.success) {
      res.json({
        success: true,
        message: result.message || 'Password reset successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to reset password'
      });
    }
  } catch (error: any) {
    console.error('❌ [PASSWORD RESET] Password reset error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
