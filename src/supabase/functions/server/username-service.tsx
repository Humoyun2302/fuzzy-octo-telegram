import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import * as kv from "./kv_store.tsx";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Generates a URL-safe username from a full name
 * Converts to lowercase, replaces spaces with hyphens, removes special chars
 */
export function generateUsername(fullName: string): string {
  return fullName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove special characters
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generates a random 4-digit suffix
 */
function generateRandomSuffix(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Checks if a username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  // Check in KV store
  const kvKey = `barber_username:${username}`;
  const existingBarberId = await kv.get(kvKey);
  
  if (existingBarberId) {
    return false;
  }
  
  // Double-check in database
  const { data } = await supabase
    .from('barbers')
    .select('id')
    .eq('username', username)
    .single();
  
  return !data;
}

/**
 * Generates a unique username for a barber
 * If the base username is taken, appends a random 4-digit number
 */
export async function generateUniqueUsername(fullName: string): Promise<string> {
  const baseUsername = generateUsername(fullName);
  
  // Try base username first
  if (await isUsernameAvailable(baseUsername)) {
    return baseUsername;
  }
  
  // Try up to 10 times to generate a unique username with suffix
  for (let i = 0; i < 10; i++) {
    const suffix = generateRandomSuffix();
    const usernameWithSuffix = `${baseUsername}-${suffix}`;
    
    if (await isUsernameAvailable(usernameWithSuffix)) {
      return usernameWithSuffix;
    }
  }
  
  // Fallback: use timestamp-based suffix
  const timestamp = Date.now().toString().slice(-4);
  return `${baseUsername}-${timestamp}`;
}

/**
 * Sets a username for a barber
 * Updates both KV store and database
 */
export async function setBarberUsername(barberId: string, username: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check availability
    const available = await isUsernameAvailable(username);
    if (!available) {
      return { success: false, error: 'Username already taken' };
    }
    
    // Get current username to remove old mapping
    const { data: barber } = await supabase
      .from('barbers')
      .select('username')
      .eq('id', barberId)
      .single();
    
    // Remove old username mapping if exists
    if (barber?.username) {
      const oldKvKey = `barber_username:${barber.username}`;
      await kv.del(oldKvKey);
    }
    
    // Set new username mapping in KV store
    const kvKey = `barber_username:${username}`;
    await kv.set(kvKey, barberId);
    
    // Update database
    const { error: dbError } = await supabase
      .from('barbers')
      .update({ username })
      .eq('id', barberId);
    
    if (dbError) {
      console.error('[USERNAME] Database update error:', dbError);
      // Rollback KV change
      await kv.del(kvKey);
      if (barber?.username) {
        await kv.set(`barber_username:${barber.username}`, barberId);
      }
      return { success: false, error: 'Failed to update database' };
    }
    
    console.log(`[USERNAME] Set username for barber ${barberId}: ${username}`);
    return { success: true };
  } catch (error) {
    console.error('[USERNAME] Error setting username:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Gets barber ID from username
 */
export async function getBarberIdByUsername(username: string): Promise<string | null> {
  // Try KV store first (faster)
  const kvKey = `barber_username:${username}`;
  const barberId = await kv.get(kvKey);
  
  if (barberId) {
    return barberId;
  }
  
  // Fallback to database
  const { data } = await supabase
    .from('barbers')
    .select('id')
    .eq('username', username)
    .single();
  
  if (data?.id) {
    // Update KV cache
    await kv.set(kvKey, data.id);
    return data.id;
  }
  
  return null;
}

/**
 * Gets full barber profile by username
 */
export async function getBarberByUsername(username: string): Promise<any> {
  const { data: barber, error } = await supabase
    .from('barbers')
    .select('*')
    .eq('username', username)
    .single();
  
  if (error || !barber) {
    return null;
  }
  
  // Fetch services for this barber
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('barber_id', barber.id);
  
  return {
    ...barber,
    services: services || []
  };
}
