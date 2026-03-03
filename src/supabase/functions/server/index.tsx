import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import * as kv from "./kv_store.tsx";
import { OTPService } from "./otp-service.tsx";
import { AuthService } from "./auth-service.tsx";
import * as usernameService from "./username-service.tsx";

const app = new Hono();
const otpService = new OTPService();
const authService = new AuthService();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Session-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper to get user from session token
const getUser = async (c: any) => {
  // First check for custom session token header (takes priority)
  let sessionToken = c.req.header('X-Session-Token');
  
  // Fallback to Authorization header for backward compatibility
  if (!sessionToken) {
    const authHeader = c.req.header('Authorization');
    console.log('[Auth] Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      // Only use Authorization header if it's NOT the public anon key (which would be a JWT)
      if (token && !token.startsWith('eyJ')) {
        sessionToken = token;
      }
    }
  }
  
  console.log('[Auth] Session token:', sessionToken ? `${sessionToken.substring(0, 20)}...` : 'Missing');
  
  if (!sessionToken) {
    console.log('[Auth] ❌ No session token found');
    return null;
  }
  
  const sessionData = await authService.verifySession(sessionToken);
  console.log('[Auth] Session verification result:', {
    valid: sessionData.valid,
    userId: sessionData.userId,
    role: sessionData.role
  });
  
  if (!sessionData.valid) {
    console.log('[Auth] ❌ Session validation failed');
    return null;
  }
  
  console.log('[Auth] ✅ User authenticated:', sessionData.userId);
  
  return {
    id: sessionData.userId,
    phone: sessionData.phone,
    role: sessionData.role,
  };
}

// Health check endpoint
app.get("/make-server-166b98fa/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Sign Up Route - Both customers and barbers use KV auth, then sync to database
app.post("/make-server-166b98fa/signup", async (c) => {
  try {
    const { phone, password, fullName, role, subscriptionPlan, paymentMethod, barbershopName, workingDistrict, languages } = await c.req.json();

    if (!phone || !password || !fullName || !role) {
      return c.json({ error: "Phone, password, full name, and role are required" }, 400);
    }

    console.log(`[SIGNUP] ${role} signup initiated`, { barbershopName, workingDistrict, languages });

    // Step 1: Sign up user via KV store (same for both customers and barbers)
    const result = await authService.signup({
      phone,
      password,
      fullName,
      role,
      subscriptionPlan,
    });

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    console.log(`[SIGNUP] KV auth created for ${role}:`, result.userId);

    // Step 2: Sync to database based on role
    if (role === 'customer') {
      try {
        const now = new Date().toISOString();
        
        console.log('[CUSTOMER SIGNUP] Syncing to public.customers');
        
        // Upsert customer to public.customers table
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .upsert({
            id: result.userId,
            full_name: fullName,
            phone: phone,
            created_at: now,
            updated_at: now,
          }, { 
            onConflict: 'id' 
          })
          .select()
          .single();
        
        if (customerError) {
          console.error('[CUSTOMER SIGNUP] Database sync failed:', customerError);
          
          // Clean up KV auth on database failure
          await kv.del(`auth:user:${phone}`);
          await kv.del(`user:profile:${result.userId}`);
          
          return c.json({ 
            error: "Failed to create customer profile. Please try again.",
            details: customerError.message 
          }, 500);
        }

        console.log('[CUSTOMER SIGNUP] ✅ Synced to database:', customerData.id);
        
        return c.json({ 
          success: true,
          userId: result.userId,
          role: 'customer',
          profile: {
            id: customerData.id,
            fullName: customerData.full_name,
            phone: customerData.phone,
            role: 'customer',
            createdAt: customerData.created_at,
            updatedAt: customerData.updated_at
          }
        });
      } catch (error) {
        console.error('[CUSTOMER SIGNUP] Exception:', error);
        
        // Clean up KV auth
        await kv.del(`auth:user:${phone}`);
        await kv.del(`user:profile:${result.userId}`);
        
        return c.json({ 
          error: "Failed to create customer profile. Please try again.",
          details: error.toString()
        }, 500);
      }
    }

    if (role === 'barber') {
      try {
        const now = new Date();
        let trialUsed = false;
        let subscriptionStatus = 'free_trial';
        let subscriptionExpiryDate = null;

        if (subscriptionPlan === 'trial-3-months' || !subscriptionPlan) {
          const expiry = new Date(now);
          expiry.setMonth(now.getMonth() + 3);
          trialUsed = false;
          subscriptionStatus = 'free_trial';
          subscriptionExpiryDate = expiry.toISOString();
        }

        // Generate unique username for barber
        const username = await usernameService.generateUniqueUsername(fullName);
        console.log(`[SIGNUP] Generated username for ${fullName}: ${username}`);
        
        const { data: barberData, error: barberError } = await supabase
          .from('barbers')
          .insert({
            id: result.userId,
            full_name: fullName,
            username: username,
            phone: phone,
            barbershop_name: barbershopName || null,
            working_district: workingDistrict || null,
            districts: workingDistrict ? [workingDistrict] : [],
            languages: languages || [],
            subscription_status: subscriptionStatus,
            subscription_plan: subscriptionPlan || 'free_trial',
            subscription_expiry_date: subscriptionExpiryDate,
            trial_used: trialUsed,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .select()
          .single();

        if (barberError) {
          console.error("❌ Failed to create barber in Supabase barbers table:", barberError);
          
          await kv.del(`auth:user:${phone}`);
          await kv.del(`user:profile:${result.userId}`);
          
          return c.json({ 
            error: "Failed to create barber profile. Please try again.",
            details: barberError.message 
          }, 500);
        }

        console.log('✅ Barber created in Supabase database:', barberData.id);
        
        // Set username mapping in KV store
        await usernameService.setBarberUsername(result.userId, username);
        console.log(`✅ Username mapping created: ${username} -> ${result.userId}`);
        
        // CRITICAL: Also create subscription record in subscriptions table
        console.log('[SIGNUP] Creating subscription record for new barber...');
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            barber_id: result.userId,
            plan_type: subscriptionPlan || 'free_trial',
            status: 'active',
            expires_at: subscriptionExpiryDate,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          });

        if (subscriptionError) {
          console.error('❌ Failed to create subscription record:', subscriptionError);
          // Don't fail signup, but log the error
        } else {
          console.log('✅ Subscription record created for new barber');
        }
        
        return c.json({ 
          success: true,
          userId: result.userId,
          role: 'barber',
          profile: {
            id: barberData.id,
            fullName: barberData.full_name,
            phone: barberData.phone,
            role: 'barber',
            avatar: barberData.avatar || null,
            bio: barberData.bio || '',
            subscriptionStatus: barberData.subscription_status,
            currentPlan: barberData.subscription_plan,
            subscriptionExpiryDate: barberData.subscription_expiry_date,
            trialUsed: barberData.trial_used,
          }
        });
      } catch (supabaseError) {
        console.error("❌ Supabase error during barber signup:", supabaseError);
        
        await kv.del(`auth:user:${phone}`);
        await kv.del(`user:profile:${result.userId}`);
        
        return c.json({ 
          error: "Failed to create barber profile. Please try again.",
          details: supabaseError.toString()
        }, 500);
      }
    }

    return c.json({ error: "Invalid role" }, 400);
  } catch (error) {
    console.error("Signup route error:", error);
    return c.json({ error: "Signup failed" }, 500);
  }
});

// Login with phone + password - KV auth for both, then sync to database
app.post("/make-server-166b98fa/auth/login", async (c) => {
  try {
    const { phone, password } = await c.req.json();
    
    if (!phone || !password) {
      return c.json({ error: "Phone and password are required" }, 400);
    }
    
    console.log('[LOGIN] Attempting KV auth');
    
    // Authenticate via KV store (same for both customers and barbers)
    const result = await authService.login(phone, password);
    
    if (!result.success) {
      return c.json({ error: "INVALID_CREDENTIALS" }, 401);
    }
    
    console.log(`[LOGIN] KV auth successful for ${result.user.role}`);
    
    // For customers, sync to/from public.customers table
    if (result.user.role === 'customer') {
      try {
        const now = new Date().toISOString();
        
        // Check if customer exists - only fetch, never overwrite existing data
        const { data: existingCustomer, error: fetchError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', result.user.id)
          .maybeSingle();

        if (fetchError) {
          console.error('[LOGIN] Customer fetch failed:', fetchError);
          return c.json({ 
            error: "Failed to load customer profile" 
          }, 500);
        }

        let customerData = existingCustomer;

        // Only create customer if they don't exist (first login)
        if (!existingCustomer) {
          console.log('[LOGIN] Customer not found, creating new record...');
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
              id: result.user.id,
              full_name: result.user.fullName,
              phone: result.user.phone,
              created_at: now,
              updated_at: now,
            })
            .select()
            .single();

          if (createError) {
            console.error('[LOGIN] Customer creation failed:', createError);
            return c.json({ 
              error: "Failed to create customer profile" 
            }, 500);
          }

          customerData = newCustomer;
          console.log('[LOGIN] ✅ Customer created in database');
        } else {
          console.log('[LOGIN] ✅ Customer loaded from database (existing data preserved)');
        }

        return c.json({
          success: true,
          sessionToken: result.sessionToken,
          user: result.user,
          profile: {
            id: customerData.id,
            fullName: customerData.full_name,
            phone: customerData.phone,
            role: 'customer',
            createdAt: customerData.created_at,
            updatedAt: customerData.updated_at
          },
        });
      } catch (syncError) {
        console.error('[LOGIN] Customer sync exception:', syncError);
        return c.json({ error: "Failed to load customer profile" }, 500);
      }
    }
    
    // For barbers, load from Supabase database
    if (result.user.role === 'barber') {
      try {
        const { data: barberData, error: barberError } = await supabase
          .from('barbers')
          .select('*')
          .eq('id', result.user.id)
          .single();

        if (barberError || !barberData) {
          console.error('❌ Barber not found in database:', barberError);
          
          // Auto-create barber entry if missing
          const now = new Date();
          const expiryDate = new Date(now);
          expiryDate.setMonth(expiryDate.getMonth() + 3);
          
          const { data: newBarber, error: createError } = await supabase
            .from('barbers')
            .insert({
              id: result.user.id,
              full_name: result.user.fullName,
              phone: result.user.phone,
              subscription_status: 'free_trial',
              subscription_plan: 'free_trial',
              subscription_expiry_date: expiryDate.toISOString(),
              trial_used: false,
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .select()
            .single();

          if (createError) {
            console.error('❌ Failed to create barber during login:', createError);
            return c.json({ 
              error: "Failed to load barber profile. Please contact support." 
            }, 500);
          }

          console.log('✅ Barber auto-created during login');
          
          // CRITICAL: Also create subscription record in subscriptions table
          console.log('[LOGIN] Creating subscription record for new barber...');
          const { error: subscriptionError } = await supabase
            .from('subscriptions')
            .insert({
              barber_id: result.user.id,
              plan_type: 'free_trial',
              status: 'active',
              expires_at: expiryDate.toISOString(),
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
            });

          if (subscriptionError) {
            console.error('❌ Failed to create subscription record:', subscriptionError);
            // Don't fail login, but log the error
          } else {
            console.log('✅ Subscription record created for new barber');
          }
          
          // Calculate subscription active status (single source of truth)
          const isSubscriptionActive = (() => {
            const status = newBarber.subscription_status;
            const expiryDate = newBarber.subscription_expiry_date;
            const now = new Date();
            
            // Check if status is active or free_trial
            const isActiveStatus = status === 'active' || status === 'free_trial';
            
            // Check if expiry date is future (if it exists)
            const isFutureExpiry = expiryDate ? new Date(expiryDate) > now : false;
            
            // Active if (future expiry) OR (active status AND no past expiry)
            if (isFutureExpiry) return true;
            if (isActiveStatus && (!expiryDate || isFutureExpiry)) return true;
            
            return false;
          })();
          
          return c.json({
            success: true,
            sessionToken: result.sessionToken,
            user: result.user,
            profile: {
              id: newBarber.id,
              fullName: newBarber.full_name,
              phone: newBarber.phone,
              role: 'barber',
              avatar: newBarber.avatar || null,
              bio: newBarber.bio || '',
              subscriptionStatus: newBarber.subscription_status,
              currentPlan: newBarber.subscription_plan,
              subscriptionExpiryDate: newBarber.subscription_expiry_date,
              trialUsed: newBarber.trial_used,
              isSubscriptionActive: isSubscriptionActive,
              districts: newBarber.districts || [],
              languages: newBarber.languages || [],
              specialties: newBarber.specialties || [],
              gallery: newBarber.gallery || [],
              workingHours: newBarber.working_hours || null,
              address: newBarber.address || null,
              workingDistrict: newBarber.working_district || null,
              priceRange: {
                min: newBarber.price_range_min || 0,
                max: newBarber.price_range_max || 0
              },
              rating: newBarber.rating || 5.0,
              reviewCount: newBarber.review_count || 0,
            },
          });
        }

        console.log('✅ Barber logged in, profile loaded from database');
        
        // Calculate subscription active status (single source of truth)
        const isSubscriptionActive = (() => {
          const status = barberData.subscription_status;
          const expiryDate = barberData.subscription_expiry_date;
          const now = new Date();
          
          // Check if status is active or free_trial
          const isActiveStatus = status === 'active' || status === 'free_trial';
          
          // Check if expiry date is future (if it exists)
          const isFutureExpiry = expiryDate ? new Date(expiryDate) > now : false;
          
          // Active if (future expiry) OR (active status AND no past expiry)
          if (isFutureExpiry) return true;
          if (isActiveStatus && (!expiryDate || isFutureExpiry)) return true;
          
          return false;
        })();
        
        return c.json({
          success: true,
          sessionToken: result.sessionToken,
          user: result.user,
          profile: {
            id: barberData.id,
            fullName: barberData.full_name,
            phone: barberData.phone,
            role: 'barber',
            avatar: barberData.avatar,
            bio: barberData.bio,
            subscriptionStatus: barberData.subscription_status,
            currentPlan: barberData.subscription_plan,
            subscriptionExpiryDate: barberData.subscription_expiry_date,
            trialUsed: barberData.trial_used,
            isSubscriptionActive: isSubscriptionActive,
            districts: barberData.districts || [],
            languages: barberData.languages || [],
            specialties: barberData.specialties || [],
            gallery: barberData.gallery || [],
            workingHours: barberData.working_hours,
            address: barberData.address,
            workingDistrict: barberData.working_district,
            priceRange: {
              min: barberData.price_range_min || 0,
              max: barberData.price_range_max || 0
            },
            rating: barberData.rating || 5.0,
            reviewCount: barberData.review_count || 0,
          },
        });
      } catch (syncError) {
        console.error('❌ Database error during barber login:', syncError);
        return c.json({ error: "Failed to load barber profile" }, 500);
      }
    }
    
    return c.json({ error: "Invalid credentials" }, 401);
  } catch (error) {
    console.error("Login route error:", error);
    return c.json({ error: "Login failed" }, 500);
  }
});

// Verify session endpoint
app.post("/make-server-166b98fa/auth/verify-session", async (c) => {
  try {
    const sessionToken = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return c.json({ valid: false }, 401);
    }

    const result = await authService.verifySession(sessionToken);
    
    if (!result.valid) {
      return c.json({ valid: false }, 401);
    }

    return c.json({
      valid: true,
      userId: result.userId,
      phone: result.phone,
      role: result.role
    });
  } catch (error) {
    console.error("Verify session error:", error);
    return c.json({ valid: false }, 500);
  }
});

// Verify session endpoint - restores user session from token
app.post("/make-server-166b98fa/auth/verify", async (c) => {
  try {
    const sessionToken = c.req.header('X-Session-Token');
    
    if (!sessionToken) {
      return c.json({ error: "Session token required" }, 401);
    }
    
    console.log('[VERIFY] Verifying session...');
    
    const sessionData = await authService.verifySession(sessionToken);
    
    if (!sessionData.valid) {
      return c.json({ error: "Invalid or expired session" }, 401);
    }
    
    console.log(`[VERIFY] Session valid for ${sessionData.role}`);
    
    // For customers, fetch from database
    if (sessionData.role === 'customer') {
      const { data: customerData, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', sessionData.userId)
        .maybeSingle();
      
      if (error) {
        console.error('[VERIFY] Customer fetch failed:', error);
        return c.json({ error: "Failed to load profile" }, 500);
      }
      
      return c.json({
        success: true,
        user: {
          id: sessionData.userId,
          phone: sessionData.phone,
          fullName: customerData?.full_name || 'User',
          role: 'customer',
        },
        profile: customerData ? {
          id: customerData.id,
          fullName: customerData.full_name,
          phone: customerData.phone,
          role: 'customer',
          createdAt: customerData.created_at,
          updatedAt: customerData.updated_at
        } : null,
      });
    }
    
    // For barbers, fetch from barbers table
    if (sessionData.role === 'barber') {
      const { data: barberData, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('id', sessionData.userId)
        .maybeSingle();
      
      if (error) {
        console.error('[VERIFY] Barber fetch failed:', error);
        return c.json({ error: "Failed to load profile" }, 500);
      }
      
      return c.json({
        success: true,
        user: {
          id: sessionData.userId,
          phone: sessionData.phone,
          fullName: barberData?.full_name || 'Barber',
          role: 'barber',
        },
        profile: barberData ? {
          id: barberData.id,
          fullName: barberData.full_name,
          phone: barberData.phone,
          avatar: barberData.avatar,
          bio: barberData.bio,
          role: 'barber',
          subscriptionStatus: barberData.subscription_status,
          subscriptionExpiryDate: barberData.subscription_expiry_date,
          currentPlan: barberData.subscription_plan,
          trialUsed: barberData.trial_used,
          districts: barberData.districts,
          languages: barberData.languages,
          workplaceAddress: barberData.address,
          googleMapsUrl: barberData.google_maps_url,
          gallery: barberData.gallery,
          servicesForKids: barberData.services_for_kids,
        } : null,
      });
    }
    
    return c.json({ error: "Unknown role" }, 400);
  } catch (error) {
    console.error("[VERIFY] Error:", error);
    return c.json({ error: "Verification failed" }, 500);
  }
});

// Logout endpoint
app.post("/make-server-166b98fa/auth/logout", async (c) => {
  try {
    const sessionToken = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (sessionToken) {
      await authService.logout(sessionToken);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return c.json({ error: "Logout failed" }, 500);
  }
});

// Send OTP for password reset
app.post("/make-server-166b98fa/auth/send-otp", async (c) => {
  try {
    const { phone } = await c.req.json();
    
    if (!phone) {
      return c.json({ error: "Phone number is required" }, 400);
    }
    
    // Get client IP for rate limiting
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    console.log('[SEND OTP] Sending OTP to:', phone);
    
    const result = await otpService.sendOTP(phone, ip);
    
    if (!result.success) {
      return c.json({ error: result.error || "Failed to send OTP" }, 400);
    }
    
    return c.json({ 
      success: true,
      message: "Verification code sent successfully"
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return c.json({ error: "Failed to send verification code" }, 500);
  }
});

// Reset password with OTP verification
app.post("/make-server-166b98fa/auth/reset-password", async (c) => {
  try {
    const { phone, otp, newPassword } = await c.req.json();
    
    if (!phone || !otp || !newPassword) {
      return c.json({ error: "Phone, OTP, and new password are required" }, 400);
    }
    
    if (newPassword.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }
    
    // Get client IP
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    console.log('[RESET PASSWORD] Verifying OTP for:', phone);
    
    // Verify OTP
    const otpResult = await otpService.verifyOTP(phone, otp, ip);
    
    if (!otpResult.success) {
      return c.json({ error: otpResult.error || "Invalid verification code" }, 400);
    }
    
    console.log('[RESET PASSWORD] OTP verified, resetting password...');
    
    // Reset password using auth service
    const resetResult = await authService.resetPassword(phone, newPassword);
    
    if (!resetResult.success) {
      return c.json({ error: resetResult.error || "Failed to reset password" }, 400);
    }
    
    console.log('[RESET PASSWORD] ✅ Password reset successful');
    
    return c.json({ 
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return c.json({ error: "Failed to reset password" }, 500);
  }
});

// Profile GET - Sync from database for customers
app.get("/make-server-166b98fa/profile", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    // For customers, fetch from public.customers table
    if (user.role === 'customer') {
      const { data: customerData, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error || !customerData) {
        console.error('[PROFILE GET] Customer not found:', error);
        return c.json({ error: "Profile not found" }, 404);
      }
      
      return c.json({ 
        profile: {
          id: customerData.id,
          fullName: customerData.full_name,
          phone: customerData.phone,
          role: 'customer',
          createdAt: customerData.created_at,
          updatedAt: customerData.updated_at
        }
      });
    }
    
    // For barbers, use KV store
    const profile = await kv.get(`user:profile:${user.id}`);
    return c.json({ profile: profile || {} });
  } catch (e) {
    console.error("[PROFILE GET] Exception:", e);
    return c.json({ error: "Failed to load profile" }, 500);
  }
});

// Cron job endpoint to check subscription expiration
app.post("/make-server-166b98fa/cron/check-subscriptions", async (c) => {
  try {
    const now = new Date().toISOString();
    console.log(`[CRON] Checking for expired subscriptions at ${now}`);

    // 1. Find barbers with active status but past expiry date
    const { data: expiredBarbers, error: fetchError } = await supabase
      .from('barbers')
      .select('id, subscription_expiry_date')
      .or('subscription_status.eq.active,subscription_status.eq.free_trial')
      .lt('subscription_expiry_date', now);

    if (fetchError) {
      console.error('[CRON] Error fetching expired barbers:', fetchError);
      return c.json({ error: fetchError.message }, 500);
    }

    if (!expiredBarbers || expiredBarbers.length === 0) {
      console.log('[CRON] No expired subscriptions found');
      return c.json({ message: "No expired subscriptions found", count: 0 });
    }

    console.log(`[CRON] Found ${expiredBarbers.length} expired barbers. Updating status...`);

    // 2. Update their status to expired and unavailable
    // We update them one by one or in batch. Supabase update doesn't support bulk update with different WHERE easily unless we use IN.
    // Since we are setting them all to the same state, we can use .in()
    const expiredIds = expiredBarbers.map(b => b.id);

    // Update barbers table
    const { error: updateError } = await supabase
      .from('barbers')
      .update({
        subscription_status: 'expired',
        is_available: false,
        updated_at: now
      })
      .in('id', expiredIds);

    if (updateError) {
      console.error('[CRON] Error updating barbers table:', updateError);
      return c.json({ error: "Failed to update barbers table" }, 500);
    }

    // Update subscriptions table (set active subscriptions to expired)
    const { error: subUpdateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'expired',
        updated_at: now
      })
      .in('barber_id', expiredIds)
      .eq('status', 'active');

    if (subUpdateError) {
      console.error('[CRON] Error updating subscriptions table:', subUpdateError);
      // We don't fail here, as the main 'barbers' table is updated
    }

    console.log(`[CRON] Successfully expired ${expiredIds.length} subscriptions`);

    return c.json({
      success: true,
      updated_count: expiredIds.length,
      updated_ids: expiredIds
    });

  } catch (error) {
    console.error("[CRON] Internal error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Profile UPDATE - Sync to database for customers
app.put("/make-server-166b98fa/profile", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const updates = await c.req.json();
  
  try {
    // For customers, update in public.customers table AND KV store
    if (user.role === 'customer') {
      // Update KV store first
      const current = await kv.get(`user:profile:${user.id}`) || {};
      const updatedKV = { ...current, ...updates, id: user.id };
      await kv.set(`user:profile:${user.id}`, updatedKV);
      
      // Then sync to database
      const { data, error } = await supabase
        .from('customers')
        .update({
          full_name: updates.fullName || updates.full_name,
          phone: updates.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error('[PROFILE UPDATE] Customer update failed:', error);
        return c.json({ error: "Failed to update profile" }, 500);
      }
      
      console.log('[PROFILE UPDATE] ✅ Customer synced to database');
      
      return c.json({ 
        profile: {
          id: data.id,
          fullName: data.full_name,
          phone: data.phone,
          role: 'customer',
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      });
    }
    
    // For barbers, use KV store
    const current = await kv.get(`user:profile:${user.id}`) || {};
    const updated = { ...current, ...updates, id: user.id };
    
    await kv.set(`user:profile:${user.id}`, updated);
    return c.json({ profile: updated });
  } catch (e) {
    console.error("Profile UPDATE error:", e);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

// Barber Slots - Create new slot
app.post("/make-server-166b98fa/barber/slots", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  if (user.role !== 'barber') {
    return c.json({ error: "Only barbers can create slots" }, 403);
  }

  try {
    const { slot_date, start_time, end_time, is_available } = await c.req.json();

    // Validation
    if (!slot_date || !start_time || !end_time) {
      return c.json({ error: "Missing required fields: slot_date, start_time, end_time" }, 400);
    }

    // Validate end_time is after start_time (handle midnight crossing)
    const [startHour, startMin] = start_time.split(':').map(Number);
    const [endHour, endMin] = end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // If end time is earlier than start time, it means it crosses midnight (e.g., 23:00 to 00:00)
    // Add 24 hours (1440 minutes) to end time for comparison
    if (endMinutes < startMinutes) {
      endMinutes += 1440; // 24 * 60 = 1440 minutes
    }
    
    if (endMinutes <= startMinutes) {
      return c.json({ error: "End time must be after start time" }, 400);
    }

    // Check if a slot with the same barber_id, slot_date, and start_time already exists
    const { data: existingSlot, error: checkError } = await supabase
      .from('barber_slots')
      .select('id')
      .eq('barber_id', user.id)
      .eq('slot_date', slot_date)
      .eq('start_time', start_time)
      .maybeSingle();

    if (checkError) {
      console.error('❌ [BARBER SLOTS] Error checking for existing slot:', checkError);
      return c.json({ 
        error: "Failed to check for existing slot", 
        details: checkError.message 
      }, 500);
    }

    // If slot already exists, return success without inserting
    if (existingSlot) {
      console.log('⚠️ [BARBER SLOTS] Slot already exists, skipping insert:', {
        barber_id: user.id,
        slot_date,
        start_time
      });
      return c.json({ 
        slot: existingSlot, 
        message: "Slot already exists" 
      });
    }

    // Insert into barber_slots table using service role client
    // SINGLE SOURCE OF TRUTH: Initialize is_booked = false AND status = 'available'
    const { data, error } = await supabase
      .from('barber_slots')
      .insert({
        barber_id: user.id,
        slot_date,
        start_time,
        end_time,
        is_booked: false, // Initialize as not booked (available)
        status: 'available'  // CRITICAL: Set status field for consistency
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate key error gracefully (race condition or constraint violation)
      if (error.code === '23505') {
        console.log('⚠️ [BARBER SLOTS] Race condition detected - Slot already exists (caught on insert):', {
          barber_id: user.id,
          slot_date,
          start_time
        });
        
        // Try to fetch the existing slot to return it
        const { data: existing } = await supabase
          .from('barber_slots')
          .select()
          .eq('barber_id', user.id)
          .eq('slot_date', slot_date)
          .eq('start_time', start_time)
          .maybeSingle();
          
        return c.json({ 
          slot: existing, 
          message: "Slot already exists" 
        });
      }

      console.error('❌ [BARBER SLOTS] Insert error:', error);
      return c.json({ 
        error: "Failed to create slot", 
        details: error.message 
      }, 500);
    }

    console.log('✅ [BARBER SLOTS] Slot created successfully:', data.id);
    return c.json({ slot: data });
  } catch (e: any) {
    console.error('❌ [BARBER SLOTS] Exception:', e);
    return c.json({ error: "Failed to create slot", details: e.message }, 500);
  }
});

// Barber Slots - Batch create slots (optimized for Quick Setup)
app.post("/make-server-166b98fa/barber/slots/batch", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  if (user.role !== 'barber') {
    return c.json({ error: "Only barbers can create slots" }, 403);
  }

  try {
    const { slots, deleteDateRange } = await c.req.json();

    // Validation
    if (!Array.isArray(slots) || slots.length === 0) {
      return c.json({ error: "slots must be a non-empty array" }, 400);
    }

    console.log(`🚀 [BATCH SETUP] Processing ${slots.length} slots for barber ${user.id}`);

    let deletedCount = 0;

    // STEP 1: Delete existing slots if date range provided
    if (deleteDateRange && deleteDateRange.from && deleteDateRange.to) {
      console.log(`🗑️ [BATCH SETUP] Deleting existing slots from ${deleteDateRange.from} to ${deleteDateRange.to}`);
      
      const { error: deleteError, count } = await supabase
        .from('barber_slots')
        .delete({ count: 'exact' })
        .eq('barber_id', user.id)
        .gte('slot_date', deleteDateRange.from)
        .lte('slot_date', deleteDateRange.to);

      if (deleteError) {
        console.error('❌ [BATCH SETUP] Delete error:', deleteError);
        return c.json({ 
          error: "Failed to delete existing slots", 
          details: deleteError.message 
        }, 500);
      }

      deletedCount = count || 0;
      console.log(`✅ [BATCH SETUP] Deleted ${deletedCount} existing slots`);
    }

    // STEP 2: Prepare all slots with barber_id and default values
    const slotsToInsert = slots.map(slot => ({
      barber_id: user.id,
      slot_date: slot.slot_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_booked: false,
      status: 'available'
    }));

    // STEP 3: Batch insert all slots in ONE query
    console.log(`🚀 [BATCH SETUP] Inserting ${slotsToInsert.length} new slots`);
    
    const { data, error } = await supabase
      .from('barber_slots')
      .insert(slotsToInsert)
      .select();

    if (error) {
      console.error('❌ [BATCH SETUP] Insert error:', error);
      return c.json({ 
        error: "Failed to batch insert slots", 
        details: error.message 
      }, 500);
    }

    console.log(`✅ [BATCH SETUP] Successfully inserted ${data?.length || 0} slots`);
    return c.json({ 
      success: true, 
      deleted: deletedCount,
      inserted: data?.length || 0,
      slots: data 
    });
  } catch (e: any) {
    console.error('❌ [BATCH SETUP] Exception:', e);
    return c.json({ error: "Failed to batch setup slots", details: e.message }, 500);
  }
});

// Barber Slots - Delete slot
app.delete("/make-server-166b98fa/barber/slots/:slotId", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  if (user.role !== 'barber') {
    return c.json({ error: "Only barbers can delete slots" }, 403);
  }

  try {
    const slotId = c.req.param('slotId');

    // Delete from barber_slots table using service role client
    // Only allow barber to delete their own slots
    const { error } = await supabase
      .from('barber_slots')
      .delete()
      .eq('id', slotId)
      .eq('barber_id', user.id);

    if (error) {
      console.error('❌ [BARBER SLOTS] Delete error:', error);
      return c.json({ 
        error: "Failed to delete slot", 
        details: error.message 
      }, 500);
    }

    console.log('✅ [BARBER SLOTS] Slot deleted successfully:', slotId);
    return c.json({ success: true });
  } catch (e: any) {
    console.error('❌ [BARBER SLOTS] Exception:', e);
    return c.json({ error: "Failed to delete slot", details: e.message }, 500);
  }
});

// Barber Slots - Update slot time
app.put("/make-server-166b98fa/barber/slots/:slotId", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  if (user.role !== 'barber') {
    return c.json({ error: "Only barbers can update slots" }, 403);
  }

  try {
    const slotId = c.req.param('slotId');
    const { start_time, end_time } = await c.req.json();

    console.log('🔧 [BARBER SLOTS] Update request:', { slotId, start_time, end_time, barberId: user.id });

    // Validate input
    if (!start_time || !end_time) {
      return c.json({ error: "start_time and end_time are required" }, 400);
    }

    // Update the slot in barber_slots table using service role client
    // Only allow barber to update their own slots
    const { data, error } = await supabase
      .from('barber_slots')
      .update({
        start_time,
        end_time
      })
      .eq('id', slotId)
      .eq('barber_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ [BARBER SLOTS] Update error:', error);
      return c.json({ 
        error: "Failed to update slot", 
        details: error.message 
      }, 500);
    }

    if (!data) {
      console.error('❌ [BARBER SLOTS] Slot not found or not owned by barber');
      return c.json({ error: "Slot not found or unauthorized" }, 404);
    }

    console.log('✅ [BARBER SLOTS] Slot updated successfully:', data);
    return c.json({ slot: data });
  } catch (e: any) {
    console.error('❌ [BARBER SLOTS] Exception:', e);
    return c.json({ error: "Failed to update slot", details: e.message }, 500);
  }
});

// Barber Slots - Get ALL slots for a barber (bypasses RLS, includes booked slots)
app.get("/make-server-166b98fa/barber/slots", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  if (user.role !== 'barber') {
    return c.json({ error: "Only barbers can view their slots" }, 403);
  }

  try {
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    console.log('[BARBER SLOTS GET] Fetching ALL slots for barber:', {
      barberId: user.id,
      startDate,
      endDate
    });

    // Build query - fetch ALL slots (including booked ones) using service role
    let query = supabase
      .from('barber_slots')
      .select('*')
      .eq('barber_id', user.id)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('slot_date', startDate);
    }
    if (endDate) {
      query = query.lte('slot_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [BARBER SLOTS GET] Query error:', error);
      return c.json({ 
        error: "Failed to fetch slots", 
        details: error.message 
      }, 500);
    }

    console.log(`✅ [BARBER SLOTS GET] Fetched ${data?.length || 0} slots (including booked)`);
    console.log('[BARBER SLOTS GET] Slot breakdown:', {
      total: data?.length || 0,
      booked: data?.filter((s: any) => s.is_booked === true).length || 0,
      available: data?.filter((s: any) => s.is_booked === false).length || 0
    });

    return c.json({ slots: data || [] });
  } catch (e: any) {
    console.error('❌ [BARBER SLOTS GET] Exception:', e);
    return c.json({ error: "Failed to fetch slots", details: e.message }, 500);
  }
});

// Barber Profile - Update barber profile (bypasses RLS using service role)
app.put("/make-server-166b98fa/barber-profile", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  if (user.role !== 'barber') {
    return c.json({ error: "Only barbers can update barber profiles" }, 403);
  }

  try {
    const updates = await c.req.json();

    console.log('[BARBER PROFILE] Updating profile for barber:', user.id);
    console.log('[BARBER PROFILE] 📥 Received updates:', updates);
    console.log('[BARBER PROFILE] 📥 Key fields:', {
      address: updates.address,
      location: updates.location,
      googleMapsUrl: updates.googleMapsUrl,
      hasCoordinates: !!(updates.googleMapsUrl && updates.googleMapsUrl.startsWith('{'))
    });

    // Build update payload (exclude subscription fields and sensitive data)
    const updatePayload: any = {};
    
    if (updates.name || updates.fullName) {
      updatePayload.full_name = updates.name || updates.fullName;
      updatePayload.name = updates.name || updates.fullName;
    }
    if (updates.phone) updatePayload.phone = updates.phone;
    if (updates.bio !== undefined) updatePayload.bio = updates.bio;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.barbershopName !== undefined) updatePayload.barbershop_name = updates.barbershopName;
    if (updates.address || updates.location) {
      updatePayload.address = updates.address || updates.location;
      updatePayload.location = updates.address || updates.location;
    }
    if (updates.googleMapsUrl !== undefined) updatePayload.google_maps_url = updates.googleMapsUrl;
    if (updates.avatar) updatePayload.avatar = updates.avatar;
    if (updates.languages) updatePayload.languages = updates.languages;
    if (updates.districts) updatePayload.districts = updates.districts;
    if (updates.specialties) updatePayload.specialties = updates.specialties;
    if (updates.servicesForKids !== undefined) updatePayload.services_for_kids = updates.servicesForKids;
    if (updates.gallery) updatePayload.gallery = updates.gallery;
    if (updates.priceRangeMin !== undefined) updatePayload.price_range_min = updates.priceRangeMin;
    if (updates.priceRangeMax !== undefined) updatePayload.price_range_max = updates.priceRangeMax;
    
    updatePayload.updated_at = new Date().toISOString();

    // Update using service role client (bypasses RLS)
    const { data, error } = await supabase
      .from('barbers')
      .update(updatePayload)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ [BARBER PROFILE] Update error:', error);
      return c.json({ 
        error: "Failed to update barber profile", 
        details: error.message,
        supabaseError: error 
      }, 500);
    }

    console.log('✅ [BARBER PROFILE] Profile updated successfully');
    console.log('✅ [BARBER PROFILE] Updated data:', data);
    console.log('✅ [BARBER PROFILE] Verified fields:', {
      address: data.address,
      location: data.location,
      google_maps_url: data.google_maps_url
    });
    return c.json({ profile: data });
  } catch (e: any) {
    console.error('❌ [BARBER PROFILE] Exception:', e);
    return c.json({ error: "Failed to update barber profile", details: e.message }, 500);
  }
});

// Barber Services - Save services for a barber (bypasses RLS using service role)
app.post("/make-server-166b98fa/barbers/:barberId/services", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  if (user.role !== 'barber') {
    return c.json({ error: "Only barbers can manage services" }, 403);
  }

  try {
    const barberIdFromUrl = c.req.param('barberId');
    
    console.log('[BARBER SERVICES] barberId from URL param:', barberIdFromUrl, 'type:', typeof barberIdFromUrl);
    console.log('[BARBER SERVICES] user.id:', user.id, 'type:', typeof user.id);
    
    // CRITICAL FIX: Always use user.id as the source of truth for barber_id
    // This ensures we NEVER have null barber_id, regardless of URL parameter issues
    const barberId = user.id;
    
    console.log('[BARBER SERVICES] Using barberId:', barberId);
    
    // Validate barber ID exists
    if (!barberId || barberId === 'undefined' || barberId === 'null') {
      return c.json({ error: "Invalid barber ID - user.id is missing" }, 400);
    }
    
    // Optional: Verify URL parameter matches if provided
    if (barberIdFromUrl && barberIdFromUrl !== barberId) {
      console.warn('[BARBER SERVICES] ⚠️ URL barberId mismatch:', { barberIdFromUrl, userId: barberId });
      // Don't fail - just log the mismatch
    }

    const { services } = await c.req.json();

    console.log('[BARBER SERVICES] Saving services for barber:', barberId, 'Services count:', services?.length);
    console.log('[BARBER SERVICES] Raw services:', JSON.stringify(services));

    if (!Array.isArray(services)) {
      return c.json({ error: "Services must be an array" }, 400);
    }

    // Delete existing services for this barber
    const { error: deleteError } = await supabase
      .from('services')
      .delete()
      .eq('barber_id', barberId);

    if (deleteError) {
      console.error('❌ [BARBER SERVICES] Delete error:', deleteError);
      return c.json({ 
        error: "Failed to clear existing services", 
        details: deleteError.message 
      }, 500);
    }

    // Insert new services
    if (services.length > 0) {
      const servicesWithBarberId = services.map((service: any) => {
        // CRITICAL: Explicitly create clean payload - do NOT spread service object
        // This ensures we don't accidentally include id or other fields that might override barber_id
        const payload = {
          barber_id: barberId,  // Explicitly set barber_id
          name: service.name,
          price: service.price,
          duration: service.duration,
          description: service.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        console.log('[BARBER SERVICES] Service payload:', JSON.stringify(payload));
        console.log('[BARBER SERVICES] barberId value:', barberId, 'is null?', barberId === null, 'is undefined?', barberId === undefined);
        return payload;
      });

      console.log('[BARBER SERVICES] 🔍 Final array to insert:', JSON.stringify(servicesWithBarberId, null, 2));
      console.log('[BARBER SERVICES] 🔍 Checking first service barber_id:', servicesWithBarberId[0]?.barber_id);

      const { data, error: insertError } = await supabase
        .from('services')
        .insert(servicesWithBarberId)
        .select();

      if (insertError) {
        console.error('❌ [BARBER SERVICES] Insert error:', insertError);
        return c.json({ 
          error: "Failed to save services", 
          details: insertError.message 
        }, 500);
      }

      console.log('✅ [BARBER SERVICES] Services saved successfully:', data.length);
      return c.json({ services: data });
    }

    console.log('✅ [BARBER SERVICES] Services cleared (no new services)');
    return c.json({ services: [] });
  } catch (e: any) {
    console.error('❌ [BARBER SERVICES] Exception:', e);
    return c.json({ error: "Failed to save services", details: e.message }, 500);
  }
});

// Customers - Ensure customer exists (create if missing)
app.post("/make-server-166b98fa/customers/ensure", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { auth_user_id, full_name, phone } = await c.req.json();

    if (!auth_user_id) {
      return c.json({ error: "auth_user_id is required" }, 400);
    }

    console.log('[CUSTOMERS] Ensuring customer exists:', { auth_user_id, full_name, phone });

    // Check if customer already exists by auth_user_id
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_user_id', auth_user_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = not found, which is fine
      console.error('[CUSTOMERS] Error checking for existing customer:', fetchError);
      throw fetchError;
    }

    if (existingCustomer) {
      console.log('[CUSTOMERS] Customer already exists:', existingCustomer.id);
      return c.json({ customer: existingCustomer });
    }

    // Customer doesn't exist by auth_user_id
    // Check if a customer exists with this phone number (legacy customer without auth_user_id)
    if (phone) {
      const { data: customerByPhone, error: phoneError } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      if (phoneError && phoneError.code !== 'PGRST116') {
        console.error('[CUSTOMERS] Error checking for customer by phone:', phoneError);
      }

      // If customer exists with this phone, update their auth_user_id
      if (customerByPhone) {
        console.log('[CUSTOMERS] Found existing customer by phone, updating auth_user_id');
        
        const { data: updatedCustomer, error: updateError } = await supabase
          .from('customers')
          .update({
            auth_user_id,
            full_name: full_name || customerByPhone.full_name,
          })
          .eq('id', customerByPhone.id)
          .select()
          .single();

        if (updateError) {
          console.error('[CUSTOMERS] Error updating customer:', updateError);
          throw updateError;
        }

        console.log('[CUSTOMERS] ✅ Customer updated with auth_user_id:', updatedCustomer.id);
        return c.json({ customer: updatedCustomer });
      }
    }

    // No existing customer by auth_user_id or phone, create new one
    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert({
        auth_user_id,
        full_name: full_name || 'Customer',
        phone: phone,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[CUSTOMERS] Error creating customer:', insertError);
      throw insertError;
    }

    console.log('[CUSTOMERS] ✅ New customer created:', newCustomer.id);
    return c.json({ customer: newCustomer });
  } catch (e: any) {
    console.error('[CUSTOMERS] Error ensuring customer exists:', e);
    return c.json({ error: "Failed to ensure customer exists", details: e.message }, 500);
  }
});

// Bookings - Create new booking (bypasses RLS using service role)
app.post("/make-server-166b98fa/bookings", async (c) => {
  try {
    const bookingData = await c.req.json();
    
    console.log('📝 [BOOKINGS POST] Received booking request:', {
      source: bookingData.source,
      hasGuestName: !!bookingData.guest_name,
      hasGuestPhone: !!bookingData.guest_phone,
      hasCustomerId: !!bookingData.customer_id,
      barber_id: bookingData.barber_id,
      slot_id: bookingData.slot_id,
      allFields: Object.keys(bookingData)
    });

    // Check if this is a guest booking (has guest_name and guest_phone, no auth)
    // Guest bookings are treated exactly like manual bookings
    const isGuestBooking = bookingData.guest_name && bookingData.guest_phone && bookingData.source === 'guest';
    
    let user = null;
    let customerId = null;
    let bookingSource = 'online';

    if (isGuestBooking) {
      // Guest booking - online booking without authentication
      // Uses manual_customer fields for storage but keeps 'guest' source for filtering
      console.log('[BOOKINGS] Guest booking (online without auth):', {
        guestName: bookingData.guest_name,
        guestPhone: bookingData.guest_phone,
        barberId: bookingData.barber_id
      });
      customerId = null; // Guest bookings have null customer_id
      bookingSource = 'guest'; // Use 'guest' source to distinguish from barber-created manual bookings
    } else {
      // Authenticated booking (customer or barber)
      user = await getUser(c);
      if (!user) return c.json({ error: "Unauthorized" }, 401);
      
      // Allow both customers and barbers to create bookings
      if (user.role !== 'customer' && user.role !== 'barber') {
        return c.json({ error: "Only customers and barbers can create bookings" }, 403);
      }

      // Determine booking source and customer_id
      bookingSource = bookingData.source || 'online';
      
      if (bookingSource === 'manual' && user.role === 'barber') {
        // Manual booking by barber - customer_id is null
        customerId = null;
        console.log('[BOOKINGS] Manual booking by barber:', {
          barberId: user.id,
          manualCustomerName: bookingData.manual_customer_name,
          manualCustomerPhone: bookingData.manual_customer_phone
        });
      } else {
        // Online booking by customer
        customerId = user.id;
        console.log('[BOOKINGS] Online booking by customer:', {
          customerId: user.id
        });
      }
    }

    console.log('[BOOKINGS] Creating booking:', {
      customerId,
      barberId: bookingData.barber_id,
      slotId: bookingData.slot_id,
      serviceId: bookingData.service_id,
      bookingCode: bookingData.booking_code,
      source: bookingSource
    });

    // Validation - service_id is now optional (for legacy barbers)
    if (!bookingData.barber_id || !bookingData.slot_id) {
      return c.json({ 
        error: "Missing required fields: barber_id, slot_id" 
      }, 400);
    }

    // Build insert payload - only include service_id if provided
    const insertPayload: any = {
      booking_code: bookingData.booking_code,
      customer_id: customerId, // null for manual, user.id for online
      barber_id: bookingData.barber_id,
      slot_id: bookingData.slot_id,
      service_type: bookingData.service_type,
      date: bookingData.date,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time,
      duration: bookingData.duration,
      price: bookingData.price,
      status: 'booked',
      customer_phone: bookingData.customer_phone,
      source: bookingSource,
      notes: bookingData.notes
    };

    // Add manual customer fields for manual or guest bookings
    if (bookingSource === 'manual' || bookingSource === 'guest') {
      if (isGuestBooking) {
        // Guest bookings: use guest_name/guest_phone as manual fields
        insertPayload.manual_customer_name = bookingData.guest_name;
        insertPayload.manual_customer_phone = bookingData.guest_phone;
        console.log('[BOOKINGS] Added guest fields as manual fields:', {
          manual_customer_name: insertPayload.manual_customer_name,
          manual_customer_phone: insertPayload.manual_customer_phone
        });
      } else {
        // Barber manual bookings: use manual_customer_name/manual_customer_phone
        insertPayload.manual_customer_name = bookingData.manual_customer_name || bookingData.customerName;
        insertPayload.manual_customer_phone = bookingData.manual_customer_phone || bookingData.customerPhone;
        console.log('[BOOKINGS] Added manual fields:', {
          manual_customer_name: insertPayload.manual_customer_name,
          manual_customer_phone: insertPayload.manual_customer_phone
        });
      }
    }

    // Only add service_id if it exists (for barbers with database-backed services)
    if (bookingData.service_id) {
      insertPayload.service_id = bookingData.service_id;
    }

    // IMPORTANT: Clean up any old cancelled bookings with the same slot_id
    // This prevents unique constraint violations when rebooking cancelled slots
    console.log('[BOOKINGS] Cleaning up old cancelled bookings for slot:', bookingData.slot_id);
    const { data: oldBookings, error: cleanupCheckError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('slot_id', bookingData.slot_id);

    if (!cleanupCheckError && oldBookings && oldBookings.length > 0) {
      console.log(`[BOOKINGS] Found ${oldBookings.length} existing booking(s) with this slot_id:`, oldBookings);
      
      // Delete ALL old bookings with this slot_id (both cancelled and any orphaned ones)
      const { error: cleanupError } = await supabase
        .from('bookings')
        .delete()
        .eq('slot_id', bookingData.slot_id);
      
      if (cleanupError) {
        console.error('⚠️ [BOOKINGS] Failed to clean up old bookings:', cleanupError);
      } else {
        console.log('✅ [BOOKINGS] Cleaned up old bookings for slot:', bookingData.slot_id);
      }
    }

    // Insert into bookings table using service role client (bypasses RLS)
    const { data, error } = await supabase
      .from('bookings')
      .insert(insertPayload)
      .select(`
        *,
        barber:barbers!bookings_barber_id_fkey (
          id,
          full_name,
          avatar,
          phone,
          location
        ),
        customer:customers!bookings_customer_id_fkey (
          id,
          full_name,
          phone
        ),
        service:services!bookings_service_id_fkey (
          id,
          name,
          price,
          duration
        )
      `)
      .single();

    if (error) {
      console.error('❌ [BOOKINGS] Insert error:', error);
      return c.json({ 
        error: "Failed to create booking", 
        details: error.message 
      }, 500);
    }

    console.log('✅ [BOOKINGS] Booking created successfully:', data.id);

    // Mark ALL overlapping slots as booked (keep fixed 30-minute grid, no new times)
    // Calculate booking end time
    const bookingStart = bookingData.start_time; // Already in HH:MM:SS format
    const bookingEnd = bookingData.end_time;     // Already in HH:MM:SS format
    
    console.log('[BOOKINGS] 🔒 Blocking all slots in range:', {
      barber_id: bookingData.barber_id,
      date: bookingData.date,
      start_time_gte: bookingStart,
      start_time_lt: bookingEnd,
      duration: bookingData.duration
    });

    // Update ALL slots where: slot.start_time >= bookingStart AND slot.start_time < bookingEnd
    // SINGLE SOURCE OF TRUTH: Set is_booked = true AND status = 'booked'
    const { data: blockedSlots, error: slotUpdateError } = await supabase
      .from('barber_slots')
      .update({
        is_booked: true,
        status: 'booked',  // CRITICAL: Also update status field for consistency
        booked_by_customer_id: customerId, // null for manual, customer_id for online
        booked_at: new Date().toISOString()
      })
      .eq('barber_id', bookingData.barber_id)
      .eq('slot_date', bookingData.date)
      .gte('start_time', bookingStart)
      .lt('start_time', bookingEnd)
      .select();

    if (slotUpdateError) {
      console.error('⚠️ [BOOKINGS] Failed to mark slots as booked:', slotUpdateError);
      // Don't fail the entire booking if slot update fails
    } else {
      console.log('✅ [BOOKINGS] Blocked', blockedSlots?.length || 0, 'overlapping slots:', 
        blockedSlots?.map(s => s.start_time.substring(0, 5)).join(', '));
    }

    // NO SLOT RECALCULATION - Keep the fixed 30-minute grid
    // All overlapping slots are now marked as booked, maintaining original start times
    console.log('[BOOKINGS] ✅ Fixed 30-minute slot grid maintained - no time modifications');

    return c.json({ booking: data });
  } catch (e: any) {
    console.error('❌ [BOOKINGS] Exception:', e);
    return c.json({ error: "Failed to create booking", details: e.message }, 500);
  }
});

// Bookings - Get all bookings with joins (for customer or barber)
app.get("/make-server-166b98fa/bookings", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    console.log('[BOOKINGS GET] Fetching bookings for:', user.role, user.id);

    // Build query based on user role
    // Explicitly specify foreign key relationships to avoid ambiguity
    let query = supabase
      .from('bookings')
      .select(`
        *,
        barber:barbers!bookings_barber_id_fkey (
          id,
          full_name,
          avatar,
          phone,
          location
        ),
        customer:customers!bookings_customer_id_fkey (
          id,
          full_name,
          phone
        ),
        service:services!bookings_service_id_fkey (
          id,
          name,
          price,
          duration
        )
      `);

    if (user.role === 'customer') {
      query = query.eq('customer_id', user.id);
    } else if (user.role === 'barber') {
      query = query.eq('barber_id', user.id);
    }

    const { data, error } = await query
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('❌ [BOOKINGS GET] Query error:', error);
      return c.json({ 
        error: "Failed to fetch bookings", 
        details: error.message 
      }, 500);
    }

    console.log(`✅ [BOOKINGS GET] Found ${data?.length || 0} bookings`);

    // Map to frontend format
    const mappedBookings = (data || []).map((booking: any) => {
      // Use service data if available, otherwise use service_type and price from booking
      const serviceName = booking.service?.name || booking.service_type || 'Haircut';
      const servicePrice = booking.service?.price || booking.price || 0;

      return {
        id: booking.id,
        barberId: booking.barber_id,
        customerId: booking.customer_id,
        date: booking.date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        duration: booking.duration,
        status: booking.status === 'booked' ? 'confirmed' : booking.status,
        serviceType: serviceName,
        price: servicePrice,
        customerPhone: booking.customer_phone,
        notes: booking.notes,
        bookingType: booking.source || 'online',
        slotId: booking.slot_id,
        serviceId: booking.service_id,
        // Manual booking fields (includes guest bookings)
        manualCustomerName: booking.manual_customer_name,
        manualCustomerPhone: booking.manual_customer_phone,
        // Joined data
        barber: booking.barber ? {
          id: booking.barber.id,
          full_name: booking.barber.full_name,
          avatar: booking.barber.avatar,
          phone: booking.barber.phone,
          location: booking.barber.location
        } : null,
        customer: booking.customer ? {
          id: booking.customer.id,
          full_name: booking.customer.full_name,
          phone: booking.customer.phone
        } : null,
        // Deprecated fields for backward compatibility
        barberName: booking.barber?.full_name || 'Barber',
        barberAvatar: booking.barber?.avatar,
        customerName: booking.customer?.full_name || booking.manual_customer_name || 'Customer'
      };
    });

    return c.json({ bookings: mappedBookings });
  } catch (e: any) {
    console.error('❌ [BOOKINGS GET] Exception:', e);
    return c.json({ error: "Failed to fetch bookings", details: e.message }, 500);
  }
});

// Bookings - Reschedule booking (frees old slot and books new slot)
app.put("/make-server-166b98fa/bookings/:bookingId/reschedule", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  if (user.role !== 'customer') {
    return c.json({ error: "Only customers can reschedule bookings" }, 403);
  }

  try {
    const bookingId = c.req.param('bookingId');
    const { new_slot_id, new_date, new_start_time, new_end_time } = await c.req.json();

    console.log('[RESCHEDULE] Rescheduling booking:', {
      bookingId,
      customerId: user.id,
      newSlotId: new_slot_id,
      newDate: new_date,
      newStartTime: new_start_time,
      newEndTime: new_end_time
    });

    // Validation
    if (!new_slot_id || !new_date || !new_start_time || !new_end_time) {
      return c.json({ 
        error: "Missing required fields: new_slot_id, new_date, new_start_time, new_end_time" 
      }, 400);
    }

    // Step 1: Get the existing booking to find the old slot
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('customer_id', user.id) // Ensure customer owns this booking
      .single();

    if (fetchError || !existingBooking) {
      console.error('❌ [RESCHEDULE] Booking not found:', fetchError);
      return c.json({ 
        error: "Booking not found or you don't have permission" 
      }, 404);
    }

    const oldSlotId = existingBooking.slot_id;

    console.log('[RESCHEDULE] Found existing booking, old slot:', oldSlotId);

    // Step 2: Free up ALL old overlapping slots (keep fixed 30-minute grid)
    console.log('[RESCHEDULE] Freeing old slots in range:', {
      barber_id: existingBooking.barber_id,
      date: existingBooking.date,
      start_time_gte: existingBooking.start_time,
      start_time_lt: existingBooking.end_time
    });

    // SINGLE SOURCE OF TRUTH: Set is_booked = false AND status = 'available' to free old slots
    const { data: freedSlots, error: freeSlotError } = await supabase
      .from('barber_slots')
      .update({
        is_booked: false,
        status: 'available',  // CRITICAL: Also update status field for consistency
        booked_by_customer_id: null,
        booked_at: null
      })
      .eq('barber_id', existingBooking.barber_id)
      .eq('slot_date', existingBooking.date)
      .gte('start_time', existingBooking.start_time)
      .lt('start_time', existingBooking.end_time)
      .select();

    if (freeSlotError) {
      console.error('⚠️ [RESCHEDULE] Failed to free old slots:', freeSlotError);
    } else {
      console.log('✅ [RESCHEDULE] Freed', freedSlots?.length || 0, 'old slots:', 
        freedSlots?.map(s => s.start_time.substring(0, 5)).join(', '));
    }

    // Step 2.5: Clean up any old bookings with the new slot_id (prevent unique constraint violation)
    console.log('[RESCHEDULE] Cleaning up old bookings for new slot:', new_slot_id);
    const { data: conflictingBookings, error: cleanupCheckError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('slot_id', new_slot_id)
      .neq('id', bookingId); // Don't delete the current booking

    if (!cleanupCheckError && conflictingBookings && conflictingBookings.length > 0) {
      console.log(`[RESCHEDULE] Found ${conflictingBookings.length} conflicting booking(s):`, conflictingBookings);
      
      // Delete conflicting bookings
      const { error: cleanupError } = await supabase
        .from('bookings')
        .delete()
        .eq('slot_id', new_slot_id)
        .neq('id', bookingId);
      
      if (cleanupError) {
        console.error('⚠️ [RESCHEDULE] Failed to clean up conflicting bookings:', cleanupError);
      } else {
        console.log('✅ [RESCHEDULE] Cleaned up conflicting bookings');
      }
    }

    // Step 3: Book ALL new overlapping slots (keep fixed 30-minute grid)
    console.log('[RESCHEDULE] Booking new slots in range:', {
      barber_id: existingBooking.barber_id,
      date: new_date,
      start_time_gte: new_start_time,
      start_time_lt: new_end_time
    });

    // SINGLE SOURCE OF TRUTH: Set is_booked = true AND status = 'booked' for new slots
    const { data: bookedSlots, error: bookSlotError } = await supabase
      .from('barber_slots')
      .update({
        is_booked: true,
        status: 'booked',  // CRITICAL: Also update status field for consistency
        booked_by_customer_id: user.id,
        booked_at: new Date().toISOString()
      })
      .eq('barber_id', existingBooking.barber_id)
      .eq('slot_date', new_date)
      .gte('start_time', new_start_time)
      .lt('start_time', new_end_time)
      .select();

    if (bookSlotError) {
      console.error('❌ [RESCHEDULE] Failed to book new slots:', bookSlotError);
      
      // Rollback: Re-book the old slots if new slot booking failed
      await supabase
        .from('barber_slots')
        .update({
          is_booked: true,
          status: 'booked',  // CRITICAL: Also update status field for consistency
          booked_by_customer_id: user.id,
          booked_at: existingBooking.created_at
        })
        .eq('barber_id', existingBooking.barber_id)
        .eq('slot_date', existingBooking.date)
        .gte('start_time', existingBooking.start_time)
        .lt('start_time', existingBooking.end_time);
      
      return c.json({ 
        error: "Failed to book new slot. New slot may already be taken.", 
        details: bookSlotError.message 
      }, 500);
    }

    console.log('✅ [RESCHEDULE] Booked', bookedSlots?.length || 0, 'new slots:', 
      bookedSlots?.map(s => s.start_time.substring(0, 5)).join(', '));

    // Step 4: Update the booking record
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        slot_id: new_slot_id,
        date: new_date,
        start_time: new_start_time,
        end_time: new_end_time,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [RESCHEDULE] Failed to update booking:', updateError);
      
      // Rollback both slots
      await supabase.from('barber_slots').update({ 
        status: 'available', 
        is_available: true, 
        booked_by_customer_id: null 
      }).eq('id', new_slot_id);
      
      if (oldSlotId) {
        await supabase.from('barber_slots').update({ 
          status: 'booked', 
          is_available: false, 
          booked_by_customer_id: user.id 
        }).eq('id', oldSlotId);
      }
      
      return c.json({ 
        error: "Failed to update booking record", 
        details: updateError.message 
      }, 500);
    }

    console.log('✅ [RESCHEDULE] Booking rescheduled successfully:', bookingId);

    return c.json({ 
      success: true,
      booking: updatedBooking 
    });
  } catch (e: any) {
    console.error('❌ [RESCHEDULE] Exception:', e);
    return c.json({ error: "Failed to reschedule booking", details: e.message }, 500);
  }
});

// Bookings - Cancel booking (frees up slot)
app.delete("/make-server-166b98fa/bookings/:bookingId", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const bookingId = c.req.param('bookingId');

    // Validate bookingId
    if (!bookingId || bookingId === 'undefined' || bookingId === 'null') {
      console.error('❌ [CANCEL] Invalid booking ID:', bookingId);
      return c.json({ 
        error: "Invalid booking ID" 
      }, 400);
    }

    console.log('[CANCEL] Cancelling booking:', {
      bookingId,
      userId: user.id,
      userRole: user.role
    });

    // Step 1: Get the existing booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !existingBooking) {
      console.error('❌ [CANCEL] Booking not found:', fetchError);
      return c.json({ 
        error: "Booking not found" 
      }, 404);
    }

    // Step 2: Verify permission (customer can only cancel their own, barber can cancel theirs)
    if (user.role === 'customer' && existingBooking.customer_id !== user.id) {
      console.error('❌ [CANCEL] Customer does not own this booking');
      return c.json({ 
        error: "You don't have permission to cancel this booking" 
      }, 403);
    }

    if (user.role === 'barber' && existingBooking.barber_id !== user.id) {
      console.error('❌ [CANCEL] Barber does not own this booking');
      return c.json({ 
        error: "You don't have permission to cancel this booking" 
      }, 403);
    }

    const slotId = existingBooking.slot_id;

    console.log('[CANCEL] Found booking, slot ID:', slotId);

    // Step 3: Free up ALL overlapping slots (keep fixed 30-minute grid)
    console.log('[CANCEL] Freeing slots in range:', {
      barber_id: existingBooking.barber_id,
      date: existingBooking.date,
      start_time_gte: existingBooking.start_time,
      start_time_lt: existingBooking.end_time
    });

    // SINGLE SOURCE OF TRUTH: Set is_booked = false AND status = 'available' to free slots
    const { data: freedSlots, error: freeSlotError } = await supabase
      .from('barber_slots')
      .update({
        is_booked: false,
        status: 'available',  // CRITICAL: Also update status field for consistency
        booked_by_customer_id: null,
        booked_at: null
      })
      .eq('barber_id', existingBooking.barber_id)
      .eq('slot_date', existingBooking.date)
      .gte('start_time', existingBooking.start_time)
      .lt('start_time', existingBooking.end_time)
      .select();

    if (freeSlotError) {
      console.error('⚠️ [CANCEL] Failed to free slots:', freeSlotError);
      // Continue anyway - slot freeing is not critical
    } else {
      console.log('✅ [CANCEL] Freed', freedSlots?.length || 0, 'slots:', 
        freedSlots?.map(s => s.start_time.substring(0, 5)).join(', '));
    }

    // Step 4: DELETE the booking from database (don't just mark as cancelled)
    // This prevents duplicate errors when rebooking the same slot
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (deleteError) {
      console.error('❌ [CANCEL] Failed to delete booking:', deleteError);
      
      // Rollback: Re-book the slots if booking deletion failed
      await supabase
        .from('barber_slots')
        .update({
          is_booked: true,
          booked_by_customer_id: existingBooking.customer_id,
          booked_at: existingBooking.created_at
        })
        .eq('barber_id', existingBooking.barber_id)
        .eq('slot_date', existingBooking.date)
        .gte('start_time', existingBooking.start_time)
        .lt('start_time', existingBooking.end_time);
      
      return c.json({ 
        error: "Failed to cancel booking", 
        details: deleteError.message 
      }, 500);
    }

    console.log('✅ [CANCEL] Booking deleted successfully:', bookingId);

    // NO SLOT RE-SHIFT - Keep the fixed 30-minute grid
    // Slots remain at their original positions, the freed slot is now available again
    console.log('[CANCEL] ✅ Slot freed, keeping fixed 30-minute grid - no reshift needed');

    return c.json({ 
      success: true,
      message: 'Booking cancelled and deleted successfully'
    });
  } catch (e: any) {
    console.error('❌ [CANCEL] Exception:', e);
    return c.json({ error: "Failed to cancel booking", details: e.message }, 500);
  }
});

// ============================================
// FAVORITES ROUTES
// ============================================

// Get all favorites for current user
app.get("/make-server-166b98fa/favorites", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  if (user.role !== 'customer') {
    return c.json({ error: "Only customers can have favorites" }, 403);
  }

  try {
    console.log('[FAVORITES GET] Fetching favorites for customer:', user.id);
    
    const { data, error } = await supabase
      .from('favorites')
      .select('barber_id')
      .eq('customer_id', user.id);
    
    if (error) {
      console.error('[FAVORITES GET] Error:', error);
      return c.json({ error: "Failed to fetch favorites", details: error.message }, 500);
    }
    
    const favoriteIds = data?.map((f: any) => f.barber_id) || [];
    console.log('[FAVORITES GET] ✅ Found favorites:', favoriteIds.length);
    
    return c.json({ favoriteIds });
  } catch (e: any) {
    console.error('[FAVORITES GET] Exception:', e);
    return c.json({ error: "Failed to fetch favorites", details: e.message }, 500);
  }
});

// Add barber to favorites
app.post("/make-server-166b98fa/favorites", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  if (user.role !== 'customer') {
    return c.json({ error: "Only customers can add favorites" }, 403);
  }

  try {
    const { barber_id } = await c.req.json();
    
    if (!barber_id) {
      return c.json({ error: "barber_id is required" }, 400);
    }
    
    console.log('[FAVORITES POST] Adding favorite:', {
      customer_id: user.id,
      barber_id
    });
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('customer_id', user.id)
      .eq('barber_id', barber_id)
      .single();
    
    if (existing) {
      console.log('[FAVORITES POST] Already exists, skipping');
      return c.json({ success: true, message: 'Already in favorites' });
    }
    
    // Insert new favorite
    const { error } = await supabase
      .from('favorites')
      .insert({
        customer_id: user.id,
        barber_id: barber_id
      });
    
    if (error) {
      console.error('[FAVORITES POST] Error:', error);
      return c.json({ error: "Failed to add favorite", details: error.message }, 500);
    }
    
    console.log('[FAVORITES POST] ✅ Added successfully');
    return c.json({ success: true });
  } catch (e: any) {
    console.error('[FAVORITES POST] Exception:', e);
    return c.json({ error: "Failed to add favorite", details: e.message }, 500);
  }
});

// Remove barber from favorites
app.delete("/make-server-166b98fa/favorites/:barberId", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  if (user.role !== 'customer') {
    return c.json({ error: "Only customers can remove favorites" }, 403);
  }

  try {
    const barberId = c.req.param('barberId');
    
    if (!barberId) {
      return c.json({ error: "barberId is required" }, 400);
    }
    
    console.log('[FAVORITES DELETE] Removing favorite:', {
      customer_id: user.id,
      barber_id: barberId
    });
    
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('customer_id', user.id)
      .eq('barber_id', barberId);
    
    if (error) {
      console.error('[FAVORITES DELETE] Error:', error);
      return c.json({ error: "Failed to remove favorite", details: error.message }, 500);
    }
    
    console.log('[FAVORITES DELETE] ✅ Removed successfully');
    return c.json({ success: true });
  } catch (e: any) {
    console.error('[FAVORITES DELETE] Exception:', e);
    return c.json({ error: "Failed to remove favorite", details: e.message }, 500);
  }
});

// ADMIN: Sync is_booked and status columns (bidirectional sync)
app.post("/make-server-166b98fa/admin/sync-slot-status", async (c) => {
  try {
    console.log('[ADMIN SYNC] Starting bidirectional sync of is_booked and status...');
    
    // Get ALL slots from barber_slots table
    const { data: allSlots, error: fetchError } = await supabase
      .from('barber_slots')
      .select('id, status, is_booked');
    
    if (fetchError) {
      console.error('❌ [ADMIN SYNC] Failed to fetch slots:', fetchError);
      return c.json({ error: 'Failed to fetch slots', details: fetchError.message }, 500);
    }
    
    console.log(`[ADMIN SYNC] Found ${allSlots?.length || 0} total slots in database`);
    
    if (!allSlots || allSlots.length === 0) {
      return c.json({ message: 'No slots found to sync' });
    }
    
    // Count how many need updating
    const needsUpdate = allSlots.filter(slot => {
      const statusIsBooked = slot.status === 'booked';
      const isBookedFlag = slot.is_booked === true;
      return statusIsBooked !== isBookedFlag; // Out of sync
    });
    
    console.log(`[ADMIN SYNC] ${needsUpdate.length} slots need updating`);
    
    if (needsUpdate.length === 0) {
      return c.json({ message: 'All slots are already in sync', total: allSlots.length });
    }
    
    // Strategy: Use is_booked as the source of truth, update status to match
    // This ensures the boolean field (is_booked) is the primary indicator
    
    // Update all rows: Set status = 'booked' where is_booked = true
    const { data: bookedUpdates, error: bookedError } = await supabase
      .from('barber_slots')
      .update({ status: 'booked' })
      .eq('is_booked', true)
      .neq('status', 'booked')  // Only update if not already synced
      .select();
    
    if (bookedError) {
      console.error('❌ [ADMIN SYNC] Failed to update booked slots:', bookedError);
    } else {
      console.log(`✅ [ADMIN SYNC] Updated ${bookedUpdates?.length || 0} slots to status='booked'`);
    }
    
    // Update all rows: Set status = 'available' where is_booked = false
    const { data: availableUpdates, error: availableError } = await supabase
      .from('barber_slots')
      .update({ status: 'available' })
      .eq('is_booked', false)
      .neq('status', 'available')  // Only update if not already synced
      .select();
    
    if (availableError) {
      console.error('❌ [ADMIN SYNC] Failed to update available slots:', availableError);
    } else {
      console.log(`✅ [ADMIN SYNC] Updated ${availableUpdates?.length || 0} slots to status='available'`);
    }
    
    const totalUpdated = (bookedUpdates?.length || 0) + (availableUpdates?.length || 0);
    
    return c.json({
      message: 'Sync completed successfully (is_booked → status)',
      total_slots: allSlots.length,
      out_of_sync: needsUpdate.length,
      updated: totalUpdated,
      booked_slots_updated: bookedUpdates?.length || 0,
      available_slots_updated: availableUpdates?.length || 0
    });
    
  } catch (e: any) {
    console.error('❌ [ADMIN SYNC] Exception:', e);
    return c.json({ error: 'Failed to sync slots', details: e.message }, 500);
  }
});

// ============================================
// USERNAME ENDPOINTS
// ============================================

// Check if username is available
app.get("/make-server-166b98fa/barber/username/check/:username", async (c) => {
  try {
    const username = c.req.param('username');
    
    if (!username || username.length < 3) {
      return c.json({ available: false, error: 'Username must be at least 3 characters' }, 400);
    }
    
    // Validate username format (lowercase alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(username)) {
      return c.json({ available: false, error: 'Username can only contain lowercase letters, numbers, and hyphens' }, 400);
    }
    
    const available = await usernameService.isUsernameAvailable(username);
    return c.json({ available, username });
  } catch (e: any) {
    console.error('[USERNAME CHECK] Error:', e);
    return c.json({ error: 'Failed to check username availability', details: e.message }, 500);
  }
});

// Update barber's username
app.post("/make-server-166b98fa/barber/username/update", async (c) => {
  try {
    const user = await getUser(c);
    
    if (!user || user.role !== 'barber') {
      return c.json({ error: 'Unauthorized - barbers only' }, 401);
    }
    
    const { username } = await c.req.json();
    
    if (!username || username.length < 3) {
      return c.json({ error: 'Username must be at least 3 characters' }, 400);
    }
    
    // Validate username format
    if (!/^[a-z0-9-]+$/.test(username)) {
      return c.json({ error: 'Username can only contain lowercase letters, numbers, and hyphens' }, 400);
    }
    
    const result = await usernameService.setBarberUsername(user.id, username);
    
    if (!result.success) {
      return c.json({ error: result.error || 'Failed to update username' }, 400);
    }
    
    console.log(`[USERNAME UPDATE] ✅ Barber ${user.id} username set to: ${username}`);
    return c.json({ success: true, username });
  } catch (e: any) {
    console.error('[USERNAME UPDATE] Error:', e);
    return c.json({ error: 'Failed to update username', details: e.message }, 500);
  }
});

// Get barber profile by username (public endpoint)
app.get("/make-server-166b98fa/b/:username", async (c) => {
  try {
    const username = c.req.param('username');
    
    if (!username) {
      return c.json({ error: 'Username is required' }, 400);
    }
    
    const barber = await usernameService.getBarberByUsername(username);
    
    if (!barber) {
      return c.json({ error: 'Barber not found' }, 404);
    }
    
    console.log(`[PUBLIC PROFILE] ✅ Retrieved barber profile for username: ${username}`);
    return c.json({ barber });
  } catch (e: any) {
    console.error('[PUBLIC PROFILE] Error:', e);
    return c.json({ error: 'Failed to retrieve barber profile', details: e.message }, 500);
  }
});

// Delete Barber Account
app.delete("/make-server-166b98fa/delete-barber/:barberId", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const barberId = c.req.param('barberId');

    // Verify permission: User must be the barber being deleted
    if (user.id !== barberId) {
      return c.json({ error: "Unauthorized - You can only delete your own account" }, 403);
    }

    console.log('[DELETE ACCOUNT] 🗑️ Starting account deletion for:', barberId);

    // 1. Delete from KV Store (Auth & Profile)
    // We need to know the phone number to delete auth:user:{phone}
    // We can get it from the user object or fetch the barber first
    const phone = user.phone;
    if (phone) {
      console.log('[DELETE ACCOUNT] Removing KV auth for phone:', phone);
      await kv.del(`auth:user:${phone}`);
    }
    await kv.del(`user:profile:${barberId}`);

    // 2. Delete from Supabase Storage (Images)
    // List files in avatars folder
    const { data: avatarFiles } = await supabase.storage
      .from('barber-images')
      .list('avatars', { search: barberId });
    
    if (avatarFiles && avatarFiles.length > 0) {
      const filesToRemove = avatarFiles.map(f => `avatars/${f.name}`);
      console.log('[DELETE ACCOUNT] Removing avatar files:', filesToRemove);
      await supabase.storage.from('barber-images').remove(filesToRemove);
    }

    // List files in gallery folder
    // Note: This might not catch everything if folders are deep, but usually it's galleries/{barberId}/{uuid}
    // We need to list the folder contents
    const { data: galleryFiles } = await supabase.storage
      .from('barber-images')
      .list(`galleries/${barberId}`);
    
    if (galleryFiles && galleryFiles.length > 0) {
      const galleryFilesToRemove = galleryFiles.map(f => `galleries/${barberId}/${f.name}`);
      console.log('[DELETE ACCOUNT] Removing gallery files:', galleryFilesToRemove);
      await supabase.storage.from('barber-images').remove(galleryFilesToRemove);
    }

    // 3. Delete from Database tables
    // Note: Foreign key constraints might require specific order if cascade is not set
    // We'll try to delete related records first to be safe

    console.log('[DELETE ACCOUNT] Deleting related database records...');

    // Delete Favorites
    await supabase.from('favorites').delete().eq('barber_id', barberId);

    // Delete Slots
    await supabase.from('barber_slots').delete().eq('barber_id', barberId);

    // Delete Services
    await supabase.from('services').delete().eq('barber_id', barberId);

    // Delete Subscriptions
    await supabase.from('subscriptions').delete().eq('barber_id', barberId);

    // Delete Bookings (barber side)
    await supabase.from('bookings').delete().eq('barber_id', barberId);

    // Finally, delete Barber profile
    const { error: deleteError } = await supabase
      .from('barbers')
      .delete()
      .eq('id', barberId);

    if (deleteError) {
      console.error('[DELETE ACCOUNT] ❌ Error deleting barber record:', deleteError);
      return c.json({ error: "Failed to delete barber account", details: deleteError.message }, 500);
    }

    console.log('[DELETE ACCOUNT] ✅ Account successfully deleted');
    return c.json({ success: true });

  } catch (e: any) {
    console.error('[DELETE ACCOUNT] Exception:', e);
    return c.json({ error: "Failed to delete account", details: e.message }, 500);
  }
});

// KV Store - GET value by key
app.get("/make-server-166b98fa/kv/:key", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const key = c.req.param('key');
    console.log('[KV GET] Fetching key:', key);

    const value = await kv.get(key);
    
    if (value === null) {
      console.log('[KV GET] Key not found:', key);
      return c.json({ value: null }, 404);
    }

    console.log('[KV GET] ✅ Retrieved value for key:', key);
    return c.json({ value });
  } catch (e: any) {
    console.error('[KV GET] Exception:', e);
    return c.json({ error: "Failed to get value", details: e.message }, 500);
  }
});

// KV Store - SET/UPDATE value by key
app.put("/make-server-166b98fa/kv/:key", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const key = c.req.param('key');
    const { value } = await c.req.json();
    
    console.log('[KV PUT] Setting key:', key);

    await kv.set(key, value);
    
    console.log('[KV PUT] ✅ Value set for key:', key);
    return c.json({ success: true });
  } catch (e: any) {
    console.error('[KV PUT] Exception:', e);
    return c.json({ error: "Failed to set value", details: e.message }, 500);
  }
});

Deno.serve(app.fetch);