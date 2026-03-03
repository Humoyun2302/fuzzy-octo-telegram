import { createClient } from '@supabase/supabase-js';
import { projectId as devProjectId, publicAnonKey as devPublicAnonKey } from './info';

// Check if running in production (Netlify) or development (Figma Make)
// In production, environment variables will be available
const isProduction = import.meta.env?.VITE_SUPABASE_URL !== undefined && 
                     import.meta.env?.VITE_SUPABASE_URL !== '';

let supabaseUrl: string;
let supabaseAnonKey: string;
let projectId: string;

if (isProduction) {
  // Production: Use environment variables from Netlify
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = 'FATAL: Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  // Extract project ID from URL
  projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
  
  console.log('✅ Supabase (Production Mode - Using Environment Variables)');
} else {
  // Development: Use Figma Make integration
  // Use static imports instead of dynamic await import to avoid top-level await issues
  
  if (!devProjectId || !devPublicAnonKey) {
    const errorMsg = 'FATAL: Missing Supabase credentials. Please check Figma Make Supabase Integration.';
    console.error(errorMsg, { projectId: !!devProjectId, publicAnonKey: !!devPublicAnonKey });
    throw new Error(errorMsg);
  }

  // Validate project ID format (should be gxethvdtqpqtfibpznub)
  if (devProjectId !== 'gxethvdtqpqtfibpznub') {
    console.warn('⚠️ Unexpected Supabase project ID:', devProjectId);
    console.warn('Expected: gxethvdtqpqtfibpznub');
  }

  supabaseUrl = `https://${devProjectId}.supabase.co`;
  supabaseAnonKey = devPublicAnonKey;
  projectId = devProjectId;
  
  console.log('🔧 Supabase (Development Mode - Using Figma Make)');
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

// Export project info
export { projectId };
export const publicAnonKey = supabaseAnonKey;

// Export config for debugging
export const supabaseConfig = {
  url: supabaseUrl,
  projectId,
  isCorrectProject: projectId === 'gxethvdtqpqtfibpznub',
  mode: isProduction ? 'production' : 'development'
};

// Debug logging (dev/preview only)
if (typeof window !== 'undefined') {
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname.includes('figma') ||
                window.location.hostname.includes('preview');
  
  if (isDev) {
    console.log('🔌 [Supabase Client] Connected:', {
      url: `${supabaseUrl.slice(0, 15)}...${supabaseUrl.slice(-15)}`,
      projectId: projectId,
      isCorrectProject: projectId === 'gxethvdtqpqtfibpznub',
      mode: isProduction ? 'production' : 'development',
      keyPrefix: supabaseAnonKey.slice(0, 15) + '...',
      authConfig: 'persistSession: true, autoRefreshToken: true'
    });
  }
}