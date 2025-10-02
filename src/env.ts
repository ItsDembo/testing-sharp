// Environment variable validation
// This file throws at build time if required server environment variables are missing

export const env = {
  // Server-side environment variables (never exposed to client)
  SPORTS_API_KEY: process.env.SPORTS_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  
  // Client-side environment variables (safe to expose)
  NODE_ENV: process.env.NODE_ENV,
  VITE_DEBUG_TERMINAL: process.env.VITE_DEBUG_TERMINAL,
} as const;

// Validate required server environment variables
const requiredServerVars = [
  'SPORTS_API_KEY',
  'DATABASE_URL', 
  'SESSION_SECRET'
] as const;

for (const varName of requiredServerVars) {
  if (!env[varName]) {
    throw new Error(
      `Missing required environment variable: ${varName}. ` +
      `Please set this in your .env file or deployment environment.`
    );
  }
}

// Type-safe environment access
export type Env = typeof env;
export type ServerEnv = Pick<Env, 'SPORTS_API_KEY' | 'DATABASE_URL' | 'SESSION_SECRET'>;
export type ClientEnv = Pick<Env, 'NODE_ENV' | 'VITE_DEBUG_TERMINAL'>;
