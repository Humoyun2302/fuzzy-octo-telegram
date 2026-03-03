import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, DollarSign, Check, ChevronRight, ChevronLeft, MapPin, RefreshCw, Repeat, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Barber, Booking, Service } from '../types';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { generateBookingId } from '../utils/generateBookingId';
import { computeAvailableSlots } from '../utils/slotCalculations';
import { isTimeSlotInPast } from '../utils/timeValidation';
import { createBookingFlow } from '../utils/bookingFlow';
import { translateDistrict } from '../utils/districtTranslations';

// Safe string helpers to prevent crashes on undefined/null values
const safeStr = (v: any): string => (v == null ? '' : String(v));
const safeSplit = (v: any, sep: string): string[] => safeStr(v).split(sep);

interface BookingModalProps {
  barber: Barber;
  onClose: () => void;
  onConfirmBooking: (booking: Omit<Booking, 'id'>) => void;
  onBookingSuccess?: () => void; // Callback to refresh bookings after successful creation
  customerId: string;
  customerName: string;
  mode?: 'new' | 'reschedule';
  existingBooking?: Booking;
  onNavigateToLogin?: () => void;
  guestInfo?: { name: string; phone: string } | null;
}

type BookingStep = 'service' | 'datetime' | 'confirm' | 'success';

export function BookingModal({ 
  barber, 
  onClose, 
  onConfirmBooking, 
  onBookingSuccess,
  customerId, 
  customerName,
  mode = 'new',
  existingBooking,
  onNavigateToLogin,
  guestInfo 
}: BookingModalProps) {
  const { t, language } = useLanguage();
  
  // Check if barber is available
  const isBarberAvailable = barber.is_available !== false && barber.isSubscriptionActive !== false;

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
  
  if (!isBarberAvailable) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden p-6 text-center"
        >
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <X className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Barber Unavailable</h2>
          <p className="text-gray-600 mb-6">
            This barber is currently unavailable for bookings. Please try again later or find another barber.
          </p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </motion.div>
      </div>
    );
  }

  // Determine if this is a "Book Again" scenario (mode is 'new' but existingBooking is provided)
  const isBookAgain = mode === 'new' && !!existingBooking;
  
  const [currentStep, setCurrentStep] = useState<BookingStep>(mode === 'reschedule' ? 'datetime' : 'service');
  const [selectedServices, setSelectedServices] = useState<string[]>(() => {
    if (!existingBooking) return [];
    // Split combined services (e.g., "Haircut + Beard Trim" -> ["Haircut", "Beard Trim"])
    return safeSplit(existingBooking.serviceType, ' + ').map(s => s.trim());
  });
  // For "Book Again", set to next available date instead of the old date
  const [selectedDate, setSelectedDate] = useState(isBookAgain ? '' : (existingBooking?.date || ''));
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(
    // For "Book Again", reset time slot
    isBookAgain ? '' : (existingBooking ? existingBooking.startTime : '')
  );
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // NEW: Store the full selected slot object (includes id, slot_date, start_time, end_time, status, is_available)
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  // NEW: Store the full selected service object
  const [selectedServiceObj, setSelectedServiceObj] = useState<any | null>(null);
  // State to track which service descriptions are expanded
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  // State for barber slots from Supabase
  const [barberSlots, setBarberSlots] = useState<any[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  
  // State for booking creation
  const [bookingPending, setBookingPending] = useState(false);

  // State for services from Supabase - CRITICAL: Fetch services directly
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  // Fetch services from Supabase public.services table
  useEffect(() => {
    const fetchServices = async () => {
      if (!barber.id) {
        console.log('[BOOKING MODAL] ⚠️ No barber ID, skipping service fetch');
        setServices([]);
        setServicesLoading(false);
        return;
      }

      setServicesLoading(true);
      setServicesError(null);
      
      console.log('[BOOKING MODAL] 🔍 Fetching services for barber:', barber.id);

      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, barber_id, name, duration, price, description, created_at, updated_at')
          .eq('barber_id', barber.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[BOOKING MODAL] ❌ Error fetching services:', error);
          setServicesError('Failed to load services. Please try again.');
          setServices([]);
        } else {
          console.log('[BOOKING MODAL] ✅ Services fetched from Supabase:', data?.length || 0);
          console.log('[BOOKING MODAL] 📋 Services data:', JSON.stringify(data, null, 2));
          setServices(data || []);
          
          if (!data || data.length === 0) {
            console.warn('[BOOKING MODAL] ⚠️ No services found for barber');
          }
        }
      } catch (err) {
        console.error('[BOOKING MODAL] ❌ Exception fetching services:', err);
        setServicesError('Failed to load services. Please try again.');
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, [barber.id]);

  // Fetch barber schedule from public.barber_slots table (NOT from view)
  const fetchBarberSchedule = async () => {
    try {
      console.log('[CUSTOMER BOOKING] Fetching available slots from barber_slots table for barber:', barber.id);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Fetch slots from barber_slots table
      const { data: slots, error: slotsError } = await supabase
        .from('barber_slots')
        .select('id, barber_id, slot_date, start_time, end_time, status, is_available, is_booked, created_at')
        .eq('barber_id', barber.id)
        .gte('slot_date', today)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (slotsError) {
        console.error('[CUSTOMER BOOKING] Error fetching barber slots:', slotsError);
        console.error('[CUSTOMER BOOKING] Error details:', JSON.stringify(slotsError, null, 2));
        setSlotsError('Failed to load available slots');
        setBarberSlots([]);
      } else {
        console.log('[CUSTOMER BOOKING] ✅ Raw slots fetched from barber_slots table:', slots?.length || 0);
        
        // CRITICAL: Show ALL slots (both booked and available)
        // Do NOT filter - we need to show booked slots in red and available in green
        const allSlots = slots || [];

        console.log('[CUSTOMER BOOKING] ✅ Total slots (including booked):', allSlots.length);
        
        // Map to expected format with computed starts_at/ends_at for UI
        const mappedSlots = allSlots.map(slot => {
          // Compute starts_at as ${slot_date}T${start_time} (local time)
          const starts_at = `${slot.slot_date}T${slot.start_time}`;
          
          // Compute ends_at
          let ends_at: string;
          if (slot.end_time) {
            ends_at = `${slot.slot_date}T${slot.end_time}`;
          } else {
            // Default: add 30 minutes to start_time
            const startDate = new Date(starts_at);
            startDate.setMinutes(startDate.getMinutes() + 30);
            ends_at = startDate.toISOString().split('.')[0]; // Remove milliseconds
          }

          return {
            id: slot.id,
            slot_date: slot.slot_date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_available: slot.is_available, // Keep original status
            is_booked: slot.is_booked,       // CRITICAL: Include is_booked from database
            status: slot.status,             // Keep original status
            starts_at, // Computed for UI
            ends_at    // Computed for UI
          };
        });

        setBarberSlots(mappedSlots);
        console.log('[CUSTOMER BOOKING] ✅ Mapped slots with computed starts_at/ends_at:', mappedSlots.length);
      }

      // No longer need to fetch bookings separately
      setExistingBookings([]);
    } catch (error) {
      console.error('[CUSTOMER BOOKING] Error in fetchBarberSchedule:', error);
      console.error('[CUSTOMER BOOKING] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setSlotsError('Failed to load slots');
      setBarberSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    setSlotsLoading(true);
    setSlotsError(null);

    fetchBarberSchedule();
    
    // Set up interval to refetch slots every 5 seconds to catch cancellations
    const interval = setInterval(fetchBarberSchedule, 5000);
    
    return () => clearInterval(interval);
  }, [barber.id]);

  // Build a map of service name -> { price, duration } for quick lookup
  // CRITICAL: Use services fetched from Supabase, NO DEFAULT VALUES
  const serviceMap = useMemo(() => {
    const map: Record<string, { price: number; duration: number }> = {};
    
    // Use services fetched from Supabase
    if (services && services.length > 0) {
      services.forEach(service => {
        map[service.name] = {
          price: service.price,
          duration: service.duration
        };
      });
    }
    
    return map;
  }, [services]);

  // Calculate total duration - MUST be defined before timeSlots useMemo
  const totalDuration = useMemo(() => {
    if (mode === 'reschedule' && existingBooking) {
      return existingBooking.duration;
    }
    return selectedServices.reduce((sum, service) => {
      return sum + (serviceMap[service]?.duration || 0);
    }, 0);
  }, [mode, existingBooking, selectedServices, serviceMap]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (mode === 'reschedule' && existingBooking) {
      return existingBooking.price;
    }
    return selectedServices.reduce((sum, service) => {
      return sum + (serviceMap[service]?.price || 0);
    }, 0);
  }, [mode, existingBooking, selectedServices, serviceMap]);

  // Generate available dates based on barber slots (group by slot_date from DB)
  const availableDates = useMemo(() => {
    if (slotsLoading || barberSlots.length === 0) {
      return [];
    }

    const weekdayLabels = t('common.days.short') as unknown as string[];
    const monthLabels = t('common.months.short') as unknown as string[];

    // Get unique slot_date values from fetched slots
    const uniqueDates = Array.from(new Set(barberSlots.map(slot => slot.slot_date)))
      .sort()
      .map(dateStr => {
        const date = new Date(dateStr + 'T00:00:00'); // Parse date in local timezone
        const jsDay = date.getDay();
        const weekday = weekdayLabels[jsDay];
        const month = monthLabels[date.getMonth()];
        const day = date.getDate();
        
        return {
          date: dateStr,
          label: `${weekday} ${month} ${day}`,
        };
      });

    console.log('[CUSTOMER BOOKING] 📅 Available dates from DB:', uniqueDates.length, 'dates');
    console.log('[CUSTOMER BOOKING] Dates:', uniqueDates);

    return uniqueDates;
  }, [t, barberSlots, slotsLoading]);

  // Generate time slots for selected date based on barber_slots (use DB slots directly, no generation)
  const timeSlots = useMemo(() => {
    if (!selectedDate || barberSlots.length === 0) {
      return [];
    }

    console.log('[CUSTOMER BOOKING] 📅 Selected date:', selectedDate);
    console.log('[CUSTOMER BOOKING] ⏱️ Required duration:', totalDuration, 'minutes');

    // Filter slots for this specific date
    const daySlotsFromDB = barberSlots.filter(slot => slot.slot_date === selectedDate);

    console.log('[CUSTOMER BOOKING] 🗓️ Total slots for selected date:', daySlotsFromDB.length, 'slots');

    if (daySlotsFromDB.length === 0) {
      console.log('[CUSTOMER BOOKING] ⚠️ No slots found for this date');
      return [];
    }

    // Sort slots by start time
    const sortedSlots = [...daySlotsFromDB].sort((a, b) => {
      return a.start_time.localeCompare(b.start_time);
    });

    // Helper: Convert "HH:MM:SS" or "HH:MM" to minutes since midnight
    const timeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Buffer between appointments (0 minutes to allow back-to-back bookings)
    const BUFFER_MINUTES = 0;
    const requiredDuration = totalDuration + BUFFER_MINUTES;

    // Map ALL slots - show both booked and available
    const allTimeSlots = sortedSlots.map((slot, index) => {
      // CRITICAL: Check is_booked column (SINGLE SOURCE OF TRUTH)
      const isBooked = slot.is_booked === true;
      
      // For booked slots, mark them as not available for selection
      if (isBooked) {
        return {
          time: slot.start_time.substring(0, 5), // "09:00:00" -> "09:00"
          available: false,
          isBooked: true,
          slot: slot
        };
      }

      // For available slots, check if there's enough continuous free time
      const slotStartMinutes = timeToMinutes(slot.start_time);
      
      // Find the next booked/unavailable slot after this one
      let nextBlockedMinutes: number | null = null;
      
      for (let i = index + 1; i < sortedSlots.length; i++) {
        const nextSlot = sortedSlots[i];
        // CRITICAL: Check is_booked for next slots too
        if (nextSlot.is_booked === true) {
          nextBlockedMinutes = timeToMinutes(nextSlot.start_time);
          break;
        }
      }

      // If no blocked slot found, determine end of day based on last slot
      if (nextBlockedMinutes === null) {
        // Find the last slot of the day to determine closing time
        const lastSlot = sortedSlots[sortedSlots.length - 1];
        
        if (lastSlot) {
            let lastSlotEndMinutes: number;
            
            if (lastSlot.end_time) {
                lastSlotEndMinutes = timeToMinutes(lastSlot.end_time);
                // Handle midnight wrapping (00:00 should be 24:00)
                if (lastSlotEndMinutes < slotStartMinutes) lastSlotEndMinutes += 24 * 60;
            } else {
                // Default: 30 mins after start
                lastSlotEndMinutes = timeToMinutes(lastSlot.start_time) + 30;
                if (lastSlotEndMinutes < slotStartMinutes) lastSlotEndMinutes += 24 * 60;
            }
            
            // Ensure we at least cover up to 22:00, but extend if slots go later
            // If the calculated end time is less than 22:00, fallback to 22:00 (legacy behavior),
            // but if it's later (e.g. 23:00), respect the later time.
            nextBlockedMinutes = Math.max(lastSlotEndMinutes, 22 * 60);
        } else {
            nextBlockedMinutes = 22 * 60; // Fallback if no slots
        }
      }

      // Calculate continuous free window
      const continuousFreeMinutes = nextBlockedMinutes - slotStartMinutes;

      const hasEnoughTime = totalDuration > 0 ? continuousFreeMinutes >= requiredDuration : true;

      console.log('[CUSTOMER BOOKING] 🔍 Checking available slot', slot.start_time, ':', {
        slotStartMinutes,
        nextBlockedMinutes,
        continuousFreeMinutes,
        requiredDuration,
        hasEnoughTime
      });

      // Return available slot with enough time
      return {
        time: slot.start_time.substring(0, 5),
        available: hasEnoughTime,
        isBooked: false,
        slot: slot
      };
    });

    console.log('[CUSTOMER BOOKING] ✅ All time slots (including booked):', allTimeSlots.length, 'slots');
    console.log('[CUSTOMER BOOKING] Booked:', allTimeSlots.filter(s => s.isBooked).length);
    console.log('[CUSTOMER BOOKING] Available:', allTimeSlots.filter(s => !s.isBooked && s.available).length);

    return allTimeSlots;
  }, [selectedDate, barberSlots, totalDuration]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  // Helper function to format dates with translated weekday and month names
  const formatDateLong = (dateString: string) => {
    const date = new Date(dateString);
    
    const weekdayMap: Record<number, string> = {
      0: t('weekdays.long.sun'),
      1: t('weekdays.long.mon'),
      2: t('weekdays.long.tue'),
      3: t('weekdays.long.wed'),
      4: t('weekdays.long.thu'),
      5: t('weekdays.long.fri'),
      6: t('weekdays.long.sat'),
    };

    const weekday = weekdayMap[date.getDay()];
    const day = date.getDate();
    
    return `${weekday}, ${day}`;
  };

  const handleNext = () => {
    if (currentStep === 'service') {
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
      setCurrentStep('confirm');
    } else if (currentStep === 'confirm') {
      handleConfirmBooking();
    }
  };

  const handleBack = () => {
    if (currentStep === 'datetime') setCurrentStep('service');
    else if (currentStep === 'confirm') setCurrentStep('datetime');
  };

  const handleConfirmBooking = async () => {
    // Validate we have persisted slot and service objects
    if (!selectedSlot) {
      toast.error('Selected time slot is no longer available');
      return;
    }

    // RE-FETCH the slot by ID to ensure it's still available
    console.log('[BOOKING CONFIRM] Re-fetching slot by ID:', selectedSlot.id);
    
    try {
      const { data: refreshedSlot, error: slotError } = await supabase
        .from('barber_slots')
        .select('*')
        .eq('id', selectedSlot.id)
        .single();

      if (slotError || !refreshedSlot) {
        console.error('[BOOKING CONFIRM] Slot not found:', slotError);
        toast.error('Selected time slot is no longer available');
        return;
      }

      // Check if slot is still available
      if (refreshedSlot.status !== 'available' || !refreshedSlot.is_available) {
        console.error('[BOOKING CONFIRM] Slot is no longer available:', refreshedSlot);
        toast.error('Selected time slot is no longer available');
        return;
      }

      console.log('[BOOKING CONFIRM] ✅ Slot is still available');

      // Helper function to validate UUID format
      const isValidUUID = (str: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      // Validate basic requirements
      if (!barber.id || !isValidUUID(barber.id)) {
        toast.error('Invalid barber information');
        return;
      }

      // Check if user is logged in (valid customer ID) or guest info provided
      if (!customerId && !guestInfo) {
        console.log('[BOOKING CONFIRM] User not logged in and no guest info, saving pending booking');
        
        // Parse the start time to calculate end time
        const [startHour, startMinute] = selectedTimeSlot.split(':');
        const endTime = new Date();
        endTime.setHours(parseInt(startHour), parseInt(startMinute) + totalDuration);
        const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

        // Try to find service UUID from barber.services
        let finalServiceId: string | undefined;
        if (barber.services && barber.services.length > 0) {
          const firstSelectedServiceName = selectedServices[0];
          const matchingService = barber.services.find(s => s.name === firstSelectedServiceName);
          if (matchingService && isValidUUID(matchingService.id)) {
            finalServiceId = matchingService.id;
          }
        }

        // Save pending booking to localStorage
        const pendingBooking = {
          barberId: barber.id,
          barberName: barber.name,
          barberAvatar: barber.avatar,
          serviceType: selectedServices.join(' + '),
          booking_date: selectedDate,
          start_time: selectedTimeSlot,
          end_time: endTimeStr,
          total_duration: totalDuration,
          total_price: totalPrice,
          slotId: selectedSlot.id,
          serviceId: finalServiceId,
          source: 'share_link',
        };

        localStorage.setItem('pendingBooking', JSON.stringify(pendingBooking));
        localStorage.setItem('postLoginRedirect', '/booking/confirm');

        console.log('[BOOKING CONFIRM] Pending booking saved:', pendingBooking);

        // Show friendly toast and navigate to login
        toast.info(t('auth.loginToBook') || 'Please login to complete your booking');
        
        // Close modal and navigate to login
        onClose();
        if (onNavigateToLogin) {
          onNavigateToLogin();
        }
        
        return;
      }

      if (!selectedServices || selectedServices.length === 0) {
        toast.error('Please select a service');
        return;
      }

      // Try to find service UUID from barber.services (database-backed services)
      let finalServiceId: string | undefined;
      
      console.log('[BOOKING CONFIRM] Looking for service UUID:', {
        selectedServices,
        barberServices: barber.services,
        barberServicesCount: barber.services?.length || 0
      });

      if (barber.services && barber.services.length > 0) {
        const firstSelectedServiceName = selectedServices[0];
        const matchingService = barber.services.find(s => s.name === firstSelectedServiceName);
        
        if (matchingService && isValidUUID(matchingService.id)) {
          finalServiceId = matchingService.id;
          console.log('[BOOKING CONFIRM] ✅ Found service UUID:', finalServiceId);
        } else {
          console.log('[BOOKING CONFIRM] ⚠️ No valid UUID found for service:', firstSelectedServiceName);
        }
      } else {
        console.log('[BOOKING CONFIRM] ⚠️ Barber has no database-backed services');
      }

      // Parse the start time
      const [startHour, startMinute] = selectedTimeSlot.split(':');
      const endTime = new Date();
      endTime.setHours(parseInt(startHour), parseInt(startMinute) + totalDuration);
      const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

      // Determine if this is a guest booking
      const isGuest = !!guestInfo;
      
      const newBooking: Omit<Booking, 'id'> = {
        barberId: barber.id,
        customerId: isGuest ? 'guest' : customerId,
        customerName: isGuest ? guestInfo.name : customerName,
        serviceType: (mode === 'reschedule' && existingBooking) ? existingBooking.serviceType : selectedServices.join(' + '),
        date: selectedDate,
        startTime: selectedTimeSlot,
        endTime: endTimeStr,
        duration: totalDuration,
        price: totalPrice,
        status: 'confirmed',
        // REQUIRED: Use persisted slot_id
        slotId: selectedSlot.id,
        // OPTIONAL: Only include serviceId if valid UUID is found
        ...(finalServiceId ? { serviceId: finalServiceId } : {}),
        // Deprecated fields - kept for backward compatibility
        barberName: barber.name,
        barberAvatar: barber.avatar,
      };

      console.log('[BOOKING CONFIRM] Creating booking with payload:', {
        barberId: newBooking.barberId,
        customerId: newBooking.customerId,
        slotId: newBooking.slotId,
        serviceId: newBooking.serviceId,
        serviceType: newBooking.serviceType,
        isGuest
      });

      const bookingCode = generateBookingId();

      // Build booking payload
      const bookingPayload: any = {
        booking_code: bookingCode,
        barber_id: barber.id,
        slot_id: selectedSlot.id,
        service_type: selectedServices.join(' + '),
        date: selectedDate,
        start_time: selectedTimeSlot,
        end_time: endTimeStr,
        duration: totalDuration,
        price: totalPrice,
        source: isGuest ? 'guest' : 'online',
      };

      // Add service_id if available
      if (finalServiceId) {
        bookingPayload.service_id = finalServiceId;
      }

      // Add guest or customer info
      if (isGuest) {
        // Guest bookings use the same structure as manual bookings
        bookingPayload.guest_name = guestInfo.name;
        bookingPayload.guest_phone = guestInfo.phone;
        console.log('[BOOKING CONFIRM] Guest booking payload (will be saved as manual):', {
          guest_name: guestInfo.name,
          guest_phone: guestInfo.phone,
          source: 'guest'
        });
      } else {
        bookingPayload.customer_id = customerId;
        bookingPayload.customer_phone = customerName; // This might need to be adjusted
      }

      // Set loading state
      setBookingPending(true);

      try {
        // Call backend API to create booking
        let headers: any = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        };

        // Add session token for authenticated users
        if (!isGuest) {
          const sessionToken = localStorage.getItem('trimly_session_token');
          if (sessionToken) {
            headers['X-Session-Token'] = sessionToken;
          }
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/bookings`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(bookingPayload),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error('[BOOKING CREATE] API error:', data);
          throw new Error(data.error || 'Failed to create booking');
        }

        // Verify booking was created
        if (!data.booking || !data.booking.id) {
          throw new Error('Booking was not created - no booking ID returned');
        }

        console.log('✅ [BOOKING CONFIRM] Booking created successfully:', data.booking.id);

        // Notify parent to refresh bookings
        if (onBookingSuccess) {
          onBookingSuccess();
        }

        // For authenticated users, also call the legacy callback to update local state
        // For guest bookings, skip this since they don't have local state to update
        if (!isGuest) {
          onConfirmBooking(newBooking);
        }

        // Immediately refetch available slots from view to update UI
        console.log('[BOOKING CONFIRM] Refetching available slots after booking...');
        await fetchBarberSchedule();
        
        // Show success notification
        toast.success(mode === 'reschedule' ? t('booking.rescheduleSuccess') : t('booking.bookingSuccess'), {
          description: mode === 'reschedule' 
            ? t('booking.appointmentRescheduled')
            : `${t('booking.appointmentBooked')} ${barber.name}`,
          duration: 4000,
        });
        
        setCurrentStep('success');

        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 3000);
      } catch (error: any) {
        console.error('[BOOKING CONFIRM] Error creating booking:', error);
        toast.error(error.message || 'Failed to create booking. Please try again.');
      } finally {
        setBookingPending(false);
      }
    } catch (error) {
      console.error('[BOOKING CONFIRM] Error validating slot:', error);
      toast.error('Failed to validate time slot. Please try again.');
    }
  };

  // Available services - use fetched services from Supabase
  const availableServices = services;

  const steps = mode === 'reschedule' ? ['datetime', 'confirm'] : ['service', 'datetime', 'confirm'];

  const formatTimeRange = (start: string, duration: number) => {
    if (!start) return '';
    const [h, m] = start.split(':').map(Number);
    const end = new Date();
    end.setHours(h, m + duration);
    return `${start} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
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
              
              {/* Barber Info */}
              <div className="flex items-start gap-3 sm:gap-4 pr-10 sm:pr-12">
                <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-4 ring-primary/20 flex-shrink-0">
                  <AvatarImage src={barber.avatar} alt={barber.name} />
                  <AvatarFallback>{barber.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{barber.name}</h2>
                    {isBookAgain && (
                      <Badge variant="secondary" className="gap-1 text-xs hidden">
                        <Repeat className="w-3 h-3" />
                        {t('booking.bookAgain')}
                      </Badge>
                    )}
                    {mode === 'reschedule' && (
                      <Badge variant="secondary" className="gap-1 text-xs hidden">
                        <RefreshCw className="w-3 h-3" />
                        {t('booking.reschedule')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="gap-1 text-xs">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">
                        {barber.districts.map(d => translateDistrict(d, language)).join(', ')}
                      </span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Progress Steps - Horizontal Bars */}
              {currentStep !== 'success' && (
                <div className="flex items-center gap-2 mt-6">
                  {steps.map((step, index) => (
                    <div key={step} className="flex items-center flex-1">
                      <div
                        className={`h-1 flex-1 rounded-full transition-all ${
                          steps.indexOf(currentStep) >= index
                            ? 'bg-blue-400'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <CardContent className="p-4 sm:p-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Service Selection */}
                {currentStep === 'service' && (
                  <motion.div
                    key="service"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Loading State for Services */}
                    {servicesLoading && (
                      <div className="text-center py-12">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                        <p className="mt-4 text-gray-600">{t('common.loadingServices')}</p>
                      </div>
                    )}

                    {/* Error State for Services */}
                    {!servicesLoading && servicesError && (
                      <div className="text-center py-8 bg-red-50 rounded-xl border border-red-200">
                        <p className="text-red-600">{servicesError}</p>
                      </div>
                    )}

                    {/* Empty State - No Services */}
                    {!servicesLoading && !servicesError && availableServices.length === 0 && (
                      <div className="text-center py-12">
                        <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('booking.noServicesFound')}</h3>
                        <p className="text-gray-600">
                          {t('booking.noServicesYet')}
                        </p>
                      </div>
                    )}

                    {/* Services List */}
                    {!servicesLoading && !servicesError && availableServices.length > 0 && (
                      <>
                        <p className="text-sm text-gray-600 mb-4">
                          {t('booking.multipleServices')}
                        </p>
                        <div className="grid gap-3 max-h-96 overflow-y-auto bg-[rgba(0,0,0,0)]">
                          {availableServices.map((service) => {
                            const isSelected = selectedServices.includes(service.name);
                            const isDescriptionExpanded = expandedDescriptions.has(service.name);
                            const hasDescription = service.description && service.description.trim().length > 0;
                            
                            return (
                              <motion.button
                                key={service.name}
                                onClick={(e) => {
                                  // Prevent toggling selection if clicking the description button
                                  if ((e.target as HTMLElement).closest('.description-toggle')) {
                                    return;
                                  }
                                  
                                  if (isSelected) {
                                    // Deselecting
                                    setSelectedServices(prev => prev.filter(s => s !== service.name));
                                    // Clear selected service object if it was this one
                                    if (selectedServiceObj?.name === service.name) {
                                      setSelectedServiceObj(null);
                                    }
                                  } else {
                                    // Selecting
                                    setSelectedServices(prev => [...prev, service.name]);
                                    // Store the first selected service object
                                    if (!selectedServiceObj) {
                                      setSelectedServiceObj(service);
                                    }
                                  }
                                }}
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
                                        {formatPrice(service.price)} UZS
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
                                
                                {hasDescription && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedDescriptions(prev => {
                                          const newSet = new Set(prev);
                                          if (newSet.has(service.name)) {
                                            newSet.delete(service.name);
                                          } else {
                                            newSet.add(service.name);
                                          }
                                          return newSet;
                                        });
                                      }}
                                      className="description-toggle flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                    >
                                      <span className="text-[rgb(12,121,255)]">{isDescriptionExpanded ? t('booking.hideDescription') : t('booking.showDescription')}</span>
                                      <ChevronDown className={`w-3 h-3 transition-transform ${isDescriptionExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    <AnimatePresence>
                                      {isDescriptionExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="overflow-hidden"
                                        >
                                          <p className="text-sm text-gray-600 mt-2 pl-2 border-l-2 border-blue-200">
                                            {service.description}
                                          </p>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )}
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
                                  {formatPrice(totalPrice)} UZS
                                </div>
                                <div className="text-xs text-gray-600">
                                  {totalDuration} {t('booking.minutes')}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}

                {/* Step 2: Date & Time Selection */}
                {currentStep === 'datetime' && (
                  <motion.div
                    key="datetime"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Loading State */}
                    {slotsLoading && (
                      <div className="text-center py-12">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                        <p className="mt-4 text-gray-600">{t('common.loadingSlots')}</p>
                      </div>
                    )}

                    {/* Error State */}
                    {slotsError && (
                      <div className="text-center py-12">
                        <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('booking.errorLoadingSlots')}</h3>
                        <p className="text-gray-600 mb-4">
                          {slotsError}
                        </p>
                        <p className="text-sm text-gray-500">
                          {t('booking.checkBackLater')}
                        </p>
                      </div>
                    )}

                    {/* Empty State - No Slots */}
                    {!slotsLoading && !slotsError && barberSlots.length === 0 && (
                      <div className="text-center py-12">
                        <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('booking.noAvailableSlots')}</h3>
                        <p className="text-gray-600 mb-4">
                          {t('booking.barberNotSetupSchedule').replace('{barberName}', barber.name)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {t('booking.checkBackLaterOrContact')}
                        </p>
                      </div>
                    )}

                    {/* Date Selection */}
                    {!slotsLoading && !slotsError && availableDates.length > 0 && (
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
                    )}

                    {/* Time Selection */}
                    {selectedDate && timeSlots.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Label className="mb-3 block">{t('booking.selectTime')}</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                          {timeSlots.map((slot) => {
                            const isPast = isTimeSlotInPast(selectedDate, slot.time);
                            const isBooked = slot.isBooked || false;
                            const isDisabled = !slot.available || isPast || isBooked;
                            
                            // Use the slot object that's already included in the timeSlots array
                            const fullSlot = slot.slot || barberSlots.find(s => 
                              s.slot_date === selectedDate && 
                              s.start_time.substring(0, 5) === slot.time
                            );
                            
                            return (
                              <button
                                key={slot.time}
                                onClick={() => {
                                  // Only allow selection if slot is available, not booked, and not in the past
                                  if (!isDisabled && !isBooked && fullSlot) {
                                    setSelectedTimeSlot(slot.time);
                                    setSelectedSlot(fullSlot); // Store full slot object
                                  }
                                }}
                                disabled={isDisabled}
                                className={`p-3 rounded-2xl border transition-all ${
                                  selectedTimeSlot === slot.time
                                    ? 'border-[rgb(54,108,255)] bg-[rgb(54,108,255)]/10 shadow-sm'
                                    : isBooked
                                    ? 'border-red-200 bg-red-50 cursor-not-allowed'
                                    : isDisabled
                                    ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-40'
                                    : 'border-gray-200 bg-white hover:border-[rgb(54,108,255)]/40 hover:bg-blue-50/30'
                                }`}
                                title={isBooked ? t('schedule.booked') : isPast ? 'This time has already passed' : ''}
                              >
                                <div className={`text-sm font-medium text-center ${
                                  selectedTimeSlot === slot.time
                                    ? 'text-[rgb(54,108,255)]'
                                    : isBooked 
                                    ? 'text-red-600' 
                                    : 'text-gray-700'
                                }`}>
                                  {isBooked ? t('schedule.booked') : slot.time}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Empty State - No times for selected date */}
                    {selectedDate && timeSlots.length === 0 && !slotsLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-8 bg-gray-50 rounded-xl"
                      >
                        <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-600">{t('booking.noAvailableTimesForDate')}</p>
                        <p className="text-sm text-gray-500 mt-1">{t('booking.pleaseSelectAnotherDate')}</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Confirmation */}
                {currentStep === 'confirm' && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4 sm:space-y-6"
                  >
                    <h3 className="text-lg font-medium text-gray-900 mb-6">
                      {mode === 'reschedule' ? t('booking.confirmReschedule') : t('booking.confirmBooking')}
                    </h3>
                    
                    {mode === 'reschedule' && existingBooking && (
                      <div className="p-3 sm:p-4 rounded-xl bg-amber-50 border border-amber-200 mb-3 sm:mb-4">
                        <p className="text-xs sm:text-sm text-amber-800 mb-2 sm:mb-3">
                          {t('booking.moveAppointment')}
                        </p>
                        <div className="space-y-2 text-xs sm:text-sm">
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="text-red-600 flex-shrink-0">{t('booking.from')}</span>
                            <span className="line-through break-words">
                              {formatDateLong(existingBooking.date)}, {existingBooking.startTime} - {existingBooking.endTime}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="text-primary flex-shrink-0">{t('booking.to')}</span>
                            <span className="font-medium break-words">
                              {formatDateLong(selectedDate)}, {formatTimeRange(selectedTimeSlot, totalDuration)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Information Card */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5">
                      {/* Client Name */}
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-sm text-gray-500">{t('booking.clientName')}</span>
                        <span className="text-base text-gray-900 text-right font-normal">{customerName}</span>
                      </div>
                      
                      {/* Phone Number */}
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-sm text-gray-500">{t('booking.phoneNumber')}</span>
                        <span className="text-base text-gray-900 text-right font-normal">{barber.phone || '—'}</span>
                      </div>
                      
                      {/* Services */}
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-sm text-gray-500 flex-shrink-0">{t('booking.services')}</span>
                        <span className="text-base text-gray-900 text-right font-normal break-words">{selectedServices.join(', ')}</span>
                      </div>
                      
                      {/* Date */}
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-sm text-gray-500">{t('booking.date')}</span>
                        <span className="text-base text-gray-900 text-right font-normal">{formatDateLong(selectedDate)}</span>
                      </div>
                      
                      {/* Time */}
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-sm text-gray-500">{t('booking.time')}</span>
                        <span className="text-base text-gray-900 text-right font-normal">{formatTimeRange(selectedTimeSlot, totalDuration)}</span>
                      </div>
                      
                      {/* Duration */}
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-sm text-gray-500">{t('booking.duration')}</span>
                        <span className="text-base text-gray-900 text-right font-normal">{totalDuration} {t('booking.minutes')}</span>
                      </div>
                      
                      {/* Divider before total */}
                      <div className="h-px bg-gray-100 my-4"></div>
                      
                      {/* Total Price */}
                      <div className="flex justify-between items-center gap-4 pt-1">
                        <span className="text-base text-gray-900 font-medium">{t('booking.total')}</span>
                        <span className="text-2xl font-semibold text-[rgb(54,108,255)]">{formatPrice(totalPrice)} UZS</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Success */}
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
                      transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                      className="w-20 h-20 mx-auto mb-6 rounded-full check-circle flex items-center justify-center"
                    >
                      <Check className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-xl font-semibold mb-2 text-gray-900">
                      {mode === 'reschedule' ? t('booking.rescheduledTitle') : t('booking.bookingConfirmedTitle')}
                    </h2>
                    <p className="text-gray-700 mb-6 font-medium">
                      {mode === 'reschedule' 
                        ? t('booking.appointmentRescheduled')
                        : `${barber.name} ${t('booking.appointmentBooked')}`
                      }
                    </p>
                    <div className="relative p-5 rounded-xl bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-blue-50/90 border border-blue-200/60 mb-6 shadow-sm backdrop-blur-sm">
                      {/* Subtle solid overlay for better text contrast */}
                      <div className="absolute inset-0 bg-white/30 rounded-xl pointer-events-none"></div>
                      
                      {/* Content with improved contrast */}
                      <div className="relative space-y-2">
                        <p className="text-sm text-gray-800 font-medium">
                          📧 {t('booking.confirmationSent')}
                        </p>
                        <p className="text-sm text-gray-800 font-medium">
                          🔔 {barber.name} {t('booking.barberNotified')} {mode === 'reschedule' ? t('booking.change') : t('customer.bookNow').toLowerCase()}
                        </p>
                        {mode === 'reschedule' && (
                          <p className="text-sm text-gray-800 font-medium">
                            ✅ {t('booking.oldSlotAvailable')}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('booking.closingAutomatic')}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              {currentStep !== 'success' && (
                <div className="flex flex-col-reverse sm:flex-row items-center gap-3 mt-6 sm:mt-8">
                  {/* Back Button */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (currentStep === 'service' || (mode === 'reschedule' && currentStep === 'datetime')) {
                        onClose();
                      } else {
                        handleBack();
                      }
                    }}
                    className="w-full sm:flex-1 h-12 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    {t('common.back')}
                  </Button>

                  {/* Next/Confirm Button */}
                  <Button 
                    onClick={handleNext}
                    disabled={bookingPending}
                    className="w-full sm:flex-1 h-12 rounded-full bg-gradient-to-r from-[rgb(54,108,255)] to-blue-500 hover:from-[rgb(44,98,245)] hover:to-blue-600 text-white font-medium shadow-lg shadow-blue-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                        <span className="truncate">{t('booking.creatingBooking') || 'Processing...'}</span>
                      </div>
                    ) : (
                      <>
                        {currentStep === 'confirm'
                          ? (mode === 'reschedule' ? t('booking.confirmReschedule') : t('booking.confirmBooking'))
                          : t('common.next')
                        }
                        {currentStep !== 'confirm' && <ChevronRight className="w-4 h-4 ml-1" />}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}