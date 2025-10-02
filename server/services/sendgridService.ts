import sgMail from '@sendgrid/mail';

// Initialize SendGrid with proper error handling
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.error('❌ [SENDGRID] API key not found in environment variables');
} else {
  sgMail.setApiKey(apiKey);
  console.log('✅ [SENDGRID] API key initialized successfully');
}

export interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async (emailData: EmailData): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 [SENDGRID] Attempting to send email to:', emailData.to);
    
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }

    const msg = {
      to: emailData.to,
      from: 'no-reply@sharp-shot.com',
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html || emailData.text,
    };

    const response = await sgMail.send(msg);
    console.log('✅ [SENDGRID] Email sent successfully:', response[0].statusCode);
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ [SENDGRID] Email send error:', error.message);
    
    if (error.response) {
      console.error('❌ [SENDGRID] Error response:', error.response.body);
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
};

export const sendPasswordResetEmail = async (email: string, resetUrl: string): Promise<{ success: boolean; error?: string }> => {
  const emailData: EmailData = {
    to: email,
    subject: 'Reset Your Sharp Shot Password',
    text: `Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #D8AC35;">Reset Your Sharp Shot Password</h2>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #D8AC35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
        <p style="margin-top: 20px; color: #666;">This link will expire in 1 hour.</p>
        <p style="color: #666;">If you didn't request this, please ignore this email.</p>
      </div>
    `
  };
  
  return sendEmail(emailData);
};

export const sendWelcomeEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
  const emailData: EmailData = {
    to: email,
    subject: 'Welcome to Sharp Shot!',
    text: 'Welcome to Sharp Shot! Your account has been created successfully.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #D8AC35;">Welcome to Sharp Shot!</h2>
        <p>Your account has been created successfully. You can now start using Sharp Shot to track your betting opportunities.</p>
        <p>Happy betting!</p>
        <p style="color: #666;">The Sharp Shot Team</p>
      </div>
    `
  };
  
  return sendEmail(emailData);
};
