import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, User, Check, ChevronRight, ChevronLeft, Phone, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { ManualBooking, Barber, Service } from '../types';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';
import { isTimeSlotInPast } from '../utils/timeValidation';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';

interface ManualBookingFormProps {
  onClose: () => void;
  onSubmit: (booking: Omit<ManualBooking, 'id'>) => Promise<void>;
  barber: Barber;
}

type BookingStep = 'customer' | 'service' | 'datetime' | 'confirm' | 'success';

export function ManualBookingForm({ onClose, onSubmit, barber }: ManualBookingFormProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<BookingStep>('customer');
  
  // Authentication state - CRITICAL: Track active session
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  // CRITICAL: Initialize and maintain active session from shared Supabase client
  useEffect(() => {
    console.log('[MANUAL BOOKING AUTH] 🔐 Initializing session on component mount');
    let mounted = true;
    
    // Fetch initial session and user
    const initializeAuth = async () => {
      try {
        setAuthLoading(true);
        
        // Get current session from shared Supabase client (same as App.tsx)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('[MANUAL BOOKING AUTH] 📊 Session check result:', {
          hasSession: !!session,
          userId: session?.user?.id,
          error: sessionError,
          accessToken: session?.access_token ? 'present' : 'missing'
        });
        
        if (sessionError) {
          console.error('[MANUAL BOOKING AUTH] ❌ Error fetching session:', sessionError);
          if (mounted) {
            setCurrentSession(null);
            setCurrentUser(null);
          }
          setAuthLoading(false);
          return;
        }

        if (!session) {
          console.log('[MANUAL BOOKING AUTH] 📋 Using KV session token for authentication');
          if (mounted) {
            setCurrentSession(null);
            setCurrentUser(null);
          }
          setAuthLoading(false);
          return;
        }

        console.log('[MANUAL BOOKING AUTH] ✅ Session found:', {
          userId: session.user.id,
          email: session.user.email,
          role: session.user.user_metadata?.role
        });
        
        if (mounted) {
          setCurrentSession(session);
        }

        // Get current user from the session
        const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
        
        console.log('[MANUAL BOOKING AUTH] 👤 User fetch result:', {
          hasUser: !!user,
          userId: user?.id,
          error: userError
        });
        
        if (userError) {
          console.error('[MANUAL BOOKING AUTH] ❌ Error fetching user:', userError);
          if (mounted) {
            setCurrentUser(null);
          }
        } else if (user) {
          console.log('[MANUAL BOOKING AUTH] ✅ User found:', {
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role
          });
          if (mounted) {
            setCurrentUser(user);
          }
        } else {
          console.warn('[MANUAL BOOKING AUTH] ⚠️ No user found');
          if (mounted) {
            setCurrentUser(null);
          }
        }
        
        setAuthLoading(false);
      } catch (err) {
        console.error('[MANUAL BOOKING AUTH] ❌ Exception during auth initialization:', err);
        if (mounted) {
          setCurrentSession(null);
          setCurrentUser(null);
        }
        setAuthLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes to keep session updated (same as App.tsx)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[MANUAL BOOKING AUTH] 🔄 Auth state changed:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id
      });
      
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        console.log('[MANUAL BOOKING AUTH] 🚪 User signed out');
        setCurrentSession(null);
        setCurrentUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[MANUAL BOOKING AUTH] ✅ Session updated:', session?.user?.id);
        setCurrentSession(session);
        
        if (session) {
          const { data: { user } } = await supabase.auth.getUser(session.access_token);
          setCurrentUser(user || null);
        }
      } else if (event === 'USER_UPDATED') {
        console.log('[MANUAL BOOKING AUTH] 👤 User updated');
        if (session) {
          const { data: { user } } = await supabase.auth.getUser(session.access_token);
          setCurrentUser(user || null);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('[MANUAL BOOKING AUTH] 🧹 Cleaning up auth subscription');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // State for services from Supabase - CRITICAL: Fetch services directly
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  // Fetch services from Supabase public.services table
  useEffect(() => {
    const fetchServices = async () => {
      if (!barber.id) {
        console.log('[MANUAL BOOKING] ⚠️ No barber ID, skipping service fetch');
        setServices([]);
        setServicesLoading(false);
        return;
      }

      setServicesLoading(true);
      setServicesError(null);
      
      console.log('[MANUAL BOOKING] 🔍 Fetching services for barber:', barber.id);

      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, barber_id, name, duration, price, description, created_at, updated_at')
          .eq('barber_id', barber.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[MANUAL BOOKING] ❌ Error fetching services:', error);
          setServicesError('Failed to load services. Please try again.');
          setServices([]);
        } else {
          console.log('[MANUAL BOOKING] ✅ Services fetched from Supabase:', data?.length || 0);
          console.log('[MANUAL BOOKING] 📋 Services data:', JSON.stringify(data, null, 2));
          setServices(data || []);
          
          if (!data || data.length === 0) {
            console.warn('[MANUAL BOOKING] ⚠️ No services found for barber');
          }
        }
      } catch (err) {
        console.error('[MANUAL BOOKING] ❌ Exception fetching services:', err);
        setServicesError('Failed to load services. Please try again.');
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, [barber.id]);

  // Available services - use fetched services from Supabase
  const availableServices = services;

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null); // Store real slot ID

  // Add slot modal state
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [newSlotTime, setNewSlotTime] = useState('');
  const [slotBookingError, setSlotBookingError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available dates (next 14 days, excluding past dates)
  const today = new Date().toISOString().split('T')[0];
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    const day = date.getDate();
    const dayName = t('common.days.short')[dayOfWeek];
    const monthName = t('common.months.short')[month];
    return {
      date: dateStr,
      label: `${dayName} ${monthName} ${day}`,
    };
  }).filter(d => d.date >= today); // Only future and today's dates

  // Real time slots from Supabase barber_slots table
  const [timeSlots, setTimeSlots] = useState<Array<{ id: string; time: string; available: boolean }>>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Fetch real slots from Supabase view when date is selected
  useEffect(() => {
    const fetchSlotsFromSupabase = async () => {
      if (!selectedDate || !barber.id) {
        setTimeSlots([]);
        return;
      }

      setIsLoadingSlots(true);
      console.log('[MANUAL BOOKING] Fetching slots from view for:', { barberId: barber.id, date: selectedDate });

      try {
        // Calculate total duration for selected services
        const totalDuration = selectedServices.reduce((sum, service) => {
          return sum + service.duration;
        }, 0);

        console.log('[MANUAL BOOKING] ⏱️ Required duration:', totalDuration, 'minutes');

        // Fetch slots from barber_slots table (NOT from view)
        const { data, error } = await supabase
          .from('barber_slots')
          .select('id, barber_id, slot_date, start_time, end_time, is_booked, is_available, status, created_at')
          .eq('barber_id', barber.id)
          .eq('slot_date', selectedDate)
          .order('start_time', { ascending: true });

        if (error) {
          console.error('[MANUAL BOOKING] Error fetching slots:', error);
          toast.error('Failed to load time slots');
          setTimeSlots([]);
          return;
        }

        console.log('[MANUAL BOOKING] Fetched slots from barber_slots table:', data);

        if (!data || data.length === 0) {
          console.log('[MANUAL BOOKING] No slots found for this date');
          setTimeSlots([]);
          return;
        }

        // CRITICAL: Show ALL slots (booked and available) from the database
        // Map all slots to UI format with proper availability based on database state
        const allSlotsMapped = data.map((slot: any) => ({
          id: slot.id, // Database UUID - ONLY use this as React key
          time: slot.start_time.slice(0, 5), // HH:MM format
          available: slot.is_available && !slot.is_booked, // Available only if both flags are true
          status: slot.status || (slot.is_booked ? 'booked' : 'available')
        }));

        console.log('[MANUAL BOOKING] ✅ All slots mapped (booked + available):', allSlotsMapped.length);
        console.log('[MANUAL BOOKING] Booked slots:', allSlotsMapped.filter(s => !s.available).length);
        console.log('[MANUAL BOOKING] Available slots:', allSlotsMapped.filter(s => s.available).length);
        
        setTimeSlots(allSlotsMapped);
      } catch (err) {
        console.error('[MANUAL BOOKING] Exception fetching slots:', err);
        toast.error('Failed to load time slots');
        setTimeSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlotsFromSupabase();
  }, [selectedDate, barber.id, selectedServices]);

  const handlePhoneChange = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // Format the phone number as +998 90 123 45 67
    let formatted = '+998';
    
    if (digitsOnly.length > 3) {
      const afterCode = digitsOnly.substring(3);
      if (afterCode.length > 0) formatted += ' ' + afterCode.substring(0, 2);
      if (afterCode.length > 2) formatted += ' ' + afterCode.substring(2, 5);
      if (afterCode.length > 5) formatted += ' ' + afterCode.substring(5, 7);
      if (afterCode.length > 7) formatted += ' ' + afterCode.substring(7, 9);
    }
    
    setCustomerPhone(formatted);
    
    // Clear error when user starts typing
    if (phoneError) {
      setPhoneError('');
    }
  };

  const isPhoneNumberValid = (phone: string): boolean => {
    // Valid format: +998 90 123 45 67 (17 characters total including spaces)
    return phone.length === 17 && phone.startsWith('+998');
  };

  const handleServiceToggle = (service: Service) => {
    setSelectedServices((prev) =>
      prev.some((s) => s.name === service.name)
        ? prev.filter((s) => s.name !== service.name)
        : [...prev, service]
    );
  };

  const handleNext = () => {
    if (currentStep === 'customer') {
      if (!customerName.trim()) {
        toast.error(t('manualBooking.customerNameRequired'));
        return;
      }
      setCurrentStep('service');
    } else if (currentStep === 'service') {
      if (selectedServices.length === 0) {
        toast.error(t('toast.pleaseSelectService'));
        return;
      }
      setCurrentStep('datetime');
    } else if (currentStep === 'datetime') {
      if (!selectedDate || !selectedTimeSlot) {
        toast.error(t('toast.pleaseSelectDateTime'));
        return;
      }
      if (!isPhoneNumberValid(customerPhone)) {
        setPhoneError(t('auth.invalidPhoneNumber'));
        return;
      }
      setCurrentStep('confirm');
    } else if (currentStep === 'confirm') {
      handleConfirmBooking();
    }
  };

  const handleBack = () => {
    if (currentStep === 'service') setCurrentStep('customer');
    else if (currentStep === 'datetime') setCurrentStep('service');
    else if (currentStep === 'confirm') setCurrentStep('datetime');
  };

  const handleConfirmBooking = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Find the selected slot ID
    const selectedSlot = timeSlots.find(slot => slot.time === selectedTimeSlot);
    
    // Calculate total duration and price for multiple services
    const totalDuration = selectedServices.reduce((sum, service) => {
      return sum + service.duration;
    }, 0);
    
    const totalPrice = selectedServices.reduce((sum, service) => {
      return sum + service.price;
    }, 0);

    // selectedTimeSlot is now just a single time like "09:00"
    const [startHour, startMinute] = selectedTimeSlot.split(':');
    const endTime = new Date();
    endTime.setHours(parseInt(startHour), parseInt(startMinute) + totalDuration);

    // CRITICAL: Ensure slot exists BEFORE creating booking
    let finalSlotId = selectedSlot?.id;
    
    // If no slot exists (shouldn't happen but double-check), create one
    if (!selectedSlot || !finalSlotId || finalSlotId.startsWith('temp-')) {
      console.log('[MANUAL BOOKING] Creating missing slot before booking');
      
      try {
        const sessionToken = localStorage.getItem('trimly_session_token');
        if (!sessionToken) {
          toast.error('Please login to create booking');
          return;
        }

        // Calculate times
        const startTime = `${selectedTimeSlot}:00`;
        const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}:00`;

        const slotPayload = {
          slot_date: selectedDate,
          start_time: startTime,
          end_time: endTimeStr,
          is_available: true
        };

        console.log('[MANUAL BOOKING] Creating slot:', slotPayload);

        const slotResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/barber/slots`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-Session-Token': sessionToken,
            },
            body: JSON.stringify(slotPayload),
          }
        );

        if (!slotResponse.ok) {
          const errorData = await slotResponse.json();
          console.error('[MANUAL BOOKING] Failed to create slot:', errorData);
          toast.error('Failed to create time slot');
          return;
        }

        const slotResult = await slotResponse.json();
        finalSlotId = slotResult.slot.id;
        console.log('[MANUAL BOOKING] ✅ Slot created:', finalSlotId);
        
      } catch (err) {
        console.error('[MANUAL BOOKING] Error creating slot:', err);
        toast.error('Failed to create time slot');
        return;
      }
    }

    // Find service UUID if available
    const isValidUUID = (str: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    let finalServiceId: string | undefined;
    if (barber.services && barber.services.length > 0) {
      const firstSelectedServiceName = selectedServices[0].name;
      const matchingService = barber.services.find(s => s.name === firstSelectedServiceName);
      if (matchingService && isValidUUID(matchingService.id)) {
        finalServiceId = matchingService.id;
      }
    }

    const newBooking: Omit<ManualBooking, 'id'> = {
      barberId: barber.id,
      barberName: barber.name,
      barberAvatar: barber.avatar || '',
      customerId: null, // No customer ID for manual bookings
      customerName: customerName.trim(),
      customerPhone: customerPhone,
      serviceType: selectedServices.map(s => s.name).join(' + '),
      date: selectedDate,
      startTime: selectedTimeSlot,
      endTime: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
      duration: totalDuration,
      price: totalPrice,
      status: 'confirmed',
      source: 'manual', // CRITICAL: Mark as manual booking
      manualCustomerName: customerName.trim(), // Store in manual fields
      manualCustomerPhone: customerPhone, // Store in manual fields
      slotId: finalSlotId, // CRITICAL: Real slot ID from barber_slots (guaranteed to exist now)
      ...(finalServiceId ? { serviceId: finalServiceId } : {}),
    };

    console.log('[MANUAL BOOKING] Submitting booking:', {
      source: newBooking.source,
      slotId: newBooking.slotId,
      manualCustomerName: newBooking.manualCustomerName,
      manualCustomerPhone: newBooking.manualCustomerPhone
    });

    try {
      // Wait for booking to be created
      await onSubmit(newBooking);
      
      // Show success toast
      toast.success(t('toast.manualBookingSuccess'));
      
      setCurrentStep('success');
      setIsSubmitting(false);

      // Auto-close after success
      setTimeout(() => {
        onClose();
        // Reset form
        setCustomerName('');
        setCustomerPhone('');
        setPhoneError('');
        setSelectedServices([]);
        setSelectedDate('');
        setSelectedTimeSlot('');
        setSelectedSlotId(null);
        setCurrentStep('customer');
      }, 2000);
    } catch (error) {
      console.error('[MANUAL BOOKING] Failed to create booking:', error);
      toast.error('Failed to create booking. Please try again.');
      setIsSubmitting(false);
    }
  };

  const totalPrice = selectedServices.reduce((sum, service) => {
    return sum + service.price;
  }, 0);
  
  const totalDuration = selectedServices.reduce((sum, service) => {
    return sum + service.duration;
  }, 0);

  // Handler for adding new slot - SAME AS SLOTS PAGE
  const handleAddNewSlot = async () => {
    if (!newSlotTime || !selectedDate) {
      toast.error('Please enter a valid time');
      return;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(newSlotTime)) {
      toast.error('Invalid time format. Use HH:MM (e.g., 09:00)');
      return;
    }

    // Helper to normalize time to HH:MM:SS format
    const normalizeTime = (time: string): string => {
      if (!time) return '';
      const parts = time.split(':');
      if (parts.length === 2) return `${time}:00`;
      return time;
    };

    // Helper to calculate end time (30 min after start)
    const calculateEndTime = (startTime: string): string => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + 30; // 30 min default
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    };

    // Frontend validation: Prevent adding slots in the past (same as Slots page)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    
    console.log('[ADD SLOT] Starting add slot process:', {
      slotTime: newSlotTime,
      slotDate: selectedDate,
      barberId: barber.id
    });
    
    // Check if slot date is in the past
    if (selectedDateObj < today) {
      console.log('[ADD SLOT] ❌ Date is in the past');
      toast.error('Cannot add slots in the past');
      return;
    }
    
    // If slot date is today, check if time has passed
    if (selectedDateObj.getTime() === today.getTime()) {
      const [slotHour, slotMin] = newSlotTime.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const slotMinutes = slotHour * 60 + slotMin;
      const currentMinutes = currentHour * 60 + currentMin;
      
      if (slotMinutes <= currentMinutes) {
        console.log('[ADD SLOT] ❌ Time has already passed');
        toast.error(t('toast.cannotAddPastSlots') || 'Cannot add slots for times that have already passed');
        return;
      }
    }

    try {
      // Clear any previous errors
      setSlotBookingError('');

      // CRITICAL: Check if slot already exists and is booked
      console.log('[ADD SLOT] Checking if slot already exists and is booked...');
      const startTime = normalizeTime(newSlotTime);
      
      const { data: existingSlots, error: checkError } = await supabase
        .from('barber_slots')
        .select('id, is_booked, status')
        .eq('barber_id', barber.id)
        .eq('slot_date', selectedDate)
        .eq('start_time', startTime);

      if (checkError) {
        console.error('[ADD SLOT] Error checking existing slots:', checkError);
        // Continue with creation attempt
      } else if (existingSlots && existingSlots.length > 0) {
        const existingSlot = existingSlots[0];
        console.log('[ADD SLOT] Found existing slot:', existingSlot);
        
        // If slot exists AND is booked, show error and block creation
        if (existingSlot.is_booked) {
          console.log('[ADD SLOT] ❌ Slot is already booked');
          const errorMessage = t('schedule.slotAlreadyBooked');
          setSlotBookingError(errorMessage);
          toast.error(errorMessage);
          return; // Block creation
        } else {
          console.log('[ADD SLOT] ℹ️ Slot exists but is available - will not create duplicate');
          toast.info('This time slot already exists');
          setShowAddSlotModal(false);
          setNewSlotTime('');
          return;
        }
      }

      // Get KV session token from localStorage (SAME AS SLOTS PAGE)
      const sessionToken = localStorage.getItem('trimly_session_token');
      if (!sessionToken) {
        console.error('❌ No active session found');
        toast.error('Please login to add slots');
        // DO NOT clear the time, DO NOT close the modal
        return;
      }

      console.log('[ADD SLOT] Session token found:', sessionToken.substring(0, 20) + '...');

      // Calculate times (SAME AS SLOTS PAGE)
      const endTime = normalizeTime(calculateEndTime(newSlotTime));

      const payload = {
        slot_date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        is_available: true
      };

      console.log('[ADD SLOT] Sending request to backend:', payload);

      // Call backend API with KV session token (SAME AS SLOTS PAGE)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/barber/slots`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': sessionToken,
          },
          body: JSON.stringify(payload),
        }
      );

      console.log('[ADD SLOT] Response status:', response.status);

      if (!response.ok) {
        const result = await response.json();
        console.error('❌ Failed to add slot:', result);
        
        // Show user-friendly error messages (SAME AS SLOTS PAGE)
        if (response.status === 401) {
          toast.error('Session expired. Please login again.');
        } else if (response.status === 403) {
          toast.error('Only barbers can create slots');
        } else if (result.error) {
          toast.error(`Failed to add slot: ${result.error}`);
        } else {
          toast.error('Failed to add slot. Please try again.');
        }
        // DO NOT clear the time, DO NOT close the modal
        return;
      }

      console.log('✅ Slot added successfully');
      toast.success(t('schedule.slotAddedSuccess') || 'Time slot added successfully');

      // Close modal and reset input ONLY on success (SAME AS SLOTS PAGE)
      setShowAddSlotModal(false);
      setNewSlotTime('');

      // Re-fetch slots from Supabase to update UI (SAME AS SLOTS PAGE loadSlots())
      console.log('[ADD SLOT] 🔄 Refetching slots for barber:', barber.id, 'date:', selectedDate);
      
      setIsLoadingSlots(true);
      const { data: refetchedSlots, error: refetchError } = await supabase
        .from('barber_slots')
        .select('id, barber_id, slot_date, start_time, end_time, is_booked, is_available, status, created_at')
        .eq('barber_id', barber.id)
        .eq('slot_date', selectedDate)
        .order('start_time', { ascending: true });

      if (refetchError) {
        console.error('[ADD SLOT] ❌ Error refetching slots:', refetchError);
        toast.error('Slot added but failed to refresh list. Please reload.');
        setIsLoadingSlots(false);
        return;
      }

      console.log('[ADD SLOT] ✅ Refetched slots from barber_slots:', refetchedSlots);

      // CRITICAL: Show ALL slots (booked and available) - same as initial fetch
      const allSlots = refetchedSlots
        ?.map(slot => ({
          id: slot.id, // Database UUID - ONLY use this as React key
          time: slot.start_time.slice(0, 5), // HH:MM format
          available: slot.is_available && !slot.is_booked, // Available only if both flags are true
          status: slot.status || (slot.is_booked ? 'booked' : 'available')
        }))
        .sort((a, b) => {
          // Sort by time ascending
          const [aHours, aMinutes] = a.time.split(':').map(Number);
          const [bHours, bMinutes] = b.time.split(':').map(Number);
          return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
        }) || [];

      console.log('[ADD SLOT] 📋 Updated slots list (sorted ascending):', allSlots);
      console.log('[ADD SLOT] Booked slots:', allSlots.filter(s => !s.available).length);
      console.log('[ADD SLOT] Available slots:', allSlots.filter(s => s.available).length);
      setTimeSlots(allSlots);
      setIsLoadingSlots(false);

    } catch (err: any) {
      console.error('❌ Error adding slot:', err?.message || err);
      toast.error('An unexpected error occurred. Please try again.');
      setIsLoadingSlots(false);
      // DO NOT clear the time or close the popup on error
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-2xl w-full my-8"
        >
          <Card className="border-0 shadow-2xl">
            {/* Header */}
            <div className="relative border-b bg-[#FCFDFF] p-4 sm:p-6 rounded-t-[20px]">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute right-3 sm:right-4 top-3 sm:top-4 w-8 h-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
              
              <div className="pr-10 sm:pr-12">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
                  {t('manualBooking.addTitle')}
                </h2>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-2 mt-6">
                {['customer', 'service', 'datetime', 'confirm'].map((step, index) => (
                  <div key={`progress-step-${step}-${index}`} className="flex items-center flex-1">
                    <div
                      className={`h-1 flex-1 rounded-full transition-all ${
                        ['customer', 'service', 'datetime', 'confirm'].indexOf(currentStep) >= index
                          ? 'bg-blue-400'
                          : 'bg-gray-200'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Customer Information */}
                {currentStep === 'customer' && (
                  <motion.div
                    key="customer"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <Label htmlFor="fullName" className="text-gray-700 mb-3 block">
                        {t('manualBooking.fullName')}
                      </Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <User className="w-5 h-5" />
                        </div>
                        <Input
                          id="fullName"
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder={t('manualBooking.fullNamePlaceholder')}
                          className="pl-12 h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phoneNumber" className="text-gray-700 mb-3 block">
                        {t('manualBooking.phoneNumber')} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <Phone className="w-5 h-5" />
                        </div>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          placeholder={t('manualBooking.phoneNumberPlaceholder')}
                          maxLength={17}
                          className={`pl-12 h-12 rounded-xl bg-gray-50 focus:bg-white transition-all ${
                            phoneError 
                              ? 'border-red-300 focus:border-red-400' 
                              : 'border-gray-200 focus:border-blue-300'
                          }`}
                        />
                      </div>
                      {phoneError && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-2 flex items-center gap-1"
                        >
                          <span className="inline-block w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs">!</span>
                          {phoneError}
                        </motion.p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Service Selection */}
                {currentStep === 'service' && (
                  <motion.div
                    key="service"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <p className="text-sm text-gray-600 mb-4">
                      {t('booking.multipleServices')}
                    </p>
                    <div className="grid gap-3 max-h-96 overflow-y-auto">
                      {availableServices.map((service) => {
                        const isSelected = selectedServices.some(s => s.name === service.name);
                        // Use composite key: service.id (database UUID) or fallback to barber_id-name
                        const uniqueKey = service.id || `${service.barber_id}-${service.name}`;
                        return (
                          <motion.button
                            key={uniqueKey}
                            onClick={() => handleServiceToggle(service)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-4 rounded-xl border-2 transition-all text-left overflow-hidden ${
                              isSelected
                                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900 mb-1">
                                  {service.name}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {service.duration} {t('booking.minutes')}
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {new Intl.NumberFormat('uz-UZ').format(service.price)} UZS
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
                                >
                                  <Check className="w-4 h-4 text-white" />
                                </motion.div>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {selectedServices.length > 0 && (
                      <div className="mt-4 p-4 rounded-xl border border-white/40 bg-gradient-to-br from-[#5B8CFF]/20 via-[#5B8CFF]/15 to-[#5B8CFF]/10 backdrop-blur-sm shadow-[0_8px_32px_rgba(91,140,255,0.15)]">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">
                            {selectedServices.length} {t('booking.selected')}
                          </span>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {new Intl.NumberFormat('uz-UZ').format(totalPrice)} UZS
                            </div>
                            <div className="text-xs text-gray-600">
                              {totalDuration} {t('booking.minutes')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Date & Time Selection */}
                {currentStep === 'datetime' && (
                  <motion.div
                    key="datetime"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Date Selection */}
                    <div>
                      <Label className="mb-3 block">{t('booking.selectDate')}</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {availableDates.map((dateOption) => (
                          <button
                            key={dateOption.date}
                            onClick={() => setSelectedDate(dateOption.date)}
                            className={`p-3 rounded-xl border-2 transition-all text-center ${
                              selectedDate === dateOption.date
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-xs text-gray-600 mb-1">
                              {dateOption.label.split(' ')[0]}
                            </div>
                            <div className="font-semibold text-gray-900">
                              {dateOption.label.split(' ')[2]}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time Selection */}
                    {selectedDate && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Label className="mb-3 block">{t('booking.selectTime')}</Label>
                        {isLoadingSlots ? (
                          <div className="text-center py-8 text-gray-500">
                            Loading slots...
                          </div>
                        ) : timeSlots.length === 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                            {/* Add slot tile - shown when no slots */}
                            <button
                              key="add-slot-button-empty"
                              onClick={() => setShowAddSlotModal(true)}
                              className="p-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all bg-white"
                            >
                              <div className="text-sm font-medium text-gray-900 text-center flex items-center justify-center h-full bg-[rgba(0,0,0,0)]">
                                <Plus className="w-6 h-6 text-gray-400" />
                              </div>
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                            {timeSlots.map((slot) => {
                              const isPast = isTimeSlotInPast(selectedDate, slot.time);
                              const isDisabled = !slot.available || isPast;
                              // Use ONLY slot.id as key - guaranteed unique from database
                              return (
                                <button
                                  key={slot.id}
                                  onClick={() => !isDisabled && setSelectedTimeSlot(slot.time)}
                                  disabled={isDisabled}
                                  className={`p-3 rounded-2xl border transition-all ${
                                    selectedTimeSlot === slot.time
                                      ? 'border-[rgb(54,108,255)] bg-[rgb(54,108,255)]/10 shadow-sm'
                                      : isDisabled
                                      ? 'border-red-200 bg-red-50 cursor-not-allowed opacity-40'
                                      : 'border-gray-200 bg-white hover:border-[rgb(54,108,255)]/40 hover:bg-blue-50/30'
                                  }`}
                                  title={isPast ? 'This time has already passed' : !slot.available ? 'This time slot is booked' : 'Available'}
                                >
                                  <div className="flex flex-col items-center justify-center gap-1">
                                    <div className={`text-sm font-medium text-center ${
                                      selectedTimeSlot === slot.time
                                        ? 'text-[rgb(54,108,255)]'
                                        : isDisabled
                                        ? 'text-red-600'
                                        : 'text-gray-700'
                                    }`}>
                                      {slot.time}
                                    </div>
                                    {!slot.available && !isPast && (
                                      <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
                                        {t('schedule.booked')}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                            {/* Add slot tile - shown after existing slots */}
                            <button
                              key="add-slot-button"
                              onClick={() => setShowAddSlotModal(true)}
                              className="p-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all bg-white"
                            >
                              <div className="text-sm font-medium text-gray-900 text-center flex items-center justify-center h-full">
                                <Plus className="w-6 h-6" />
                              </div>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Step 4: Confirmation */}
                {currentStep === 'confirm' && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-xl border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        {t('booking.confirmBooking')}
                      </h3>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">{t('manualBooking.customerName')}</span>
                          <span className="font-medium text-gray-900">{customerName}</span>
                        </div>
                        {customerPhone && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600">{t('auth.phone')}</span>
                            <span className="font-medium text-gray-900">{customerPhone}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">{t('booking.services')}</span>
                          <span className="font-medium text-gray-900 text-right">
                            {selectedServices.map(s => s.name).join(' + ')}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">{t('booking.date')}</span>
                          <span className="font-medium text-gray-900">
                            {new Date(selectedDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">{t('booking.time')}</span>
                          <span className="font-medium text-gray-900">
                            {selectedTimeSlot}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">{t('booking.duration')}</span>
                          <span className="font-medium text-gray-900">
                            {totalDuration} {t('booking.minutes')}
                          </span>
                        </div>
                        <div className="flex justify-between py-3 pt-4">
                          <span className="font-semibold text-gray-900">{t('booking.totalPrice')}</span>
                          <span className="font-bold text-xl text-[#5B8CFF]">
                            {new Intl.NumberFormat('uz-UZ').format(totalPrice)} UZS
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Success State */}
                {currentStep === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring' }}
                      className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center"
                    >
                      <Check className="w-10 h-10 text-white" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {t('booking.bookingConfirmed')}
                    </h3>
                    <p className="text-gray-600">
                      {t('manualBooking.saved')}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>

            {/* Footer Navigation */}
            {currentStep !== 'success' && (
              <div className="border-t p-6 bg-gray-50 rounded-[20px]">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={currentStep === 'customer' ? onClose : handleBack}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('common.back')}
                  </Button>

                  <Button
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white shadow-lg shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>{t('common.processing') || 'Processing...'}</span>
                      </div>
                    ) : (
                      <>
                        {currentStep === 'confirm' ? t('booking.confirm') : t('common.next')}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>

      {/* Add Slot Modal */}
      {showAddSlotModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowAddSlotModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 p-6 rounded-[20px] shadow-2xl w-full max-w-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('schedule.addTimeSlotModal')}
              </h3>
              <button
                onClick={() => {
                  setShowAddSlotModal(false);
                  setSlotBookingError('');
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="newSlotTime" className="mb-2 block">
                  {t('schedule.timeHHMM')}
                </Label>
                <Input
                  id="newSlotTime"
                  type="time"
                  value={newSlotTime}
                  onChange={(e) => {
                    setNewSlotTime(e.target.value);
                    // Clear error when user changes time
                    if (slotBookingError) {
                      setSlotBookingError('');
                    }
                  }}
                  className={`h-12 rounded-xl bg-gray-50 focus:bg-white transition-all ${
                    slotBookingError 
                      ? 'border-red-300 focus:border-red-400' 
                      : 'border-gray-200 focus:border-blue-300'
                  }`}
                  placeholder="09:00"
                />
                {slotBookingError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm mt-2 flex items-center gap-1"
                  >
                    <span className="inline-block w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">!</span>
                    {slotBookingError}
                  </motion.p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddSlotModal(false);
                    setNewSlotTime('');
                    setSlotBookingError('');
                  }}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleAddNewSlot}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
                >
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}