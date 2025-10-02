import { Request, Response } from 'express';
import { sendEmail } from '../services/sendgridService';

export const testEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    console.log('🧪 [EMAIL TEST] Testing email to:', email);
    
    const result = await sendEmail({
      to: email,
      subject: 'Sharp Shot Email Test',
      text: 'This is a test email from Sharp Shot to verify SendGrid integration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D8AC35;">Sharp Shot Email Test</h2>
          <p>This is a test email to verify SendGrid integration is working correctly.</p>
          <p>If you received this email, the email system is working! 🎉</p>
          <p style="color: #666;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send test email'
      });
    }
  } catch (error: any) {
    console.error('❌ [EMAIL TEST] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
