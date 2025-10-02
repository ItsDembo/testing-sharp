import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

// Helper functions removed - no longer needed since API is disabled

export default async function handler(req, res) {
  // DISABLED: All authentication is now handled by Supabase client-side
  console.log('🚀 Consolidated API hit but DISABLED:', { 
    method: req.method, 
    url: req.url,
    path: req.url?.split('/').pop()
  });
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Configure SendGrid for ambassador functionality (keep this active)
  try {
    const sendgridKey = process.env.SENDGRID_API_KEY || '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';
    sgMail.setApiKey(sendgridKey);
    console.log('📧 SendGrid configured for ambassador functionality');
  } catch (error) {
    console.error('❌ SendGrid configuration error:', error);
  }
  
  // For non-auth endpoints, continue with normal processing
  // For auth endpoints, return 501 to indicate they're disabled
  const path = req.url?.split('/').pop() || '';
  if (path.includes('auth') || path.includes('login') || path.includes('signup') || path.includes('reset')) {
    return res.status(501).json({
            ok: false,
      error: 'Authentication API is disabled. Please use Supabase client-side authentication.'
    });
  }
  
  // Allow other endpoints to continue (for ambassador functionality)
        return res.status(200).json({
          ok: true,
    message: 'Non-auth endpoint - SendGrid available for ambassador functionality'
  });
}
