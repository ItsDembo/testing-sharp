import { Request, Response } from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Store nonces temporarily (in production, use Redis or database)
const nonceStore = new Map<string, { nonce: string; timestamp: number; walletAddress: string }>();

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://moxqfgaovpchcgafcqll.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

let supabaseAdmin: any = null;
if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ [SIWS] Supabase admin client initialized');
} else {
  console.warn('⚠️ [SIWS] Supabase service key not found, using mock user creation');
}

// Clean up expired nonces (older than 5 minutes)
const cleanupExpiredNonces = () => {
  const now = Date.now();
  const entries = Array.from(nonceStore.entries());
  for (const [key, value] of entries) {
    if (now - value.timestamp > 5 * 60 * 1000) { // 5 minutes
      nonceStore.delete(key);
    }
  }
};

// Generate nonce for wallet authentication
export const generateNonce = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // Validate wallet address format (basic validation)
    if (!walletAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }

    // Clean up expired nonces
    cleanupExpiredNonces();

    // Generate random nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    
    // Store nonce with timestamp
    nonceStore.set(nonce, {
      nonce,
      timestamp: Date.now(),
      walletAddress
    });

    console.log(`🔐 [SIWS] Generated nonce for wallet: ${walletAddress}`);

    res.json({
      success: true,
      nonce
    });

  } catch (error) {
    console.error('❌ [SIWS] Nonce generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate nonce'
    });
  }
};

// Verify wallet signature
export const verifySignature = async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // Extract nonce from message
    const nonceMatch = message.match(/Nonce: ([a-f0-9]{64})/);
    if (!nonceMatch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message format'
      });
    }

    const nonce = nonceMatch[1];

    // Verify nonce exists and is valid
    const storedNonce = nonceStore.get(nonce);
    if (!storedNonce) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired nonce'
      });
    }

    // Verify wallet address matches
    if (storedNonce.walletAddress !== walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address mismatch'
      });
    }

    // Verify nonce is not expired (5 minutes)
    const now = Date.now();
    if (now - storedNonce.timestamp > 5 * 60 * 1000) {
      nonceStore.delete(nonce);
      return res.status(400).json({
        success: false,
        error: 'Nonce expired'
      });
    }

    // Verify domain binding (allow localhost variations)
    const domainMatch = message.match(/Domain: ([^\n]+)/);
    const requestHost = req.get('host') || '';
    const messageDomain = domainMatch ? domainMatch[1] : '';
    
    // Allow localhost variations (localhost, localhost:5000, 127.0.0.1, etc.)
    const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1');
    const isMessageLocalhost = messageDomain.includes('localhost') || messageDomain.includes('127.0.0.1');
    
    if (!domainMatch || (!isLocalhost && !isMessageLocalhost && messageDomain !== requestHost.split(':')[0])) {
      return res.status(400).json({
        success: false,
        error: 'Domain binding verification failed'
      });
    }

    // TODO: Implement actual signature verification using Solana libraries
    // For now, we'll accept the signature if all other checks pass
    // In production, you should verify the signature using @solana/web3.js

    // Clean up used nonce
    nonceStore.delete(nonce);

    // Try to create/update user in Supabase if admin client is available
    let user;
    if (supabaseAdmin) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('wallet_address', walletAddress)
          .single();

        if (existingUser) {
          // Update existing user
          const { data: updatedUser } = await supabaseAdmin
            .from('users')
            .update({
              last_login: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.id)
            .select()
            .single();
          
          user = updatedUser;
        } else {
          // Create new user
          const newUserId = crypto.randomUUID();
          const { data: newUser } = await supabaseAdmin
            .from('users')
            .insert({
              id: newUserId,
              wallet_address: walletAddress,
              provider: 'phantom',
              name: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
              email: null,
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString()
            })
            .select()
            .single();
          
          user = newUser;
        }

        if (user) {
          console.log('✅ [SIWS] User synced to Supabase:', user.id);
        }
      } catch (dbError) {
        console.error('❌ [SIWS] Database sync error:', dbError);
        // Continue with authentication even if DB sync fails
      }
    }

    // Fallback user object if Supabase sync fails
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        walletAddress,
        provider: 'phantom',
        email: null,
        name: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
        createdAt: new Date().toISOString()
      };
    }

    console.log(`✅ [SIWS] Wallet authentication successful: ${walletAddress}`);

    res.json({
      success: true,
      user,
      message: 'Wallet authentication successful'
    });

  } catch (error) {
    console.error('❌ [SIWS] Signature verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Signature verification failed'
    });
  }
};
