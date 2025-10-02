import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Google OAuth client
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
  process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
  `${process.env.VITE_APP_URL || process.env.VERCEL_URL || 'http://localhost:5000'}/auth/google/callback`
);

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://moxqfgaovpchcgafcqll.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

let supabaseAdmin: any = null;
if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ [GOOGLE] Supabase admin client initialized');
} else {
  console.warn('⚠️ [GOOGLE] Supabase service key not found, using mock user creation');
}

// Handle Google OAuth callback
export const handleGoogleAuth = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info from Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Failed to get user payload from Google');
    }

    // Extract user information
    const googleUser = {
      id: crypto.randomUUID(),
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      provider: 'google',
      googleId: payload.sub,
      walletAddress: null,
      createdAt: new Date().toISOString()
    };

    console.log(`✅ [GOOGLE] Authentication successful for: ${googleUser.email}`);

    // Try to create/update user in Supabase if admin client is available
    if (supabaseAdmin) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', googleUser.email)
          .single();

        let supabaseUser;
        if (existingUser) {
          // Update existing user
          const { data: updatedUser } = await supabaseAdmin
            .from('users')
            .update({
              google_id: googleUser.googleId,
              name: googleUser.name,
              picture: googleUser.picture,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.id)
            .select()
            .single();
          
          supabaseUser = updatedUser;
        } else {
          // Create new user
          const { data: newUser } = await supabaseAdmin
            .from('users')
            .insert({
              id: googleUser.id,
              email: googleUser.email,
              name: googleUser.name,
              picture: googleUser.picture,
              google_id: googleUser.googleId,
              provider: 'google',
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          
          supabaseUser = newUser;
        }

        if (supabaseUser) {
          console.log('✅ [GOOGLE] User synced to Supabase:', supabaseUser.id);
        }
      } catch (dbError) {
        console.error('❌ [GOOGLE] Database sync error:', dbError);
        // Continue with authentication even if DB sync fails
      }
    }

    res.json({
      success: true,
      user: googleUser,
      message: 'Google authentication successful'
    });

  } catch (error) {
    console.error('❌ [GOOGLE] Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Google authentication failed'
    });
  }
};

// Get Google OAuth URL
export const getGoogleAuthUrl = async (req: Request, res: Response) => {
  try {
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
      ],
      state: crypto.randomUUID()
    });

    res.json({
      success: true,
      authUrl
    });

  } catch (error) {
    console.error('❌ [GOOGLE] Auth URL generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Google auth URL'
    });
  }
};
