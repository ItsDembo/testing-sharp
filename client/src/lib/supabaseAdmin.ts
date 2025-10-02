import { createClient } from '@supabase/supabase-js';

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const supabaseAdmin = createClient(
  need('NEXT_PUBLIC_SUPABASE_URL'),
  need('SUPABASE_SERVICE_ROLE_KEY') // only available in server env
);
