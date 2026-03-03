import { createClient } from '@supabase/supabase-js';

/**
 * Production-ready Supabase client for Netlify deployment
 * 
 * This file works in two environments:
 * 1. Figma Make: Uses hardcoded credentials from info.tsx
 * 2. Netlify Production: Uses environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 */

// Try to import Figma Make credentials (will be available in dev)
let figmaMakeProjectId = '';
let figmaMakeAnonKey = '';

try {
  const info = await import('./info.tsx');
  figmaMakeProjectId = info.projectId || '';
  figmaMakeAnonKey = info.publicAnonKey || '';
} catch (e) {
  // info.tsx doesn't exist in production build - this is expected
  console.log('Running in production mode (no info.tsx)');
}

// Get credentials from environment variables (Netlify) or fallback to Figma Make
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                    (figmaMakeProjectId ? `https://${figmaMakeProjectId}.supabase.co` : '');

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                        figmaMakeAnonKey;

// Validate credentials
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'FATAL: Missing Supabase credentials. ' +
    'In production, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables in Netlify.';
  console.error(errorMsg, { 
    hasUrl: !!supabaseUrl, 
    hasKey: !!supabaseAnonKey,
    env: import.meta.env.MODE 
  });
  throw new Error(errorMsg);
}

// Create single Supabase client instance with auth configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'bardak-auth-token', // Updated from 'soniya' to 'bardak'
  }
});

// Export config for debugging
export const supabaseConfig = {
  url: supabaseUrl,
  projectId: figmaMakeProjectId || new URL(supabaseUrl).hostname.split('.')[0],
  environment: import.meta.env.MODE,
  source: import.meta.env.VITE_SUPABASE_URL ? 'env-variables' : 'figma-make'
};

// Debug logging (dev/preview only)
if (typeof window !== 'undefined') {
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname.includes('figma') ||
                window.location.hostname.includes('preview') ||
                import.meta.env.DEV;
  
  if (isDev) {
    console.log('🔌 [Supabase Client] Connected:', {
      url: `${supabaseUrl.slice(0, 20)}...`,
      source: supabaseConfig.source,
      environment: import.meta.env.MODE,
      keyPrefix: supabaseAnonKey.slice(0, 15) + '...',
      authConfig: 'persistSession: true, autoRefreshToken: true'
    });
  }
}
