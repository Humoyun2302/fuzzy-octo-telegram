import * as kv from './kv_store.tsx';

// Phone validation and formatting
function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  // Remove all whitespace
  const cleanPhone = phone.replace(/\s/g, '');
  
  // Check format: +998XXXXXXXXX (Uzbekistan)
  if (!/^\+998\d{9}$/.test(cleanPhone)) {
    return { 
      valid: false, 
      error: 'Phone number must be in format +998 XX XXX XX XX' 
    };
  }
  
  return { valid: true };
}

function formatPhoneDisplay(phone: string): string {
  // Remove all whitespace
  const cleanPhone = phone.replace(/\s/g, '');
  
  // Format: +998 XX XXX XX XX
  if (cleanPhone.startsWith('+998') && cleanPhone.length === 13) {
    return `+998 ${cleanPhone.slice(4, 6)} ${cleanPhone.slice(6, 9)} ${cleanPhone.slice(9, 11)} ${cleanPhone.slice(11, 13)}`;
  }
  
  return phone;
}

// Password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'trimly-auth-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password against hash
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Generate session token
function generateSessionToken(): string {
  return crypto.randomUUID() + '-' + Date.now();
}

interface UserAccount {
  id: string;
  phone: string;
  password_hash: string;
  fullName: string;
  role: 'customer' | 'barber';
  createdAt: string;
}

interface UserSession {
  userId: string;
  phone: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

export class AuthService {
  private readonly SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

  // Sign up new user
  async signup(data: {
    phone: string;
    password: string;
    fullName: string;
    role: 'customer' | 'barber';
    subscriptionPlan?: string;
  }): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const { phone, password, fullName, role, subscriptionPlan } = data;

      // Validate phone number
      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.valid) {
        return { success: false, error: phoneValidation.error };
      }

      // Check if user already exists
      const existingUser = await kv.get<UserAccount>(`auth:user:${phone}`);
      if (existingUser) {
        return { success: false, error: 'Phone number already registered' };
      }

      // Hash password
      const password_hash = await hashPassword(password);

      // Create user ID
      const userId = crypto.randomUUID();

      // Create auth account
      const account: UserAccount = {
        id: userId,
        phone,
        password_hash,
        fullName,
        role,
        createdAt: new Date().toISOString(),
      };

      await kv.set(`auth:user:${phone}`, account);

      // Create user profile
      const now = new Date();
      let trialUsed = false;
      let subscriptionStatus = 'inactive';
      let subscriptionStartDate = null;
      let subscriptionExpiryDate = null;

      if (subscriptionPlan === 'trial-3-months') {
        const expiry = new Date(now);
        expiry.setMonth(now.getMonth() + 3);

        trialUsed = true;
        subscriptionStatus = 'active';
        subscriptionStartDate = now.toISOString();
        subscriptionExpiryDate = expiry.toISOString();
      }

      const profile = {
        id: userId,
        phone,
        fullName,
        role,
        subscriptionPlan,
        trialUsed,
        subscriptionStatus,
        subscriptionStartDate,
        subscriptionExpiryDate,
        createdAt: now.toISOString(),
      };

      await kv.set(`user:profile:${userId}`, profile);

      console.log('✅ User signed up successfully:', { phone, role });
      return { success: true, userId };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Failed to create account' };
    }
  }

  // Login user
  async login(phone: string, password: string): Promise<{
    success: boolean;
    sessionToken?: string;
    user?: any;
    error?: string;
  }> {
    try {
      // Get user account
      const account = await kv.get<UserAccount>(`auth:user:${phone}`);
      if (!account) {
        return { success: false, error: 'Invalid phone number or password' };
      }

      // Verify password
      const isValid = await verifyPassword(password, account.password_hash);
      if (!isValid) {
        return { success: false, error: 'Invalid phone number or password' };
      }

      // Create session
      const sessionToken = generateSessionToken();
      const session: UserSession = {
        userId: account.id,
        phone: account.phone,
        role: account.role,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.SESSION_TTL,
      };

      await kv.set(`session:${sessionToken}`, session);

      // Get user profile
      const profile = await kv.get(`user:profile:${account.id}`);

      console.log('✅ User logged in successfully:', { phone, role: account.role });

      return {
        success: true,
        sessionToken,
        user: {
          id: account.id,
          phone: account.phone,
          fullName: account.fullName,
          role: account.role,
        },
        profile,
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  // Verify session token
  async verifySession(sessionToken: string): Promise<{
    valid: boolean;
    userId?: string;
    phone?: string;
    role?: string;
  }> {
    try {
      console.log(`[AuthService] Verifying session token: ${sessionToken.substring(0, 20)}...`);
      
      const session = await kv.get<UserSession>(`session:${sessionToken}`);
      
      if (!session) {
        console.log('[AuthService] ❌ Session not found in KV store');
        return { valid: false };
      }

      console.log('[AuthService] Session found:', {
        userId: session.userId,
        phone: session.phone,
        role: session.role,
        createdAt: new Date(session.createdAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
        isExpired: Date.now() > session.expiresAt
      });

      // Check expiry
      if (Date.now() > session.expiresAt) {
        console.log('[AuthService] ❌ Session expired, deleting...');
        await kv.del(`session:${sessionToken}`);
        return { valid: false };
      }

      console.log('[AuthService] ✅ Session valid');
      
      return {
        valid: true,
        userId: session.userId,
        phone: session.phone,
        role: session.role,
      };
    } catch (error) {
      console.error('[AuthService] Session verification error:', error);
      return { valid: false };
    }
  }

  // Logout user
  async logout(sessionToken: string): Promise<{ success: boolean }> {
    try {
      await kv.del(`session:${sessionToken}`);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    }
  }

  // Reset password (after OTP verification)
  async resetPassword(phone: string, newPassword: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get user account
      const account = await kv.get<UserAccount>(`auth:user:${phone}`);
      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      // Hash new password
      const password_hash = await hashPassword(newPassword);

      // Update account
      const updated = { ...account, password_hash };
      await kv.set(`auth:user:${phone}`, updated);

      console.log('✅ Password reset successfully:', { phone });
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }

  // Change password (for logged-in user)
  async changePassword(
    phone: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user account
      const account = await kv.get<UserAccount>(`auth:user:${phone}`);
      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      // Verify old password
      const isValid = await verifyPassword(oldPassword, account.password_hash);
      if (!isValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash new password
      const password_hash = await hashPassword(newPassword);

      // Update account
      const updated = { ...account, password_hash };
      await kv.set(`auth:user:${phone}`, updated);

      console.log('✅ Password changed successfully:', { phone });
      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Failed to change password' };
    }
  }
}