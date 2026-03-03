import { useState, useEffect, useMemo } from 'react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { LoginPage } from './components/LoginPage';
import { OTPVerificationPage } from './components/OTPVerificationPage';
import { SignUpPage } from './components/SignUpPage';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CustomerDashboard } from './components/CustomerDashboard';
import { BarberDashboard } from './components/BarberDashboard';
import { AuthSetupRequired } from './components/AuthSetupRequired';
import { SupabaseDebugBanner } from './components/SupabaseDebugBanner';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import type { User, Booking, ManualBooking, Barber, Stats, Service } from './types';
import { generateBookingId } from './utils/generateBookingId';
import { supabase } from './utils/supabase/client';
import { projectId, publicAnonKey } from './utils/supabase/info.tsx';
import AdminSync from './AdminSync';
import { motion, AnimatePresence } from 'motion/react';

// Helper function to check if a barber's subscription is active and valid
function isBarberSubscriptionActive(barber: {
  subscription_status?: string | null;
  subscription_expiry_date?: string | null;
  trial_used?: boolean | null;
}): boolean {
  const { subscription_status, subscription_expiry_date, trial_used } = barber;

  const now = new Date();
  const expiry = subscription_expiry_date ? new Date(subscription_expiry_date) : null;

  const statusIsActive =
    subscription_status === "active" ||
    subscription_status === "free_trial";

  const notExpired = !expiry || expiry > now;

  const trialOk =
    subscription_status !== "free_trial" ||
    trial_used === false ||
    trial_used === null ||
    typeof trial_used === "undefined";

  return statusIsActive && notExpired && trialOk;
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Store barber order in memory for the current page load session
// This resets on page refresh but persists during re-renders and refetches
let cachedBarberOrder: string[] | null = null;

// Apply consistent order that persists during page session but resets on refresh
function applyPageLoadOrder<T extends { id: string }>(array: T[]): T[] {
  // If we already have a cached order for this page load, apply it
  if (cachedBarberOrder) {
    try {
      // Create a map for quick lookup
      const barberMap = new Map(array.map(b => [b.id, b]));
      
      // Apply the cached order, then append any new barbers not in the cached order
      const orderedBarbers: T[] = [];
      const usedIds = new Set<string>();
      
      // First, add barbers in the cached order
      for (const id of cachedBarberOrder) {
        const barber = barberMap.get(id);
        if (barber) {
          orderedBarbers.push(barber);
          usedIds.add(id);
        }
      }
      
      // Then add any new barbers that weren't in the cached order
      for (const barber of array) {
        if (!usedIds.has(barber.id)) {
          orderedBarbers.push(barber);
        }
      }
      
      return orderedBarbers;
    } catch (e) {
      console.error('[ORDER] Failed to apply cached order, creating new shuffle');
    }
  }
  
  // No cached order exists - shuffle and cache the new order
  const shuffled = shuffleArray(array);
  cachedBarberOrder = shuffled.map(b => b.id);
  console.log('[ORDER] New page load order created and cached');
  
  return shuffled;
}

function AppContent() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'otp'>('login');
  const [otpPhone, setOtpPhone] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [showAuthSetup, setShowAuthSetup] = useState(false);
  
  const [allBookings, setAllBookings] = useState<(Booking | ManualBooking)[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isBarbersLoading, setIsBarbersLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Swipe gesture state removed

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      const sessionToken = localStorage.getItem('trimly_session_token');
      
      if (!sessionToken) {
        console.log('[AUTH] No session token found, user not logged in');
        setIsLoading(false);
        return;
      }
      
      console.log('[AUTH] Found session token, restoring session...');
      
      try {
        // Verify session with backend
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/auth/verify`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-Session-Token': sessionToken,
            },
          }
        );
        
        if (!response.ok) {
          console.error('[AUTH] Session verification failed, clearing session');
          localStorage.removeItem('trimly_session_token');
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('[AUTH] Session restored successfully:', data.user?.role);
        
        // Restore user state
        const userProfile = data.profile || data.user;
        setCurrentUser({
          id: data.user.id,
          role: data.user.role,
          name: data.user.fullName || data.user.name || 'User',
          email: data.user.phone,
          phone: data.user.phone,
          avatar: userProfile?.avatar || '',
          bio: userProfile?.bio || '',
          ...userProfile
        });
        
      } catch (error) {
        console.error('[AUTH] Error restoring session:', error);
        localStorage.removeItem('trimly_session_token');
      } finally {
        setIsLoading(false);
      }
    };
    
    restoreSession();
  }, []);

  // Check for shared barber link on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedBarberId = urlParams.get('barber');
    
    if (sharedBarberId) {
      console.log('🔗 Shared barber link detected:', sharedBarberId);
      // Switch to search tab to show the barber
      setActiveTab('search');
    }
  }, []);

  // Derived state
  // IMPORTANT: Don't filter bookings by source/type - treat all bookings equally
  // Manual bookings created by barbers should appear in customers' "My Bookings"
  // and in the barber's schedule just like customer-created bookings
  const bookings = useMemo(() => 
    allBookings as Booking[], 
  [allBookings]);

  // Barbers fetcher - extracted so it can be called from profile update
  const refetchBarbers = async () => {
    try {
      console.log('🔄 [Supabase] Fetching barbers from barbers table...');
      
      // CRITICAL: Fetch barbers directly from barbers table
      const { data: barbers, error } = await supabase
        .from("barbers")
        .select("*");

      if (error) {
          console.error("[Supabase] Fetch barbers error:", error);
          console.error("[Supabase] Error details:", { message: error.message, details: error.details, hint: error.hint, code: error.code });
          setBarbers([]);
          return;
      }

      console.log('📊 [Supabase] Fetched barbers from table:', barbers?.length || 0);

      if (!barbers || barbers.length === 0) {
        console.log('⚠️ [Supabase] No barbers in barbers table');
        setBarbers([]);
        return;
      }

      // Fetch ALL services separately from services table
      const { data: allServices, error: servicesError } = await supabase
        .from("services")
        .select("*");

      if (servicesError) {
        console.error("[Supabase] Fetch services error:", servicesError);
        // Continue without services - barbers can still be shown
      }

      console.log('📊 [Supabase] Fetched services:', allServices?.length || 0);

      // Group services by barber_id
      const servicesByBarber = new Map();
      (allServices || []).forEach((service: any) => {
        if (!servicesByBarber.has(service.barber_id)) {
          servicesByBarber.set(service.barber_id, []);
        }
        servicesByBarber.get(service.barber_id).push(service);
      });

      const mappedBarbers = barbers
        .map((b: any) => {
          // CRITICAL: Check subscription status from barbers table
          // A barber is active if:
          // 1. subscription_status is 'active' OR 'free_trial'
          // 2. AND subscription_expiry_date is in the future (or null/missing which might imply unlimited)
          const now = new Date();
          const expiryDate = b.subscription_expiry_date ? new Date(b.subscription_expiry_date) : null;
          
          const isActiveStatus = b.subscription_status === 'active' || b.subscription_status === 'free_trial';
          const isFutureExpiry = expiryDate && expiryDate > now;
          
          // Permissive check: 
          // - If date is in future, they are active (regardless of status label, to be safe)
          // - OR if status is active/trial AND date is not strictly in past (null or future)
          const isSubscriptionActive = isFutureExpiry || (isActiveStatus && (!expiryDate || expiryDate > now));
          
          console.log(`${isSubscriptionActive ? '✅' : '❌'} Barber ${b.full_name || b.id}:`, {
            subscription_status: b.subscription_status,
            subscription_expiry_date: b.subscription_expiry_date,
            subscription_plan: b.subscription_plan,
            is_active: isSubscriptionActive,
            is_available: b.is_available
          });
          
          // CRITICAL: Only show barbers with active subscriptions
          if (!isSubscriptionActive) {
            console.log(`🚫 Hiding barber ${b.full_name || b.id} - subscription not active`);
            return null;
          }
          
          // CRITICAL: Hide barbers who marked themselves as unavailable (is_available === false)
          // Default to true if not set (for backward compatibility)
          if (b.is_available === false) {
            console.log(`🚫 Hiding barber ${b.full_name || b.id} - marked as unavailable by barber`);
            return null;
          }
          
          // Get services for this barber from the services table
          const services = servicesByBarber.get(b.id) || [];
          
          // Handle arrays (may be null from database)
          const languages = Array.isArray(b.languages) ? b.languages : [];
          const districts = Array.isArray(b.districts) ? b.districts : [];
          const gallery = Array.isArray(b.gallery) ? b.gallery : [];
          const specialties = Array.isArray(b.specialties) ? b.specialties : [];

          // Calculate price range from services
          let minPrice = 0;
          let maxPrice = 0;
          
          if (services.length > 0) {
            const prices = services.map((s: any) => s.price || 0).filter(p => p > 0);
            if (prices.length > 0) {
              minPrice = Math.min(...prices);
              maxPrice = Math.max(...prices);
            }
          }

          console.log(`💰 Barber ${b.full_name || b.id}:`, {
            services_count: services.length,
            price_range: { min: minPrice, max: maxPrice }
          });

          return {
            id: b.id,
            name: b.full_name || b.name || 'Barber',
            username: b.username || '',
            avatar: b.avatar || '',
            bio: b.bio || '',
            description: b.description || '',
            barbershopName: b.barbershop_name || '',
            rating: b.rating || 5.0,
            reviewCount: b.review_count || 0,
            distance: b.distance || 1.0,
            priceRange: { min: minPrice, max: maxPrice },
            services: services,
            gallery: gallery,
            languages: languages,
            districts: districts,
            specialties: specialties,
            servicesForKids: b.services_for_kids ?? false,
            // CRITICAL: Use barbers table columns for subscription data
            subscriptionStatus: b.subscription_status || 'inactive',
            subscriptionExpiryDate: b.subscription_expiry_date,
            currentPlan: b.subscription_plan,
            trialUsed: b.trial_used,
            isSubscriptionActive: isSubscriptionActive,
            is_available: b.is_available !== false, // Default to true if not set
            phone: b.phone,
            address: b.location || b.address || '',
            workplaceAddress: b.location || b.address || '',
            workingDistrict: b.working_district || '',
            googleMapsUrl: b.google_maps_url || '',
            workplaceCoordinates: (() => {
              try {
                if (b.google_maps_url) {
                  const parsed = JSON.parse(b.google_maps_url);
                  if (parsed?.lat && parsed?.lng) return { lat: parsed.lat, lng: parsed.lng };
                }
              } catch { /* Not JSON coords, ignore */ }
              return undefined;
            })(),
            working_hours: b.working_hours || {}
          };
        })
        .filter((b: any) => b !== null);
      
      console.log('✅ [Supabase] Visible barbers with active subscriptions:', mappedBarbers.length);
      setBarbers(applyPageLoadOrder(mappedBarbers));
    } catch (e: any) {
      console.error("[Supabase] Fetch barbers exception:", e);
      console.error("[Supabase] Exception details:", { message: e?.message, stack: e?.stack });
      // Don't show toast to avoid spamming
      setBarbers([]);
    } finally {
      setIsBarbersLoading(false);
    }
  };

  // Auth Listener - Check for stored session token
  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      try {
        // Use Supabase built-in session management
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[AUTH] Session check:', { 
            hasSession: !!session, 
            userId: session?.user?.id,
            error 
          });
        }

        if (error) {
          console.error('[AUTH] Session error:', error);
          if (mounted) setCurrentUser(null);
          return;
        }

        if (session?.user) {
          // Fetch profile based on user metadata role
          const userRole = session.user.user_metadata?.role || 'customer';
          await fetchProfile(session.user.id, userRole);
        } else {
          if (mounted) setCurrentUser(null);
        }
      } catch (error) {
        console.error('[AUTH] Check user error:', error);
        if (mounted) setCurrentUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    
    checkUser();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[AUTH] State change:', event, session?.user?.id);
      }

      if (event === 'SIGNED_IN' && session?.user) {
        const userRole = session.user.user_metadata?.role || 'customer';
        await fetchProfile(session.user.id, userRole);
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setCurrentUser(null);
          setAllBookings([]);
          setFavoriteIds([]);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[AUTH] Token refreshed');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async (userId: string, role: string) => {
    try {
      console.log(`[FETCH PROFILE] Fetching profile for ${role}:`, userId);
      
      if (role === 'customer') {
        // Fetch customer from public.customers table
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', userId)
          .single();

        if (customerError || !customerData) {
          console.error("[FETCH PROFILE] Customer not found:", customerError);
          return false;
        }

        console.log('[FETCH PROFILE] ✅ Customer loaded from database');

        setCurrentUser({
          id: customerData.id,
          role: 'customer',
          name: customerData.full_name,
          email: customerData.phone,
          phone: customerData.phone,
          avatar: '',
          bio: ''
        });

        setActiveTab('search');
        return true;
      }

      if (role === 'barber') {
        // CRITICAL: Fetch barber profile data from barbers table
        const { data: barberData, error: barberError } = await supabase
          .from('barbers')
          .select('*')
          .eq('id', userId)
          .single();

        if (barberError || !barberData) {
          console.error("[FETCH PROFILE] Barber not found:", barberError);
          return false;
        }
        
        // CRITICAL: Fetch subscription data from v_barber_subscription view
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('v_barber_subscription')
          .select('*')
          .eq('barber_id', userId)
          .maybeSingle();

        // NEW: Fetch detailed subscription history from subscriptions table (to match SubscriptionManagement logic)
        const { data: subscriptionHistory, error: historyError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('barber_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (subscriptionError) {
          console.warn("[FETCH PROFILE] Could not fetch subscription from v_barber_subscription view:", subscriptionError);
        }
        
        console.log('[FETCH PROFILE] ✅ Barber loaded from database');
        
        if (!subscriptionData) {
          console.warn('[FETCH PROFILE] ⚠️ No subscription record found in v_barber_subscription view for barber:', userId);
        }
        
        console.log('[FETCH PROFILE] 📋 Subscription from v_barber_subscription view:', {
          subscriptionData,
          plan: subscriptionData?.plan,
          status: subscriptionData?.status,
          starts_at: subscriptionData?.starts_at,
          ends_at: subscriptionData?.ends_at,
          is_subscription_active: subscriptionData?.is_subscription_active
        });

        // ADD DEV LOG: Show all database fields for debugging
        console.log('[FETCH PROFILE] 📋 Database barber RAW DATA:', barberData);
        console.log('[FETCH PROFILE] 📋 Database barber fields:', {
          id: barberData.id,
          full_name: barberData.full_name,
          phone: barberData.phone,
          bio: barberData.bio,
          working_district: barberData.working_district,
          districts: barberData.districts,
          languages: barberData.languages,
          location: barberData.location,
          address: barberData.address,
          google_maps_url: barberData.google_maps_url,
          avatar: barberData.avatar,
          gallery: barberData.gallery?.length || 0,
          subscription_status: barberData.subscription_status
        });

        // Fetch services separately from services table
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('barber_id', userId)
          .order('created_at', { ascending: true });

        if (servicesError) {
          console.error("[FETCH PROFILE] Services fetch error:", servicesError);
        }

        const services = servicesData || [];
        
        console.log('[FETCH PROFILE] 📋 Services from database:', {
          count: services.length,
          services: services
        });
        
        // Ensure arrays are properly formatted (not null)
        const districts = Array.isArray(barberData.districts) ? barberData.districts : [];
        const languages = Array.isArray(barberData.languages) ? barberData.languages : [];
        const specialties = Array.isArray(barberData.specialties) ? barberData.specialties : [];
        const gallery = Array.isArray(barberData.gallery) ? barberData.gallery : [];
        
        // Convert gallery to interiorExteriorPhotos format for UI
        const interiorExteriorPhotos = (Array.isArray(barberData.gallery) ? barberData.gallery : []).map((url: string, idx: number) => ({
          id: `img-${Date.now()}-${idx}`,
          url,
          orderIndex: idx
        }));
        
        // Calculate price range from services
        let minPrice = 0;
        let maxPrice = 0;
        
        if (services.length > 0) {
          const prices = services.map((s: any) => s.price || 0).filter(p => p > 0);
          if (prices.length > 0) {
            minPrice = Math.min(...prices);
            maxPrice = Math.max(...prices);
          }
        }

        console.log('[FETCH PROFILE] 💰 Price range calculated:', { min: minPrice, max: maxPrice });

        // CRITICAL: Calculate isSubscriptionActive from barbers table as PRIMARY source of truth
        // User explicitly requested to use the 'subscription_expiry_date' column from 'barbers' table
        // Priority: Barbers Table > Subscriptions Table > View
        
        const now = new Date();
        const expiryDate = barberData.subscription_expiry_date ? new Date(barberData.subscription_expiry_date) : null;
        const status = barberData.subscription_status;
        
        const isActiveStatus = status === 'active' || status === 'free_trial';
        const isFutureExpiry = expiryDate && expiryDate > now;
        
        // Default to what the table says (Table First Strategy)
        let isSubscriptionActive = false;
        
        if (isFutureExpiry) {
           isSubscriptionActive = true;
           console.log('[FETCH PROFILE] ✅ Active based on barberData (future expiry)');
        } else if (isActiveStatus && (!expiryDate || isFutureExpiry)) {
           isSubscriptionActive = true;
           console.log('[FETCH PROFILE] ✅ Active based on barberData (status active, no past expiry)');
        } else if (subscriptionHistory) {
           // Fallback 1: Check subscriptions table (history) - Matches SubscriptionManagement logic
           const historyExpiry = subscriptionHistory.expires_at ? new Date(subscriptionHistory.expires_at) : null;
           const historyStatus = subscriptionHistory.status;
           const isHistoryActive = historyStatus === 'active' || historyStatus === 'free_trial';
           const isHistoryFuture = historyExpiry && historyExpiry > now;
           
           if (isHistoryFuture) {
             isSubscriptionActive = true;
             console.log('[FETCH PROFILE] ✅ Active based on subscriptions table history');
           } else if (isHistoryActive && (!historyExpiry || isHistoryFuture)) {
             isSubscriptionActive = true;
             console.log('[FETCH PROFILE] ✅ Active based on subscriptions table status');
           }
        }
        
        if (!isSubscriptionActive && subscriptionData) {
           // Fallback 2: Check view only if table and history say expired
           if (typeof subscriptionData.is_subscription_active === 'boolean' && subscriptionData.is_subscription_active) {
             isSubscriptionActive = true;
             console.log('[FETCH PROFILE] ✅ Active based on view (fallback)');
           } else if (subscriptionData.ends_at) {
             const viewExpiry = new Date(subscriptionData.ends_at);
             if (viewExpiry > now) {
               isSubscriptionActive = true;
               console.log('[FETCH PROFILE] ✅ Active based on view expiry (fallback)');
             }
           }
        }
        
        console.log('[FETCH PROFILE] 🔍 Final subscription data:', {
          subscriptionDataExists: !!subscriptionData,
          is_subscription_active_field: subscriptionData?.is_subscription_active,
          ends_at: subscriptionData?.ends_at,
          status: subscriptionData?.status,
          plan: subscriptionData?.plan,
          finalIsActive: isSubscriptionActive,
          source: 'Barbers Table Priority -> History -> View'
        });

        // CRITICAL: Set currentUser with ALL fields from Supabase (single source of truth)
        const userFromDatabase = {
          id: barberData.id,
          role: 'barber' as const,
          name: barberData.full_name || barberData.name || '',
          email: barberData.phone || '',
          phone: barberData.phone || '',
          avatar: barberData.avatar || '',
          bio: barberData.bio || '',
          description: barberData.description || '',
          services,
          districts,
          languages,
          specialties,
          gallery,
          interiorExteriorPhotos,
          working_hours: barberData.working_hours || {},
          priceRange: { min: minPrice, max: maxPrice },
          // CRITICAL: Use subscription data from BARBERS TABLE first, then HISTORY, then VIEW
          subscriptionStatus: barberData.subscription_status || subscriptionHistory?.status || subscriptionData?.status || 'expired',
          subscriptionExpiryDate: barberData.subscription_expiry_date || subscriptionHistory?.expires_at || subscriptionData?.ends_at || null,
          currentPlan: barberData.subscription_plan || subscriptionHistory?.plan_type || subscriptionData?.plan || null,
          trialUsed: barberData.trial_used,
          isSubscriptionActive: isSubscriptionActive,
          is_available: barberData.is_available !== false, // Default to true if not set
          rating: barberData.rating || 5.0,
          reviewCount: barberData.review_count || 0,
          // CRITICAL: Add missing fields that were not being loaded
          address: barberData.address || barberData.location || '',
          workingDistrict: barberData.working_district || '',
          workplaceAddress: barberData.address || barberData.location || '',
          googleMapsUrl: barberData.google_maps_url || ''
        };
        
        console.log('[FETCH PROFILE] 🎯 Subscription data being set in currentUser:', {
          currentPlan: userFromDatabase.currentPlan,
          subscriptionStatus: userFromDatabase.subscriptionStatus,
          subscriptionExpiryDate: userFromDatabase.subscriptionExpiryDate,
          isSubscriptionActive: userFromDatabase.isSubscriptionActive,
          rawSubscriptionData: subscriptionData
        });
        
        console.log('[FETCH PROFILE] 🎯 Setting currentUser from Supabase with fields:', {
          name: userFromDatabase.name,
          phone: userFromDatabase.phone,
          bio: userFromDatabase.bio,
          districts: userFromDatabase.districts,
          languages: userFromDatabase.languages,
          workplaceAddress: userFromDatabase.workplaceAddress,
          googleMapsUrl: userFromDatabase.googleMapsUrl,
          servicesCount: userFromDatabase.services.length
        });

        setCurrentUser(userFromDatabase);

        console.log('[FETCH PROFILE] ✅ currentUser updated with services:', services.length);

        setActiveTab('home');
        return true;
      }

      return false;
    } catch (e) {
      console.error("[FETCH PROFILE] Exception:", e);
      return false;
    }
  };

  // Fetch Barbers (Public) - initial fetch and periodic refresh
  useEffect(() => {    
    refetchBarbers();
    // Poll every 10 seconds to quickly reflect availability changes (can adjust to 30-60s in production)
    const interval = setInterval(refetchBarbers, 10000); 
    return () => clearInterval(interval);
  }, []);

  // Real-time subscription for barber availability changes
  useEffect(() => {
    console.log('🔴 [Realtime] Setting up barber availability subscription...');
    
    const channel = supabase
      .channel('barber-availability-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barbers'
        },
        (payload) => {
          console.log('🔴 [Realtime] Barber table updated:', payload);
          // Check if is_available field changed
          if (payload.new && 'is_available' in payload.new) {
            console.log('🔄 [Realtime] Availability changed, refetching barbers...');
            refetchBarbers();
          }
        }
      )
      .subscribe((status) => {
        console.log('🔴 [Realtime] Subscription status:', status);
      });

    return () => {
      console.log('🔴 [Realtime] Cleaning up barber availability subscription...');
      supabase.removeChannel(channel);
    };
  }, []);

  // CRITICAL: Refetch barbers when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 [Page Focus] Page became visible, refetching barbers...');
        refetchBarbers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch Bookings & Favorites (Protected)
  useEffect(() => {
    if (!currentUser) {
      setAllBookings([]);
      setFavoriteIds([]);
      return;
    }

    const fetchData = async () => {
      // CRITICAL: Check for pending booking after authentication (signup flow)
      const pendingBookingStr = localStorage.getItem('pendingBooking');
      if (pendingBookingStr && currentUser.role === 'customer') {
        console.log('[AUTH] Found pending booking after authentication, processing...');
        try {
          const pendingBooking = JSON.parse(pendingBookingStr);
          
          // Ensure customer row exists
          const sessionToken = localStorage.getItem('trimly_session_token');
          const customerResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/customers/ensure`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
                'X-Session-Token': sessionToken!,
              },
              body: JSON.stringify({
                auth_user_id: currentUser.id,
                full_name: currentUser.name || 'Customer',
                phone: currentUser.phone,
              }),
            }
          );

          if (!customerResponse.ok) {
            throw new Error('Failed to ensure customer exists');
          }

          const { customer } = await customerResponse.json();
          console.log('[AUTH] Customer ensured:', customer.id);

          // Create the booking
          const bookingData = {
            barberId: pendingBooking.barberId,
            customerId: customer.id,
            customerName: customer.full_name,
            serviceType: pendingBooking.serviceType,
            date: pendingBooking.booking_date,
            startTime: pendingBooking.start_time,
            endTime: pendingBooking.end_time,
            duration: pendingBooking.total_duration,
            price: pendingBooking.total_price,
            slotId: pendingBooking.slotId,
            serviceId: pendingBooking.serviceId,
            source: pendingBooking.source,
            barberName: pendingBooking.barberName,
            barberAvatar: pendingBooking.barberAvatar,
          };

          await handleAddBooking(bookingData);

          // Clear pending booking
          localStorage.removeItem('pendingBooking');
          localStorage.removeItem('postLoginRedirect');

          toast.success(t('booking.bookingSuccess') || 'Booking confirmed!');
          setActiveTab('bookings');
          
          // Early return - bookings will be fetched in the next render
          return;
        } catch (error) {
          console.error('[AUTH] Failed to process pending booking:', error);
          toast.error('Failed to complete booking. Please try again.');
        }
      }
      
      // Fetch Bookings from backend API with proper joins
      try {
        const sessionToken = localStorage.getItem('trimly_session_token');
        
        if (!sessionToken) {
          console.error('No session token found');
          setAllBookings([]);
          return;
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/bookings`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-Session-Token': sessionToken,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Fetch bookings error:', errorData);
          setAllBookings([]);
          return;
        }

        const result = await response.json();
        console.log('✅ Bookings fetched successfully:', result.bookings?.length || 0);
        setAllBookings(result.bookings || []);
      } catch (e) {
        console.error("Fetch bookings error", e);
        setAllBookings([]);
      }

      // Fetch Favorites from backend API (bypasses RLS using service role key)
      if (currentUser.role === 'customer') {
        try {
          const sessionToken = localStorage.getItem('trimly_session_token');
          
          if (!sessionToken) {
            console.error('No session token found for favorites fetch');
            setFavoriteIds([]);
            return;
          }

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/favorites`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
                'X-Session-Token': sessionToken,
              },
            }
          );

          if (response.ok) {
            const { favoriteIds } = await response.json();
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Favorites fetched successfully:', favoriteIds?.length || 0);
            }
            setFavoriteIds(favoriteIds || []);
          } else {
            const errorData = await response.json();
            console.error('Fetch favorites error:', errorData);
            setFavoriteIds([]);
          }
        } catch (e) {
          console.error("Fetch favorites error", e);
          setFavoriteIds([]);
        }
      }
    };
    
    fetchData();
  }, [currentUser]);

  // Calculate Stats for Barber
  const barberStats: Stats = useMemo(() => {
    if (!currentUser || currentUser.role !== 'barber') {
      return { totalCustomersThisWeek: 0, todaysEarnings: 0 };
    }
    
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // CRITICAL: Only count bookings for THIS barber
    const todaysEarnings = allBookings
      .filter(b => b.date === today && b.status === 'confirmed' && b.barberId === currentUser.id)
      .reduce((sum, b) => sum + (b.price || 0), 0);

    // CRITICAL: Only count unique customers for THIS barber from the last week
    const uniqueCustomers = new Set(
      allBookings
        .filter(b => {
           const date = new Date(b.date);
           return date >= oneWeekAgo && b.status === 'confirmed' && b.barberId === currentUser.id;
        })
        .map(b => (b as Booking).customerId || (b as ManualBooking).customerName)
    ).size;

    return {
      totalCustomersThisWeek: uniqueCustomers,
      todaysEarnings
    };
  }, [allBookings, currentUser]);

  const today = new Date().toISOString().split('T')[0];
  const todaysBarberBookings = bookings.filter(b => b.date === today && b.barberId === currentUser?.id);

  // Helper function to translate error codes
  const translateError = (errorCode: string): string => {
    if (errorCode === 'INVALID_CREDENTIALS') {
      return t('auth.invalidCredentials');
    }
    return errorCode;
  };

  // Handlers
  const handleLogin = async (phone: string, password: string) => {
     try {
       // Call phone-only login API
       const response = await fetch(
         `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/auth/login`,
         {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${publicAnonKey}`,
           },
           body: JSON.stringify({ phone: phone.replace(/\s/g, ''), password }),
         }
       );

       const data = await response.json();

       if (!response.ok) {
         console.error("Login error:", data.error);
         toast.error(translateError(data.error) || t('auth.invalidCredentials'));
         return { success: false, error: data.error };
       }

       // Store session token
       localStorage.setItem('trimly_session_token', data.sessionToken);

       // Set user data
       const userProfile = data.profile || data.user;
       setCurrentUser({
         id: data.user.id,
         role: data.user.role,
         name: data.user.fullName || data.user.name || 'User',
         email: data.user.phone, // Use phone as email
         phone: data.user.phone,
         avatar: userProfile?.avatar || '',
         bio: userProfile?.bio || '',
         ...userProfile
       });

       // Log subscription data from backend
        console.log('[LOGIN] 📋 Subscription data:', { subscriptionStatus: userProfile?.subscriptionStatus, currentPlan: userProfile?.currentPlan, subscriptionExpiryDate: userProfile?.subscriptionExpiryDate, trialUsed: userProfile?.trialUsed });
        
       // Check for pending booking after login
       const pendingBookingStr = localStorage.getItem('pendingBooking');
       if (pendingBookingStr && data.user.role === 'customer') {
         console.log('[LOGIN] Found pending booking, processing...');
         try {
           const pendingBooking = JSON.parse(pendingBookingStr);
           
           // Ensure customer row exists
           const sessionToken = localStorage.getItem('trimly_session_token');
           const customerResponse = await fetch(
             `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/customers/ensure`,
             {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${publicAnonKey}`,
                 'X-Session-Token': sessionToken!,
               },
               body: JSON.stringify({
                 auth_user_id: data.user.id,
                 full_name: data.user.fullName || data.user.name || 'Customer',
                 phone: data.user.phone,
               }),
             }
           );

           if (!customerResponse.ok) {
             throw new Error('Failed to ensure customer exists');
           }

           const { customer } = await customerResponse.json();
           console.log('[LOGIN] Customer ensured:', customer.id);

           // Create the booking
           const bookingData = {
             barberId: pendingBooking.barberId,
             customerId: customer.id,
             customerName: customer.full_name,
             serviceType: pendingBooking.serviceType,
             date: pendingBooking.booking_date,
             startTime: pendingBooking.start_time,
             endTime: pendingBooking.end_time,
             duration: pendingBooking.total_duration,
             price: pendingBooking.total_price,
             slotId: pendingBooking.slotId,
             serviceId: pendingBooking.serviceId,
             source: pendingBooking.source,
             barberName: pendingBooking.barberName,
             barberAvatar: pendingBooking.barberAvatar,
           };

           await handleAddBooking(bookingData);

           // Clear pending booking
           localStorage.removeItem('pendingBooking');
           localStorage.removeItem('postLoginRedirect');

           toast.success(t('booking.bookingSuccess') || 'Booking confirmed!');
           setActiveTab('bookings');
         } catch (error) {
           console.error('[LOGIN] Failed to process pending booking:', error);
           toast.error('Failed to complete booking. Please try again.');
         }
       } else {
         toast.success(t('toast.welcomeBack'));
         setActiveTab(data.user.role === 'barber' ? 'home' : 'search');
       }
       
       return { success: true };
     } catch (error: any) {
       console.error("Login exception:", error);
       toast.error(t('auth.invalidCredentials'));
       return { success: false, error: error.message };
     }
  };

  const handleLogout = async () => {
    try {
      const sessionToken = localStorage.getItem('trimly_session_token');
      if (sessionToken) {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/auth/logout`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
            },
          }
        );
      }
      localStorage.removeItem('trimly_session_token');
    } catch (e) {
      console.error("Logout error:", e);
    }
    
    setCurrentUser(null);
    setActiveTab('search');
    toast.success(t('toast.loggedOut'));
  };

  const handleSignUp = (role: 'customer' | 'barber', userData: any) => {
    toast.success(t('toast.accountCreated'));
  };

  const handleCancelBooking = async (id: string) => {
    try {
      const sessionToken = localStorage.getItem('trimly_session_token');
      
      if (!sessionToken) {
        toast.error("Authentication required");
        return;
      }

      console.log('[CANCEL] Initiating cancel for booking:', id);

      // Call backend cancel endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/bookings/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': sessionToken,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cancel error:', errorData);
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      const result = await response.json();
      console.log('✅ Booking cancelled successfully:', result);

      // Remove cancelled booking from local state (it's deleted in database)
      setAllBookings(prev => prev.filter(b => b.id !== id));

      toast.success(t('toast.bookingCancelled'));
    } catch (e: any) {
      console.error('Cancel booking error:', e);
      toast.error(e.message || "Failed to cancel booking");
    }
  };

  const handleRescheduleBooking = async (bookingId: string, newBooking: any) => {
     try {
       const sessionToken = localStorage.getItem('trimly_session_token');
       
       if (!sessionToken) {
         toast.error("Authentication required");
         return;
       }

       console.log('[RESCHEDULE] Initiating reschedule:', {
         bookingId,
         newSlotId: newBooking.slotId,
         newDate: newBooking.date,
         newStartTime: newBooking.startTime,
         newEndTime: newBooking.endTime
       });

       // Call backend reschedule endpoint
       const response = await fetch(
         `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/bookings/${bookingId}/reschedule`,
         {
           method: 'PUT',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${publicAnonKey}`,
             'X-Session-Token': sessionToken,
           },
           body: JSON.stringify({
             new_slot_id: newBooking.slotId,
             new_date: newBooking.date,
             new_start_time: newBooking.startTime,
             new_end_time: newBooking.endTime,
           }),
         }
       );

       if (!response.ok) {
         const errorData = await response.json();
         console.error('Reschedule error:', errorData);
         throw new Error(errorData.error || 'Failed to reschedule booking');
       }

       const result = await response.json();
       console.log('✅ Booking rescheduled successfully:', result);

       // Update local state
       setAllBookings(prev => prev.map(b => 
         b.id === bookingId 
           ? { ...b, ...newBooking, status: 'confirmed' } 
           : b
       ));

       toast.success(t('toast.appointmentRescheduled'));
     } catch (e: any) {
       console.error('Reschedule booking error:', e);
       toast.error(e.message || "Failed to reschedule");
     }
  };

  const handleAddBooking = async (booking: any) => {
    if (!currentUser) {
        toast.error("Please login to book");
        return;
    }

    const bookingCode = generateBookingId();
    const newBooking = {
      ...booking,
      bookingCode,
      status: 'booked'
    };

    // Map to snake_case for API
    const bookingPayload: any = {
        booking_code: bookingCode,
        barber_id: booking.barberId,
        customer_id: booking.customerId,
        slot_id: booking.slotId, // UUID from barber_slots
        service_id: booking.serviceId, // UUID from services table
        service_type: booking.serviceType,
        date: booking.date,
        start_time: booking.startTime,
        end_time: booking.endTime,
        duration: booking.duration,
        price: booking.price,
        customer_phone: booking.customerPhone,
        source: booking.source || 'online',
        notes: booking.notes
    };

    // Add manual booking fields if source is 'manual'
    if (booking.source === 'manual') {
      bookingPayload.manual_customer_name = booking.manualCustomerName || booking.customerName;
      bookingPayload.manual_customer_phone = booking.manualCustomerPhone || booking.customerPhone;
      console.log('[BOOKING] Manual booking detected:', {
        manual_customer_name: bookingPayload.manual_customer_name,
        manual_customer_phone: bookingPayload.manual_customer_phone
      });
    }

    try {
      // Get session token
      const sessionToken = localStorage.getItem('trimly_session_token');
      
      if (!sessionToken) {
        toast.error("Session expired. Please login again.");
        return;
      }

      // Create booking via backend API (bypasses RLS)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/bookings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': sessionToken,
          },
          body: JSON.stringify(bookingPayload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('[BOOKING CREATE] API error:', data);
        throw new Error(data.error || 'Failed to create booking');
      }

      console.log('✅ Booking created via API (slots already marked as booked by backend)');

      // NOTE: Backend already marks all overlapping slots as booked
      // No need to update slots again from frontend

      // Update local state with booking data from API (includes database ID)
      const bookingFromAPI: any = {
        id: data.booking.id, // Database-generated ID
        bookingCode: data.booking.booking_code,
        barberId: data.booking.barber_id,
        customerId: data.booking.customer_id,
        slotId: data.booking.slot_id,
        serviceId: data.booking.service_id,
        serviceType: data.booking.service_type,
        date: data.booking.date,
        startTime: data.booking.start_time,
        endTime: data.booking.end_time,
        duration: data.booking.duration,
        price: data.booking.price,
        status: data.booking.status,
        customerPhone: data.booking.customer_phone,
        source: data.booking.source,
        notes: data.booking.notes,
        // Include joined barber and customer data
        barber: data.booking.barber ? {
          id: data.booking.barber.id,
          full_name: data.booking.barber.full_name,
          avatar: data.booking.barber.avatar,
          phone: data.booking.barber.phone,
          location: data.booking.barber.location
        } : null,
        customer: data.booking.customer ? {
          id: data.booking.customer.id,
          full_name: data.booking.customer.full_name,
          phone: data.booking.customer.phone
        } : null,
        // Deprecated fields for backward compatibility
        barberName: data.booking.barber?.full_name || 'Barber',
        barberAvatar: data.booking.barber?.avatar,
        customerName: data.booking.source === 'manual' 
          ? (data.booking.manual_customer_name || 'Walk-in Customer')
          : (data.booking.customer?.full_name || 'Customer'),
        // Manual booking fields
        manualCustomerName: data.booking.manual_customer_name,
        manualCustomerPhone: data.booking.manual_customer_phone
      };
      
      setAllBookings(prev => [...prev, bookingFromAPI]);
      toast.success(t('toast.bookingConfirmed'));
    } catch (e) {
      toast.error("Failed to create booking");
      console.error(e);
    }
  };

  const handleUpdateProfile = async (updatedProfile: any) => {
     if (!currentUser) return;

     try {
       console.log('📝 Updating profile...', { updatedProfile });

       // If barber updating services, use dedicated API
       if (currentUser.role === 'barber' && updatedProfile.services) {
         console.log('🔧 Saving services via API...');
         
         const sessionToken = localStorage.getItem('trimly_session_token');
         
         if (!sessionToken) {
           console.error('❌ No session token found in localStorage');
           console.error('❌ Available localStorage keys:', Object.keys(localStorage));
           toast.error('Session expired. Please login again.');
           return;
         }
         
         console.log('📋 Session token found:', {
           tokenPrefix: sessionToken.substring(0, 20) + '...',
           tokenLength: sessionToken.length,
           currentUserId: currentUser.id
         });
         
         // Validate all services before sending
         const invalidService = updatedProfile.services.find((s: Service) => 
           !s.name || !s.name.trim() || 
           typeof s.duration !== 'number' || s.duration <= 0 ||
           typeof s.price !== 'number' || s.price <= 0
         );
         
         if (invalidService) {
           console.error('❌ Invalid service data:', invalidService);
           toast.error(t('toast.serviceFieldsInvalid') || 'Please fill in all service fields correctly');
           return;
         }
         
         try {
           // Validate currentUser.id exists
           if (!currentUser?.id) {
             console.error('❌ currentUser.id is missing!', currentUser);
             toast.error('User session invalid. Please log in again.');
             return;
           }

           const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/barbers/${currentUser.id}/services`;
           
           console.log('📤 Sending services to API:', {
             url: apiUrl,
             servicesCount: updatedProfile.services.length,
             services: updatedProfile.services.map(s => ({ name: s.name, duration: s.duration, price: s.price })),
             hasToken: !!sessionToken,
             barberId: currentUser.id,
             barberIdType: typeof currentUser.id
           });
           
           const response = await fetch(apiUrl, {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${publicAnonKey}`,
               'X-Session-Token': sessionToken,
             },
             body: JSON.stringify({ services: updatedProfile.services }),
           });

           const data = await response.json();

           if (!response.ok) {
             console.error('[Supabase][Services] save error', {
               status: response.status,
               statusText: response.statusText,
               error: data.error,
               details: data.details,
               barberId: currentUser.id,
               responseData: data
             });
             
             // If authentication failed, clear session and ask user to re-login
             if (response.status === 401) {
               console.error('❌ Session expired or invalid. User needs to re-login.');
               localStorage.removeItem('trimly_session_token');
               setCurrentUser(null);
               toast.error('Your session has expired. Please log in again.');
               setAuthView('login');
               setActiveTab('profile');
               return;
             }
             
             toast.error(data.error || t('toast.servicesFailedSave') || 'Failed to save services. Please try again.');
             return; // Stop if services fail to save
           } else {
             console.log('✅ Services saved successfully:', data);
             // Removed - single comprehensive toast shown in BarberProfileEditor
              // toast.success(t('toast.servicesSaved') || 'Services saved successfully');
             
             // Update local state with the saved services from database
             if (data.services && Array.isArray(data.services)) {
               updatedProfile.services = data.services;
             }
           }
         } catch (serviceError) {
           console.error('[Supabase][Services] API error:', serviceError);
           toast.error(t('toast.servicesFailedSave') || 'Failed to save services. Please try again.');
           return; // Stop if services fail to save
         }
       }

       // If barber, update barber profile in Supabase barbers table
       if (currentUser.role === 'barber') {
           // Clean avatar: only include if it's a URL, not base64 data
           let avatarValue = updatedProfile.avatar || updatedProfile.profileImage;
           if (avatarValue && typeof avatarValue === 'string' && avatarValue.startsWith('data:')) {
               avatarValue = null; // Skip base64 for now
           }
           
           // Clean gallery: only include URLs, filter out base64 data
           let cleanGallery: string[] = [];
           
           if (Array.isArray(updatedProfile.gallery)) {
               cleanGallery = updatedProfile.gallery
                   .filter((item: any) => {
                       if (typeof item === 'string' && !item.startsWith('data:')) return true;
                       return false;
                   });
           } else if (Array.isArray(updatedProfile.interiorExteriorPhotos)) {
               cleanGallery = updatedProfile.interiorExteriorPhotos
                   .map((img: any) => {
                       if (typeof img === 'string' && !img.startsWith('data:')) return img;
                       if (img?.url && typeof img.url === 'string' && !img.url.startsWith('data:')) return img.url;
                       return null;
                   })
                   .filter((url: string | null) => url !== null);
           }
           
           // Calculate price range from services if available
           let priceRangeMin = updatedProfile.priceRange?.min || 0;
           let priceRangeMax = updatedProfile.priceRange?.max || 0;
           
           if (updatedProfile.services && Array.isArray(updatedProfile.services) && updatedProfile.services.length > 0) {
             const prices = updatedProfile.services.map((s: any) => s.price || 0).filter((p: number) => p > 0);
             if (prices.length > 0) {
               priceRangeMin = Math.min(...prices);
               priceRangeMax = Math.max(...prices);
             }
           }
           
           // Log before saving
           console.log("Saving barber profile via backend API...");
           
           // Save to Supabase via backend API (bypasses RLS)
           // IMPORTANT: Do NOT send subscription fields (subscription_status, current_plan,
           // subscription_expiry_date, trial_used) - backend will not modify them
           const sessionToken = localStorage.getItem('trimly_session_token');
           const response = await fetch(
             `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/barber-profile`,
             {
               method: 'PUT',
               headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${publicAnonKey}`,
                 'X-Session-Token': sessionToken || '',
               },
               body: JSON.stringify({
                 name: updatedProfile.name || updatedProfile.fullName,
                 fullName: updatedProfile.name || updatedProfile.fullName,
                 phone: updatedProfile.phone,
                 bio: updatedProfile.bio || '',
                 description: updatedProfile.description || '',
                 barbershopName: updatedProfile.barbershopName || '',
                 address: updatedProfile.location || updatedProfile.workplaceAddress || '',
                 location: updatedProfile.location || updatedProfile.workplaceAddress || '',
                 googleMapsUrl: updatedProfile.googleMapsUrl || '',
                 avatar: avatarValue || undefined,
                 languages: Array.isArray(updatedProfile.languages) ? updatedProfile.languages : [],
                 districts: Array.isArray(updatedProfile.districts) ? updatedProfile.districts : [],
                 specialties: Array.isArray(updatedProfile.specialties) ? updatedProfile.specialties : [],
                 servicesForKids: updatedProfile.servicesForKids,
                 gallery: cleanGallery,
                 priceRangeMin: priceRangeMin,
                 priceRangeMax: priceRangeMax,
                 // DO NOT SEND: subscription_status, current_plan, subscription_expiry_date, trial_used, created_at, visible, rating, reviewCount
               }),
             }
           );
           
           const responseData = await response.json();
             
           if (!response.ok) {
             console.error('❌ [BARBER PROFILE SAVE] Backend API error:', responseData);
             console.error('[BARBER PROFILE SAVE] Full Supabase error:', responseData.supabaseError);
             toast.error(t('toast.profileFailedSave') || 'Failed to save profile. Please try again.');
             return; // Stop here, don't update local state
           }

           console.log('✅ [BARBER PROFILE SAVE] Successfully saved to Supabase via backend');
           // Removed - single comprehensive toast shown in BarberProfileEditor
           
           // Reload services from database to update local state
           console.log('🔄 Reloading services from database...');
           const { data: servicesData, error: servicesError } = await supabase
             .from('services')
             .select('*')
             .eq('barber_id', currentUser.id)
             .order('created_at', { ascending: true });
           
           if (!servicesError && servicesData) {
             console.log('✅ Loaded services from database:', servicesData.length);
             updatedProfile.services = servicesData;
           }
           
           // Re-fetch barber profile from database to ensure UI reflects DB state
           console.log('[Barber Profile] Re-fetching barber profile from database...');
           const { data: barberData, error: barberFetchError } = await supabase
             .from('barbers')
             .select('*')
             .eq('id', currentUser.id)
             .maybeSingle();
           
           if (!barberFetchError && barberData) {
             console.log('[Barber Profile] ✅ Barber profile re-fetched from database');
             
             // Update local state with fresh data from database
             setCurrentUser(prev => prev ? {
               ...prev,
               name: barberData.full_name || barberData.name,
               phone: barberData.phone,
               avatar: barberData.avatar || '',
               bio: barberData.bio || '',
               services: updatedProfile.services, // Services were already re-fetched above
               districts: Array.isArray(barberData.districts) ? barberData.districts : [],
               languages: Array.isArray(barberData.languages) ? barberData.languages : [],
               specialties: Array.isArray(barberData.specialties) ? barberData.specialties : [],
               gallery: Array.isArray(barberData.gallery) ? barberData.gallery : [],
               working_hours: barberData.working_hours || {},
               address: barberData.address,
               workingDistrict: barberData.working_district,
               workplaceAddress: barberData.address || barberData.location || '',
               googleMapsUrl: barberData.google_maps_url || '',
               subscriptionStatus: barberData.subscription_status,
               subscriptionExpiryDate: barberData.subscription_expiry_date,
               currentPlan: barberData.subscription_plan,
               trialUsed: barberData.trial_used,
               rating: barberData.rating || 5.0,
               reviewCount: barberData.review_count || 0,
             } : null);
           } else {
             console.warn('[Barber Profile] ⚠️ Could not re-fetch barber profile, keeping current state');
           }
       }

       // Update customers table (for non-barbers or general customer fields)
       if (currentUser.role !== 'barber') {
         console.log('[Customer Profile] Starting update for customer:', currentUser.id);
         
         const newFullName = updatedProfile.name || updatedProfile.fullName;
         
         if (!newFullName || !newFullName.trim()) {
           toast.error(t('toast.profileFailedSave') || 'Name cannot be empty.');
           return;
         }
         
         try {
           // First, check if customer exists in the customers table
           console.log('[Customer Profile] Checking if customer exists in database...');
           const { data: existingCustomer, error: checkError } = await supabase
             .from('customers')
             .select('id, full_name, phone')
             .eq('id', currentUser.id)
             .maybeSingle();
           
           if (checkError) {
             console.error('[Customer Profile] Error checking customer existence:', checkError);
             toast.error(t('toast.profileFailedSave') || 'Failed to verify customer profile.');
             return;
           }
           
           if (!existingCustomer) {
             console.warn('[Customer Profile] ⚠️ Customer does not exist in customers table. Creating...');
             
             // Customer doesn't exist, create them first
             const { data: newCustomer, error: createError } = await supabase
               .from('customers')
               .insert({
                 id: currentUser.id,
                 full_name: newFullName,
                 phone: currentUser.phone || '',
               })
               .select()
               .single();
             
             if (createError) {
               console.error('[Customer Profile] Error creating customer:', createError);
               toast.error(t('toast.profileFailedSave') || 'Failed to create customer profile.');
               return;
             }
             
             console.log('[Customer Profile]  Customer created:', newCustomer);
             
             // Update local state with new customer data
             setCurrentUser(prev => prev ? {
               ...prev,
               name: newCustomer.full_name,
               phone: newCustomer.phone,
             } : null);
             
             toast.success(t('toast.profileUpdated') || 'Profile created successfully');
             return;
           }
           
           console.log('[Customer Profile] ✅ Customer exists:', existingCustomer);
           
           // Call Supabase RPC function to update customer name
           console.log('[Customer Profile] Calling RPC update_customer_name:', {
             p_customer_id: currentUser.id,
             p_full_name: newFullName
           });
           
           const { data: updatedCustomer, error: rpcError } = await supabase
             .rpc('update_customer_name', {
               p_customer_id: currentUser.id,
               p_full_name: newFullName
             });
           
           if (rpcError) {
             console.error('[Customer Profile] RPC error:', rpcError);
             toast.error(t('toast.profileFailedSave') || 'Failed to save profile.');
             return;
           }
           
           console.log('[Customer Profile] ✅ RPC update successful:', updatedCustomer);
           
           // Re-fetch customer profile from database to ensure UI reflects DB
           console.log('[Customer Profile] Re-fetching customer profile from database...');
           const { data: customerData, error: fetchError } = await supabase
             .from('customers')
             .select('*')
             .eq('id', currentUser.id)
             .maybeSingle();
           
           if (fetchError) {
             console.error('[Customer Profile] Re-fetch error:', fetchError);
             // Don't fail completely - update state with what we know
             console.warn('[Customer Profile] ⚠️ Could not re-fetch, updating state optimistically');
             setCurrentUser(prev => prev ? {
               ...prev,
               name: newFullName,
               phone: currentUser.phone,
             } : null);
             toast.success(t('toast.profileUpdated') || 'Profile updated successfully');
             return;
           }
           
           if (!customerData) {
             console.error('[Customer Profile] ⚠️ Customer not found after RPC update');
             // Update state optimistically
             setCurrentUser(prev => prev ? {
               ...prev,
               name: newFullName,
               phone: currentUser.phone,
             } : null);
             toast.success(t('toast.profileUpdated') || 'Profile updated successfully');
             return;
           }
           
           console.log('[Customer Profile] ✅ Customer profile re-fetched:', customerData);
           
           // Update local state with fresh data from database
           setCurrentUser(prev => prev ? {
             ...prev,
             name: customerData.full_name,
             phone: customerData.phone,
             avatar: customerData.avatar || prev.avatar,
           } : null);
           
           toast.success(t('toast.profileUpdated') || 'Profile updated successfully');
         } catch (rpcException: any) {
           console.error('[Customer Profile] RPC exception:', rpcException);
           toast.error(t('toast.profileFailedSave') || 'Failed to save profile.');
           return;
         }
       } else {
         // Update local state for barber (already saved above)
         // State already updated from database re-fetch - DO NOT overwrite with form data!
       }
       
       // Refetch barbers to reflect changes on customer homepage
       console.log('🔄 Refetching barbers to update price range on customer homepage...');
       await refetchBarbers();
       console.log('✅ Barbers refetched successfully');
     } catch (e: any) {
       console.error('[Supabase][Profile] update exception:', e);
       
       // Check if it's a Supabase error
       if (e?.message) {
         console.error('[Supabase][Profile] Error details:', {
           message: e.message,
           code: e.code,
           details: e.details,
           hint: e.hint
         });
       }
       
       toast.error(t('toast.profileUpdateFailed') || 'Failed to update profile. Please try again.');
     }
  };

  const handleToggleFavorite = async (barberId: string) => {
    if (!currentUser) {
        toast.info(t('auth.loginRequired') || "Please login to add favorites");
        setAuthView('login');
        setActiveTab('profile');
        return;
    }
    
    const exists = favoriteIds.includes(barberId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[FAVORITES] Toggle favorite:', { 
        barberId, 
        exists, 
        userId: currentUser.id 
      });
    }

    try {
       const sessionToken = localStorage.getItem('trimly_session_token');
       if (!sessionToken) {
         toast.error("Session expired. Please login again.");
         return;
       }

       if (exists) {
         // DELETE from favorites via backend (uses service role key to bypass RLS)
         if (process.env.NODE_ENV === 'development') {
           console.log('[FAVORITES] Removing from favorites via backend...');
         }
         
         const response = await fetch(
           `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/favorites/${barberId}`,
           {
             method: 'DELETE',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${publicAnonKey}`,
               'X-Session-Token': sessionToken,
             },
           }
         );
         
         if (!response.ok) {
           const errorData = await response.json();
           console.error('[FAVORITES] Delete error:', errorData);
           toast.error("Failed to remove favorite");
           return;
         }
         
         if (process.env.NODE_ENV === 'development') {
           console.log('[FAVORITES] ✅ Removed from favorites');
         }
         toast.success(t('toast.removedFromFavorites') || 'Removed from favorites');
       } else {
         // INSERT into favorites via backend (uses service role key to bypass RLS)
         if (process.env.NODE_ENV === 'development') {
           console.log('[FAVORITES] Adding to favorites via backend...');
         }
         
         const response = await fetch(
           `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/favorites`,
           {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${publicAnonKey}`,
               'X-Session-Token': sessionToken,
             },
             body: JSON.stringify({ barber_id: barberId }),
           }
         );
         
         if (!response.ok) {
           const errorData = await response.json();
           console.error('[FAVORITES] Insert error:', errorData);
           toast.error("Failed to add favorite");
           return;
         }
         
         if (process.env.NODE_ENV === 'development') {
           console.log('[FAVORITES] ✅ Added to favorites');
         }
         toast.success(t('toast.addedToFavorites') || 'Added to favorites');
       }
       
       // Re-fetch favorites from backend to update UI
       if (process.env.NODE_ENV === 'development') {
         console.log('[FAVORITES] Re-fetching favorites from backend...');
       }
       
       const response = await fetch(
         `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/favorites`,
         {
           method: 'GET',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${publicAnonKey}`,
             'X-Session-Token': sessionToken,
           },
         }
       );
       
       if (response.ok) {
         const { favoriteIds: newFavoriteIds } = await response.json();
         if (process.env.NODE_ENV === 'development') {
           console.log('[FAVORITES] ✅ Favorites updated:', newFavoriteIds.length);
         }
         setFavoriteIds(newFavoriteIds);
       } else {
         console.error('[FAVORITES] Failed to fetch favorites after update');
       }
    } catch (e) {
       console.error('[FAVORITES] Exception:', e);
       toast.error("Failed to update favorites");
    }
  };
  
  // Reset scroll
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Get tab order based on user role
  const getTabOrder = useMemo(() => {
    if (!currentUser) {
      return ['search', 'map', 'profile'];
    }
    if (currentUser.role === 'customer') {
      return ['search', 'map', 'favorites', 'home', 'profile'];
    }
    if (currentUser.role === 'barber') {
      return ['home', 'schedule', 'subscription', 'edit-profile'];
    }
    return ['search', 'map', 'profile'];
  }, [currentUser]);

  // Swipe gesture handlers removed

  if (isLoading) {
     return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Show auth setup screen if email provider is not configured
  if (showAuthSetup) {
     return <AuthSetupRequired onRetry={() => setShowAuthSetup(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div 
        className="flex-1 flex flex-col"
      >
        {!currentUser && activeTab === 'profile' ? (
          authView === 'login' ? (
            <LoginPage 
              onLogin={handleLogin} 
              onNavigateToSignUp={() => setAuthView('signup')}
            />
          ) : (
            <SignUpPage
              onSignUp={handleSignUp}
              onNavigateToLogin={() => setAuthView('login')}
            />
          )
        ) : (
          currentUser?.role === 'barber' ? (
            <BarberDashboard
              barberName={currentUser.name}
              stats={barberStats}
              todaysBookings={todaysBarberBookings}
              allBookings={bookings.filter(b => b.barberId === currentUser?.id)}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              barberProfile={currentUser as any} 
              onUpdateProfile={handleUpdateProfile}
              onSaveManualBooking={handleAddBooking} 
              onDeleteManualBooking={handleCancelBooking} 
              onAddBooking={handleAddBooking}
            />
          ) : (
            <CustomerDashboard
              customer={currentUser}
              bookings={bookings}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onCancelBooking={handleCancelBooking}
              onRescheduleBooking={handleRescheduleBooking}
              onBookAgain={() => {}}
              onAddBooking={handleAddBooking}
              onUpdateProfile={handleUpdateProfile}
              barbers={barbers}
              isBarbersLoading={isBarbersLoading}
              favoriteIds={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
              onNavigateToLogin={() => {
                setActiveTab('profile');
                setAuthView('login');
              }}
            />
          )
        )}
      </div>

      <SupabaseDebugBanner />
      <Toaster position="top-right" richColors />
      {activeTab !== 'map' && <Footer />}
    </div>
  );
}

function App() {
  // Check if we're on the admin sync page
  const isAdminSync = window.location.pathname === '/admin-sync' || window.location.hash === '#/admin-sync';
  
  if (isAdminSync) {
    return (
      <LanguageProvider>
        <AdminSync />
      </LanguageProvider>
    );
  }
  
  // Check if we're on a barber profile page (/b/{username})
  const barberUsernameMatch = window.location.pathname.match(/^\/b\/([^\/]+)$/);
  if (barberUsernameMatch) {
    const username = barberUsernameMatch[1];
    console.log('🔗 [App] Barber username route detected:', username);
    
    // Convert to query parameter format for internal handling
    // This maintains the URL but adds a query parameter
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has('username')) {
      currentUrl.searchParams.set('username', username);
      window.history.replaceState({}, '', currentUrl.toString());
    }
  }
  
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;