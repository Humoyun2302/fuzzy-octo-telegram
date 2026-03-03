import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Plus, Trash2, Edit, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  booked?: boolean;
}

interface DaySchedule {
  day: string;
  date: string;
  isOff: boolean;
  slots: TimeSlot[];
  workingDayManuallySet?: boolean; // Track if working day was manually set
}

const DAYS_PER_PAGE = 8;

const SkeletonItem = ({ className }: { className?: string }) => (
  <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={{ 
        repeat: Infinity, 
        duration: 1.5, 
        ease: "linear",
        repeatDelay: 0.5 
      }}
    />
  </div>
);

interface ScheduleCalendarProps {
  barberId?: string;
  refreshTrigger?: number;
}

export function ScheduleCalendar({ barberId: propBarberId, refreshTrigger }: ScheduleCalendarProps = {}) {
  const { t } = useLanguage();
  
  // Get barberId from prop or derive from KV auth session
  const [barberId, setBarberId] = useState<string | null>(propBarberId || null);
  
  // If barberId not passed as prop, get from KV session (verify-session endpoint)
  useEffect(() => {
    if (propBarberId) {
      console.log('[SLOTS] Using barberId from prop:', propBarberId);
      setBarberId(propBarberId);
      return;
    }
    
    const getBarberId = async () => {
      const sessionToken = localStorage.getItem('trimly_session_token');
      if (!sessionToken) {
        console.error('[SLOTS] No session token found');
        return;
      }
      
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/auth/verify-session`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ sessionToken }),
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.valid && data.userId && data.role === 'barber') {
            console.log('[SLOTS] Got barberId from session:', data.userId);
            setBarberId(data.userId);
          }
        }
      } catch (e) {
        console.error('[SLOTS] Failed to get barberId from session:', e);
      }
    };
    
    getBarberId();
  }, [propBarberId]);

  const getTranslatedDayName = (dayIndex: number, pageIdx: number): string => {
    // Calculate the actual date for this day
    const windowStart = getPageStartDate(pageIdx);
    const targetDate = new Date(windowStart);
    targetDate.setDate(windowStart.getDate() + dayIndex);
    
    // Get the actual day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const jsDay = targetDate.getDay();
    
    // Convert to our day keys (0=Monday, 1=Tuesday, ..., 6=Sunday)
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return t(`schedule.${dayKeys[jsDay]}`);
  };

  const getDateStringForPage = (dayIndex: number, pageIdx: number): string => {
    const windowStart = getPageStartDate(pageIdx);
    const targetDate = new Date(windowStart);
    targetDate.setDate(windowStart.getDate() + dayIndex);
    const monthNames = t('common.months.short') as any;
    const monthIndex = targetDate.getMonth();
    const day = targetDate.getDate();
    return `${monthNames[monthIndex]} ${day}`;
  };

  // Helper to get the actual date for a day index in YYYY-MM-DD format
  const getActualDate = (dayIndex: number, pageIdx: number): string => {
    const windowStart = getPageStartDate(pageIdx);
    const targetDate = new Date(windowStart);
    targetDate.setDate(windowStart.getDate() + dayIndex);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to normalize time to HH:MM:SS format
  const normalizeTime = (time: string): string => {
    const parts = time.split(':');
    const hours = parts[0].padStart(2, '0');
    const minutes = (parts[1] || '00').padStart(2, '0');
    const seconds = (parts[2] || '00').padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{ dayIndex: number; slotId: string } | null>(null);
  const [editingTime, setEditingTime] = useState('09:00');
  
  // Flag to pause automatic reloads during manual editing
  const [pauseAutoReload, setPauseAutoReload] = useState(false);
  
  const [recommendedStep] = useState(30);

  // Time picker modal state for first slot
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [timePickerDayIndex, setTimePickerDayIndex] = useState<number | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState('');

  // Quick setup state
  const [quickSetupFromTime, setQuickSetupFromTime] = useState('09:00');
  const [quickSetupToTime, setQuickSetupToTime] = useState('22:00');
  const [quickSetupDuration, setQuickSetupDuration] = useState(30);
  const [quickSetupError, setQuickSetupError] = useState('');
  const [showQuickSetupConfirmModal, setShowQuickSetupConfirmModal] = useState(false);
  const [isQuickSetupProcessing, setIsQuickSetupProcessing] = useState(false);

  // Page pagination state (0 = first 8 days, 1 = next 8 days, etc.)
  const [pageIndex, setPageIndex] = useState(0);
  const MAX_PAGES = 3; // Limit to 3 pages (24 days total)

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Load barber availability from database
  useEffect(() => {
    const loadAvailability = async () => {
      if (!barberId) return;
      
      try {
        const { data, error } = await supabase
          .from('barbers')
          .select('is_available')
          .eq('id', barberId)
          .single();
        
        if (error) {
          console.error('[AVAILABILITY] Error loading availability:', error);
          return;
        }
        
        // Set unavailable to the opposite of is_available (for backward compatibility with the switch logic)
        setUnavailable(data?.is_available === false);
        console.log('[AVAILABILITY] Loaded from database:', { is_available: data?.is_available, unavailable: data?.is_available === false });
      } catch (err) {
        console.error('[AVAILABILITY] Exception loading availability:', err);
      }
    };
    
    loadAvailability();
  }, [barberId]);

  // Handle availability toggle
  const handleAvailabilityToggle = async (checked: boolean) => {
    if (!barberId) {
      toast.error('Unable to update availability');
      return;
    }

    const newAvailability = !checked; // Switch is "unavailable", so flip it for is_available
    
    console.log('[AVAILABILITY] Toggle clicked:', { 
      checked, 
      newAvailability, 
      barberId,
      meaning: checked ? 'Marking as UNAVAILABLE (hidden)' : 'Marking as AVAILABLE (visible)'
    });
    
    try {
      const { error } = await supabase
        .from('barbers')
        .update({ is_available: newAvailability })
        .eq('id', barberId);

      if (error) {
        console.error('[AVAILABILITY] Error updating availability:', error);
        toast.error(t('toast.availabilityUpdateFailed') || 'Failed to update availability');
        return;
      }

      setUnavailable(checked);
      
      console.log('[AVAILABILITY] ✅ Successfully updated database:', {
        barberId,
        is_available: newAvailability,
        unavailable: checked,
        message: checked ? 'Barber is now HIDDEN from customers' : 'Barber is now VISIBLE to customers'
      });
      
      toast.success(
        checked 
          ? (t('schedule.nowUnavailable') || 'You are now hidden from customers')
          : (t('schedule.nowAvailable') || 'You are now visible to customers')
      );
      
      console.log('[AVAILABILITY] Updated successfully:', { is_available: newAvailability, unavailable: checked });
    } catch (err) {
      console.error('[AVAILABILITY] Exception updating availability:', err);
      toast.error(t('toast.availabilityUpdateFailed') || 'Failed to update availability');
    }
  };

  // Helper to get page start date based on pageIndex (FROM TODAY, not Monday)
  const getPageStartDate = (pageIdx: number): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const windowStart = new Date(today);
    windowStart.setDate(today.getDate() + (pageIdx * DAYS_PER_PAGE));
    return windowStart;
  };

  // Load slots from Supabase public.barber_slots table
  const loadSlots = async (isBackgroundRefresh = false) => {
    if (!barberId) {
      console.log('[SLOTS] barberId is null, skipping load');
      if (!isBackgroundRefresh) setIsLoading(false);
      return;
    }

    if (!isBackgroundRefresh) {
      setIsLoading(true);
      
      // Only show skeleton if loading takes longer than 800ms
      const skeletonTimer = setTimeout(() => {
        setShowSkeleton(true);
      }, 800);
      
      // Store the timer so we can clear it if loading finishes quickly
      (window as any).__skeletonTimer = skeletonTimer;
    }

    console.log('[SLOTS] Loading slots for barberId:', barberId);

    try {
      // Get current page's date range
      const windowStart = getPageStartDate(pageIndex);
      const windowEnd = new Date(windowStart);
      windowEnd.setDate(windowStart.getDate() + (DAYS_PER_PAGE - 1));

      const startStr = `${windowStart.getFullYear()}-${String(windowStart.getMonth() + 1).padStart(2, '0')}-${String(windowStart.getDate()).padStart(2, '0')}`;
      const endStr = `${windowEnd.getFullYear()}-${String(windowEnd.getMonth() + 1).padStart(2, '0')}-${String(windowEnd.getDate()).padStart(2, '0')}`;

      console.log('[SLOTS] Fetching slots for page:', { startStr, endStr, barberId });

      // Get KV session token from localStorage
      const sessionToken = localStorage.getItem('trimly_session_token');
      if (!sessionToken) {
        console.error('[SLOTS] No active session found');
        toast.error('Please login to view schedule');
        if (!isBackgroundRefresh) {
          clearTimeout((window as any).__skeletonTimer);
          setIsLoading(false);
          setShowSkeleton(false);
        }
        return;
      }

      // CRITICAL: Fetch ALL slots (including booked) from backend API
      // Backend uses service role to bypass RLS, ensuring booked slots are included
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/barber/slots?start_date=${startStr}&end_date=${endStr}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'x-session-token': sessionToken,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[SLOTS] API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch slots');
      }

      const result = await response.json();
      const data = result.slots || [];

      console.log('[SLOTS] Fetched rows count:', data?.length || 0);
      console.log('[SLOTS] Fetched slots:', data);

      // Load working day states from KV store
      const workingDaysKey = `working_days_${barberId}`;
      let workingDaysData: Record<string, boolean> = {};
      
      try {
        const kvResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/kv/${workingDaysKey}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'x-session-token': sessionToken,
            },
          }
        );
        
        if (kvResponse.ok) {
          const kvResult = await kvResponse.json();
          if (kvResult.value) {
            workingDaysData = JSON.parse(kvResult.value);
            console.log('[WORKING DAYS] Loaded from KV:', workingDaysData);
          }
        }
      } catch (e) {
        console.log('[WORKING DAYS] No stored data, using defaults');
      }

      // Initialize empty schedule for DAYS_PER_PAGE days
      // DO NOT derive isOff from slots - use stored working day state
      const newSchedule: DaySchedule[] = Array.from({ length: DAYS_PER_PAGE }, (_, idx) => {
        const dateStr = getActualDate(idx, pageIndex);
        // Default to true (day off) if not explicitly set as working day
        const isWorkingDay = workingDaysData[dateStr] === true;
        
        return {
          day: '',
          date: dateStr,
          isOff: !isWorkingDay, // isOff is the opposite of working day
          slots: []
        };
      });

      if (data && data.length > 0) {
        console.log('[SLOTS] ✅ Fetched', data.length, 'slots from database');
        console.log('[SLOTS] All fetched slots:', data);
        
        data.forEach((slot: any) => {
          // Convert slot_date to day index (0 to DAYS_PER_PAGE-1 for the window)
          const slotDate = new Date(slot.slot_date + 'T00:00:00');
          const daysDiff = Math.floor((slotDate.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0 && daysDiff < DAYS_PER_PAGE) {
            const dayIndex = daysDiff;
            const formattedTime = slot.start_time.slice(0, 5); // HH:MM
            
            // SINGLE SOURCE OF TRUTH: Use is_booked column (boolean TRUE/FALSE)
            const isBooked = slot.is_booked === true;
            
            console.log('[SLOT PROCESSING]', {
              id: slot.id,
              time: formattedTime,
              date: slot.slot_date,
              is_booked: slot.is_booked,
              isBooked: isBooked,
              will_show: isBooked ? '🔴 RED (Booked)' : '🟢 GREEN (Available)',
              all_fields: slot
            });
            
            newSchedule[dayIndex].slots.push({
              id: slot.id,
              time: formattedTime,
              available: !isBooked, // Available if not booked
              booked: isBooked
            });
            // DO NOT change isOff based on slots
          }
        });

        // Sort slots for each day
        newSchedule.forEach(day => {
          day.slots.sort((a, b) => {
            const timeA = a.time.split(':').map(Number);
            const timeB = b.time.split(':').map(Number);
            return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
          });
        });
        
        console.log('[SLOTS] ✅ Final schedule with ALL slots:', newSchedule.map((day, idx) => ({
          day: idx,
          date: day.date,
          isOff: day.isOff,
          slotCount: day.slots.length,
          slots: day.slots.map(s => ({ time: s.time, booked: s.booked }))
        })));
      }
      
      setWeekSchedule(newSchedule);
      console.log('[SLOTS] Schedule loaded successfully');
    } catch (e) {
      console.error('[SLOTS] Error fetching schedule:', e);
      toast.error("Failed to load schedule");
    } finally {
      if (!isBackgroundRefresh) {
        // Clear the skeleton timer if it hasn't fired yet
        clearTimeout((window as any).__skeletonTimer);
        
        // If skeleton was shown, add a small delay for smoother transition
        if (showSkeleton) {
          setTimeout(() => {
            setIsLoading(false);
            setShowSkeleton(false);
          }, 300);
        } else {
          // If loading was fast, just hide immediately
          setIsLoading(false);
          setShowSkeleton(false);
        }
      }
    }
  };

  // Listen for refreshTrigger changes to reload slots
  useEffect(() => {
    if (refreshTrigger !== undefined && barberId) {
      console.log('[SLOTS] Refresh trigger received, reloading slots...');
      loadSlots(true);
    }
  }, [refreshTrigger, barberId]);

  // Realtime subscription for slots updates (bookings, status changes)
  useEffect(() => {
    if (!barberId) return;

    console.log('[SLOTS] 🔴 Setting up realtime subscription for barber_slots...');
    const channel = supabase
      .channel(`barber-slots-updates-${barberId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barber_slots',
          filter: `barber_id=eq.${barberId}`
        },
        (payload) => {
          console.log('[SLOTS] 🔴 Realtime UPDATE received:', payload);
          // Skip reload if we're currently editing to prevent conflicts
          if (pauseAutoReload) {
            console.log('[SLOTS] ⏸️  Skipping reload - editing in progress');
            return;
          }
          // Reload slots immediately when a slot is updated (e.g. booked)
          loadSlots(true);
        }
      )
      .subscribe((status) => {
        console.log('[SLOTS] 🔴 Subscription status:', status);
      });

    return () => {
      console.log('[SLOTS] 🔴 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [barberId, pauseAutoReload]);

  // Load slots when barberId becomes available or pageIndex changes
  useEffect(() => {
    if (barberId) {
      console.log('[SLOTS] barberId available or pageIndex changed, loading slots');
      // Initial load with skeleton
      loadSlots(false);
      
      // Set up polling to refresh slots every 5 seconds to catch bookings/cancellations
      const pollInterval = setInterval(() => {
        // Skip polling if we're currently editing to prevent conflicts
        if (pauseAutoReload) {
          console.log('[SLOTS] ⏸️  Skipping poll - editing in progress');
          return;
        }
        console.log('[SLOTS] Polling for slot updates...');
        loadSlots(true); // Background refresh
      }, 5000);
      
      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [barberId, pageIndex]); // Removed pauseAutoReload from dependencies to prevent reload on edit

  const toggleDayOff = async (dayIndex: number) => {
    const currentDay = weekSchedule[dayIndex];
    const newIsOff = !currentDay.isOff;
    const slotDate = getActualDate(dayIndex, pageIndex);

    if (newIsOff) {
       // If turning OFF, delete all slots for this day
       try {
         const { error } = await supabase
           .from('barber_slots')
           .delete()
           .eq('barber_id', barberId)
           .eq('slot_date', slotDate);

         if (error) throw error;
         
         // Update working day state in KV store
         await updateWorkingDayState(slotDate, false);
         
         // Update local state
         setWeekSchedule(prev => prev.map((day, idx) => 
           idx === dayIndex ? { ...day, isOff: true, slots: [] } : day
         ));

         const dayName = getTranslatedDayName(dayIndex, pageIndex);
         toast.success(t('schedule.markedAsOff').replace('{day}', dayName));
       } catch (e) {
         console.error("Error clearing day schedule", e);
         toast.error("Failed to update schedule");
       }
    } else {
       // If turning ON, update working day state and local state
       try {
         // Update working day state in KV store
         await updateWorkingDayState(slotDate, true);
         
         // Update local state (no slots yet)
         setWeekSchedule(prev => prev.map((day, idx) => 
           idx === dayIndex ? { ...day, isOff: false } : day
         ));
         const dayName = getTranslatedDayName(dayIndex, pageIndex);
         toast.success(t('schedule.markedAsWorking').replace('{day}', dayName));
       } catch (e) {
         console.error("Error setting working day", e);
         toast.error("Failed to update schedule");
       }
    }
  };

  // Helper to update working day state in KV store
  const updateWorkingDayState = async (date: string, isWorkingDay: boolean) => {
    const sessionToken = localStorage.getItem('trimly_session_token');
    if (!sessionToken) {
      console.error('[WORKING DAY] No session token');
      return;
    }

    const workingDaysKey = `working_days_${barberId}`;
    
    try {
      // Get current working days data
      const kvGetResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/kv/${workingDaysKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'x-session-token': sessionToken,
          },
        }
      );
      
      let workingDaysData: Record<string, boolean> = {};
      if (kvGetResponse.ok) {
        const kvResult = await kvGetResponse.json();
        if (kvResult.value) {
          workingDaysData = JSON.parse(kvResult.value);
        }
      }
      
      // Update the specific date
      if (isWorkingDay) {
        workingDaysData[date] = true;
      } else {
        // Remove from working days (or set to false)
        delete workingDaysData[date];
      }
      
      // Save back to KV store
      const kvSetResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/kv/${workingDaysKey}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'x-session-token': sessionToken,
          },
          body: JSON.stringify({ value: JSON.stringify(workingDaysData) }),
        }
      );
      
      if (!kvSetResponse.ok) {
        console.error('[WORKING DAY] Failed to save to KV store');
      } else {
        console.log('[WORKING DAY] ✅ Saved to KV store:', { date, isWorkingDay });
      }
    } catch (e) {
      console.error('[WORKING DAY] Error updating KV store:', e);
    }
  };

  const isDuplicateTime = (dayIndex: number, time: string, excludeSlotId?: string): boolean => {
    return weekSchedule[dayIndex]?.slots.some(
      (slot) => slot.time === time && slot.id !== excludeSlotId
    ) || false;
  };

  const openAddSlotDialog = async (dayIndex: number) => {
    // Get the actual date for this day
    const slotDate = getActualDate(dayIndex, pageIndex);
    
    // Check if the day has existing slots
    const existingSlotsForDay = weekSchedule[dayIndex]?.slots || [];
    
    if (existingSlotsForDay.length === 0) {
      // NO SLOTS: Show time picker modal
      console.log('[ADD SLOT] No existing slots for this day, showing time picker modal');
      
      // Set default time to current time (HH:MM format)
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      setSelectedStartTime(currentTime);
      setTimePickerDayIndex(dayIndex);
      setShowTimePickerModal(true);
      return;
    }
    
    // HAS SLOTS: Auto-add next slot at (latest + 30 minutes)
    try {
      // Query database directly for the latest existing slot for this barber and date
      const { data: latestSlots, error } = await supabase
        .from('barber_slots')
        .select('start_time')
        .eq('barber_id', barberId)
        .eq('slot_date', slotDate)
        .order('start_time', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Error fetching latest slot:', error);
        toast.error('Failed to load slots');
        return;
      }

      if (latestSlots && latestSlots.length > 0) {
        // Found the latest slot, add 30 minutes to it
        const lastSlot = latestSlots[0];
        const [hours, minutes] = lastSlot.start_time.split(':').map(Number);
        
        // Add 30 minutes to the last slot time
        const totalMinutes = hours * 60 + minutes + 30;
        const newHours = Math.floor(totalMinutes / 60);
        const newMinutes = totalMinutes % 60;
        
        // Format as HH:MM
        const nextTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
        
        console.log('[ADD SLOT] Latest slot found:', lastSlot.start_time, '→ Next time:', nextTime);
        
        // Check for duplicate before adding
        if (isDuplicateTime(dayIndex, nextTime)) {
          toast.error('This time slot already exists');
          return;
        }
        
        // Instantly create the slot
        await instantAddTimeSlot(dayIndex, nextTime);
      }
    } catch (e) {
      console.error('❌ Error in openAddSlotDialog:', e);
      toast.error('Failed to add slot');
    }
  };

  const instantAddTimeSlot = async (dayIndex: number, slotTime: string) => {
    // Local utility to calculate end time (start + 60 minutes for slot duration)
    const calculateEndTime = (startTime: string): string => {
      const [h, m] = startTime.split(':').map(Number);
      const totalMinutes = h * 60 + m + 60; // 60 min duration
      const newHours = Math.floor(totalMinutes / 60) % 24;
      const newMinutes = totalMinutes % 60;
      return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    };

    // Frontend validation: Prevent adding slots in the past
    const slotDate = getActualDate(dayIndex, pageIndex);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDate = new Date(slotDate + 'T00:00:00');
    
    console.log('[ADD SLOT] Starting add slot process:', {
      dayIndex,
      slotTime,
      slotDate,
      barberId
    });
    
    // Check if slot date is in the past
    if (selectedDate < today) {
      console.log('[ADD SLOT] ❌ Date is in the past');
      toast.error('Cannot add slots in the past');
      return;
    }
    
    // If slot date is today, check if time has passed
    if (selectedDate.getTime() === today.getTime()) {
      const [slotHour, slotMin] = slotTime.split(':').map(Number);
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
      // Get KV session token from localStorage
      const sessionToken = localStorage.getItem('trimly_session_token');
      if (!sessionToken) {
        console.error('❌ No active session found');
        toast.error('Please login to add slots');
        return;
      }

      console.log('[ADD SLOT] Session token found:', sessionToken.substring(0, 20) + '...');

      // Calculate times
      const startTime = normalizeTime(slotTime);
      const endTime = normalizeTime(calculateEndTime(slotTime));

      const payload = {
        slot_date: slotDate,
        start_time: startTime,
        end_time: endTime,
        is_available: true
      };

      console.log('[ADD SLOT] Sending request to backend:', payload);

      // Call backend API with KV session token
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
        
        // Show user-friendly error messages
        if (response.status === 401) {
          toast.error('Session expired. Please login again.');
        } else if (response.status === 403) {
          toast.error('Only barbers can create slots');
        } else if (result.error) {
          toast.error(`Failed to add slot: ${result.error}`);
        } else {
          toast.error('Failed to add slot. Please try again.');
        }
        return;
      }

      console.log('✅ Slot added successfully');
      toast.success(t('schedule.slotAddedSuccess'));

      // Re-fetch slots from Supabase to update UI
      await loadSlots();
    } catch (e: any) {
      console.error('❌ Error adding slot:', e?.message || e);
    }
  };

  const removeTimeSlot = async (dayIndex: number, slotId: string) => {
    try {
      // Get KV session token from localStorage
      const sessionToken = localStorage.getItem('trimly_session_token');
      if (!sessionToken) {
        console.error('❌ No active session found');
        toast.error('Please login to delete slots');
        return;
      }

      console.log('[DELETE SLOT] Attempting to delete slot:', { slotId });

      // Call backend API to delete slot (uses service role, bypasses RLS)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/barber/slots/${slotId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': sessionToken,
          },
        }
      );

      const result = await response.json();

      console.log('[DELETE SLOT] Backend response:', { result, status: response.status });

      if (!response.ok) {
        console.error('❌ DELETE SLOT ERROR:', result);
        throw new Error(result.error || result.details || 'Failed to delete slot');
      }

      console.log('✅ Slot deleted successfully from database');

      // Update local state immediately (optimistic UI)
      setWeekSchedule(prev => prev.map((day, idx) =>
          idx === dayIndex
            ? { ...day, slots: day.slots.filter((slot) => slot.id !== slotId) }
            : day
      ));
      
      toast.success(t('toast.timeSlotRemoved'));

      // Re-fetch slots from Supabase to ensure UI stays in sync
      console.log('[DELETE SLOT] Re-fetching slots from database after delete');
      await loadSlots();
    } catch (e: any) {
      console.error('❌ Error removing slot:', e);
      console.error('❌ Error details:', {
        message: e?.message,
        stack: e?.stack
      });
      toast.error('Failed to delete slot');
    }
  };

  const startEditingSlot = (dayIndex: number, slotId: string, time: string) => {
    setEditingSlot({ dayIndex, slotId });
    setEditingTime(time);
    setPauseAutoReload(true);
  };

  const cancelEditingSlot = () => {
    setEditingSlot(null);
    setEditingTime('09:00');
    setPauseAutoReload(false);
  };

  const saveTimeSlot = async () => {
    if (!editingSlot) return;
    if (isDuplicateTime(editingSlot.dayIndex, editingTime, editingSlot.slotId)) {
      toast.error(t('toast.duplicateTimeError'));
      return;
    }

    try {
      console.log('[EDIT SLOT] 🔧 Saving slot edit:', { slotId: editingSlot.slotId, newTime: editingTime });
      
      // Calculate end time (start + 60 minutes)
      const [h, m] = editingTime.split(':').map(Number);
      const totalMinutes = h * 60 + m + 60;
      const newHours = Math.floor(totalMinutes / 60) % 24;
      const newMinutes = totalMinutes % 60;
      const endTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
      
      console.log('[EDIT SLOT] 💾 Updating via backend API...', { start: editingTime, end: endTime });
      
      // Get KV session token from localStorage
      const sessionToken = localStorage.getItem('trimly_session_token');
      if (!sessionToken) {
        console.error('[EDIT SLOT] ❌ No active session found');
        toast.error('Please login to edit slots');
        setPauseAutoReload(false);
        return;
      }

      // Update via backend API (uses service role to bypass RLS)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/barber/slots/${editingSlot.slotId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': sessionToken,
          },
          body: JSON.stringify({
            start_time: editingTime,
            end_time: endTime
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        console.error('[EDIT SLOT] ❌ Backend API error:', result);
        throw new Error(result.error || 'Failed to update slot');
      }

      const result = await response.json();
      console.log('[EDIT SLOT] ✅ Backend API updated successfully:', result);

      // Immediately update local state to reflect the change
      setWeekSchedule(prev => prev.map((day, idx) =>
          idx === editingSlot.dayIndex
            ? {
                ...day,
                slots: day.slots.map((slot) =>
                  slot.id === editingSlot.slotId
                    ? { ...slot, time: editingTime }
                    : slot
                ).sort((a, b) => a.time.localeCompare(b.time)),
              }
            : day
      ));
      
      console.log('[EDIT SLOT] 🎨 Local state updated');
      
      toast.success(t('toast.timeSlotUpdated'));
      cancelEditingSlot(); // This will unpause auto-reload
      
      console.log('[EDIT SLOT] ✅ Edit complete - auto-reload resumed');
    } catch (e: any) {
      console.error('[EDIT SLOT] ❌ Error updating slot:', e);
      toast.error(e.message || "Failed to update time slot");
      setPauseAutoReload(false); // Unpause on error too
    }
  };

  // Handle time picker modal confirmation
  const handleTimePickerConfirm = async () => {
    if (!selectedStartTime || timePickerDayIndex === null) {
      toast.error('Please select a time');
      return;
    }

    // Check for duplicate
    if (isDuplicateTime(timePickerDayIndex, selectedStartTime)) {
      toast.error('This time slot already exists');
      return;
    }

    // Close modal
    setShowTimePickerModal(false);

    // Create the slot
    await instantAddTimeSlot(timePickerDayIndex, selectedStartTime);

    // Reset state
    setTimePickerDayIndex(null);
    setSelectedStartTime('');
  };

  const handleTimePickerCancel = () => {
    setShowTimePickerModal(false);
    setTimePickerDayIndex(null);
    setSelectedStartTime('');
  };

  // Quick Setup: Validate inputs
  const validateQuickSetup = (): boolean => {
    setQuickSetupError('');
    
    // Parse times
    const [fromH, fromM] = quickSetupFromTime.split(':').map(Number);
    const [toH, toM] = quickSetupToTime.split(':').map(Number);
    
    const fromMinutes = fromH * 60 + fromM;
    const toMinutes = toH * 60 + toM;
    
    // From must be before To
    if (fromMinutes >= toMinutes) {
      setQuickSetupError('Start time must be earlier than end time');
      return false;
    }
    
    // Duration must be valid
    if (quickSetupDuration <= 0) {
      setQuickSetupError('Duration must be greater than 0');
      return false;
    }
    
    return true;
  };

  // Quick Setup: Generate time slots
  const generateTimeSlots = (): string[] => {
    console.log('[GENERATE] Input params:', {
      fromTime: quickSetupFromTime,
      toTime: quickSetupToTime,
      duration: quickSetupDuration
    });
    
    const slots: string[] = [];
    const [fromH, fromM] = quickSetupFromTime.split(':').map(Number);
    const [toH, toM] = quickSetupToTime.split(':').map(Number);
    
    const fromMinutes = fromH * 60 + fromM;
    const toMinutes = toH * 60 + toM;
    
    console.log('[GENERATE] Calculated:', {
      fromMinutes,
      toMinutes,
      totalMinutes: toMinutes - fromMinutes,
      expectedSlots: Math.floor((toMinutes - fromMinutes) / quickSetupDuration)
    });
    
    let currentMinutes = fromMinutes;
    
    // Generate slots: Keep generating while (start_time + duration) <= end_time
    // This ensures the last slot's END time doesn't exceed the end_time
    while (currentMinutes + quickSetupDuration <= toMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      slots.push(timeStr);
      currentMinutes += quickSetupDuration;
    }
    
    console.log('[GENERATE] Generated slots:', slots);
    console.log('[GENERATE] Total generated:', slots.length);
    
    return slots;
  };

  // Quick Setup: Check if any slots exist
  const hasExistingSlots = (): boolean => {
    return weekSchedule.some(day => day.slots.length > 0);
  };

  // Quick Setup: Handle "Set up" button
  const handleQuickSetup = () => {
    if (!validateQuickSetup()) {
      return;
    }
    
    // Check if there are existing slots
    if (hasExistingSlots()) {
      // Show confirmation modal
      setShowQuickSetupConfirmModal(true);
    } else {
      // No existing slots, proceed directly
      executeQuickSetup();
    }
  };

  // Quick Setup: Execute the auto-generation
  const executeQuickSetup = async () => {
    setShowQuickSetupConfirmModal(false);
    setIsQuickSetupProcessing(true);
    
    try {
      const sessionToken = localStorage.getItem('trimly_session_token');
      if (!sessionToken) {
        toast.error('Please login to setup slots');
        setIsQuickSetupProcessing(false);
        return;
      }

      const startTime = Date.now();
      
      // STEP 1: Log current input values
      console.log('[QUICK SETUP] ===== STARTING OPTIMIZED BATCH SETUP =====');
      console.log('[QUICK SETUP] Input values:', {
        from: quickSetupFromTime,
        to: quickSetupToTime,
        duration: quickSetupDuration,
        barberId: barberId
      });

      // STEP 2: Generate the slot times using current input values
      const slotTimes = generateTimeSlots();
      
      console.log('[QUICK SETUP] Generated slot times:', slotTimes);
      console.log('[QUICK SETUP] Total slots per day:', slotTimes.length);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // STEP 3: GENERATE ALL SLOTS IN MEMORY (for all 7 days)
      console.log('[QUICK SETUP] 📦 Generating all slots in memory...');
      const allSlotsToInsert: any[] = [];
      const workingDayUpdates: string[] = [];

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + dayOffset);
        
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        workingDayUpdates.push(dateStr);

        // Generate slots for this day
        for (const slotTime of slotTimes) {
          const [h, m] = slotTime.split(':').map(Number);
          
          // Skip if time has passed for today (dayOffset === 0)
          if (dayOffset === 0) {
            const slotMinutes = h * 60 + m;
            if (slotMinutes <= currentMinutes) {
              continue; // Skip past times
            }
          }

          // Calculate end time using the selected duration
          const endMinutes = h * 60 + m + quickSetupDuration;
          const endH = Math.floor(endMinutes / 60) % 24;
          const endM = endMinutes % 60;
          const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

          allSlotsToInsert.push({
            slot_date: dateStr,
            start_time: normalizeTime(slotTime),
            end_time: normalizeTime(endTime),
            is_available: true,
          });
        }
      }

      console.log(`[QUICK SETUP] ✅ Generated ${allSlotsToInsert.length} slots in memory`);

      // STEP 4 & 5: DELETE + BATCH INSERT IN ONE API CALL (server handles both)
      console.log('[QUICK SETUP] 🚀 Sending to server for atomic delete + insert...');
      
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(today.getDate() + 6);
      const lastDateStr = `${sevenDaysLater.getFullYear()}-${String(sevenDaysLater.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysLater.getDate()).padStart(2, '0')}`;
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      if (allSlotsToInsert.length > 0) {
        // Use API endpoint for batch delete + insert (server handles both)
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/barber/slots/batch`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-Session-Token': sessionToken,
            },
            body: JSON.stringify({ 
              slots: allSlotsToInsert,
              deleteDateRange: {
                from: todayStr,
                to: lastDateStr
              }
            }),
          }
        );

        if (!response.ok) {
          const result = await response.json();
          console.error('[QUICK SETUP] ❌ Batch operation failed:', result);
          throw new Error(`Failed to setup slots: ${result.error || 'Unknown error'}`);
        }

        const result = await response.json();
        console.log(`[QUICK SETUP] ✅ Deleted ${result.deleted || 0} old slots`);
        console.log(`[QUICK SETUP] ✅ Inserted ${result.inserted || 0} new slots`);
      }

      // STEP 6: Update working day states (batch)
      console.log('[QUICK SETUP] 📅 Updating working day states...');
      for (const dateStr of workingDayUpdates) {
        await updateWorkingDayState(dateStr, true);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`[QUICK SETUP] ⚡ PERFORMANCE: Total time: ${duration}ms`);
      console.log(`[QUICK SETUP] ⚡ Operations: 1 DELETE + 1 INSERT (batch) + ${workingDayUpdates.length} working day updates`);

      const successMessage = t('schedule.generatedSuccess', {
        count: allSlotsToInsert.length.toString(),
        duration: (duration / 1000).toFixed(1)
      }) || `Generated ${allSlotsToInsert.length} slots for 7 days in ${(duration / 1000).toFixed(1)}s!`;
      toast.success(successMessage);
      
      // STEP 7: Reload slots from server ONCE to update UI
      console.log('[QUICK SETUP] 🔄 Reloading slots from server...');
      await loadSlots();
      
    } catch (e: any) {
      console.error('[QUICK SETUP] ❌ Error:', e);
      toast.error('Failed to generate slots. Please try again.');
      
      // Revert to previous state on error
      await loadSlots();
    } finally {
      setIsQuickSetupProcessing(false);
    }
  };

  // Quick Setup: Handle "Clear" button
  const handleQuickSetupClear = async () => {
    if (!barberId) return;
    
    if (!window.confirm('Are you sure you want to clear all time slots for this week?')) {
      return;
    }

    setIsQuickSetupProcessing(true);
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // OPTIMISTIC UI UPDATE: Clear slots immediately
      const clearedSchedule = weekSchedule.map((day, dayIdx) => {
        const dateStr = getActualDate(dayIdx, pageIndex);
        const slotDate = new Date(dateStr + 'T00:00:00');
        
        // Skip past dates
        if (slotDate < today) {
          return day;
        }

        return {
          ...day,
          slots: [],
        };
      });

      setWeekSchedule(clearedSchedule);
      console.log('[QUICK SETUP CLEAR] ✅ Optimistic UI cleared instantly');

      // Background: Delete from Supabase
      for (let dayIdx = 0; dayIdx < DAYS_PER_PAGE; dayIdx++) {
        const dateStr = getActualDate(dayIdx, pageIndex);
        const slotDate = new Date(dateStr + 'T00:00:00');
        
        // Skip past dates
        if (slotDate < today) continue;

        // Delete all slots for this day
        const { error } = await supabase
          .from('barber_slots')
          .delete()
          .eq('barber_id', barberId)
          .eq('slot_date', dateStr);

        if (error) {
          console.error('[QUICK SETUP CLEAR] Error deleting slots for', dateStr, error);
          throw new Error(`Failed to delete slots: ${error.message}`);
        }

        // Mark day as not working
        await updateWorkingDayState(dateStr, false);
      }

      toast.success(t('toast.slotsClearedWeek'));
      await loadSlots();
      
    } catch (e: any) {
      console.error('[QUICK SETUP CLEAR] Error:', e);
      toast.error(t('toast.networkError') || 'Failed to clear slots. Please try again.');
      
      // Revert on error
      await loadSlots();
    } finally {
      setIsQuickSetupProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"></div>
            <div className="flex items-center gap-3">
              <Label htmlFor="unavailable" className="text-sm">
                {t('schedule.markAsUnavailable')}
              </Label>
              <Switch
                id="unavailable"
                checked={unavailable}
                onCheckedChange={handleAvailabilityToggle}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {unavailable && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200"
            >
              <p className="text-sm text-amber-800">{t('schedule.unavailableWarning')}</p>
            </motion.div>
          )}

          {/* Quick Setup Block */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20"
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('schedule.quickSetup') || 'Set up quickly'}</h3>
            
            {/* From and To Time (50/50 row) */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* From Time */}
              <div>
                <Label htmlFor="quickSetupFrom" className="text-xs text-gray-600 mb-1.5 block">
                  {t('schedule.from') || 'From'}
                </Label>
                <Input
                  type="time"
                  id="quickSetupFrom"
                  value={quickSetupFromTime}
                  onChange={(e) => {
                    console.log('[QUICK SETUP] From time changed to:', e.target.value);
                    setQuickSetupFromTime(e.target.value);
                  }}
                  className="h-10 text-sm"
                />
              </div>

              {/* To Time */}
              <div>
                <Label htmlFor="quickSetupTo" className="text-xs text-gray-600 mb-1.5 block">
                  {t('schedule.to') || 'To'}
                </Label>
                <Input
                  type="time"
                  id="quickSetupTo"
                  value={quickSetupToTime}
                  onChange={(e) => {
                    console.log('[QUICK SETUP] To time changed to:', e.target.value);
                    setQuickSetupToTime(e.target.value);
                  }}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {/* Duration (full width) */}
            <div className="mb-4">
              <Label htmlFor="quickSetupDuration" className="text-xs text-gray-600 mb-1.5 block">
                {t('schedule.avgDuration') || 'Avg. duration'}
              </Label>
              <select
                id="quickSetupDuration"
                value={quickSetupDuration}
                onChange={(e) => {
                  console.log('[QUICK SETUP] Duration changed to:', e.target.value, 'min');
                  setQuickSetupDuration(Number(e.target.value));
                }}
                className="h-10 w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>

            {/* Error Message */}
            {quickSetupError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-3 text-xs text-red-600"
              >
                {quickSetupError}
              </motion.p>
            )}

            {/* Buttons Row (50/50 at bottom) */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              {/* Clear Button */}
              <Button
                onClick={handleQuickSetupClear}
                disabled={isQuickSetupProcessing}
                variant="outline"
                className="h-10 bg-white text-primary border border-primary hover:bg-primary/5 hover:text-primary font-medium"
              >
                {isQuickSetupProcessing ? (
                  <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.928l3-2.647z"></path>
                    </svg>
                    <span className="truncate">{t('schedule.clearing') || 'Clearing...'}</span>
                  </div>
                ) : (
                  t('schedule.clear') || 'Clear'
                )}
              </Button>

              {/* Set Up Button */}
              <Button
                onClick={handleQuickSetup}
                disabled={isQuickSetupProcessing}
                className="h-10 bg-primary text-white hover:bg-primary/90 font-medium shadow-sm"
              >
                {isQuickSetupProcessing ? (
                  <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.928l3-2.647z\"></path>
                    </svg>
                    <span className="truncate">{t('schedule.settingUp') || 'Setting up...'}</span>
                  </div>
                ) : (
                  t('schedule.setUp') || 'Set up'
                )}
              </Button>
            </div>
          </motion.div>

          {/* Page Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex(prev => Math.max(0, prev - 1))}
              disabled={pageIndex === 0}
              className="gap-2 rounded-[12px]"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('common.back')}
            </Button>
            <div></div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex(prev => prev + 1)}
              disabled={pageIndex >= MAX_PAGES - 1}
              className="gap-2 rounded-[12px]"
            >
              {t('common.next')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4 bg-[rgba(0,31,233,0)]">
            <AnimatePresence mode="wait">
              {showSkeleton ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={`skeleton-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 rounded-lg border border-gray-100 bg-white"
                  >
                    <div className="mb-3 space-y-2">
                      <div className="flex justify-between items-center mb-2">
                        <SkeletonItem className="h-4 w-24 rounded" />
                        <SkeletonItem className="h-3 w-12 rounded" />
                      </div>
                      <SkeletonItem className="h-7 w-full rounded-md" />
                    </div>
                    <div className="space-y-2 mt-4">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <SkeletonItem key={j} className="h-10 w-full rounded-lg" />
                      ))}
                    </div>
                  </motion.div>
                ))
              ) : (
                weekSchedule.map((daySchedule, dayIndex) => (
                  <motion.div
                    key={`${pageIndex}-${dayIndex}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: dayIndex * 0.05 }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      daySchedule.isOff
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-primary/5 border-primary/20'
                    }`}
                  >
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 leading-relaxed pb-0.5">{getTranslatedDayName(dayIndex, pageIndex)}</h4>
                        <span className="text-xs text-gray-500">{getDateStringForPage(dayIndex, pageIndex)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleDayOff(dayIndex)}
                        className="w-full text-xs h-7 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                      >
                        {daySchedule.isOff ? t('schedule.setAsWorking') : t('schedule.setAsOff')}
                      </Button>
                    </div>

                    {!daySchedule.isOff && (
                      <div className="space-y-2 bg-[rgba(0,0,0,0)]">
                        {daySchedule.slots.map((slot) => {
                          const isEditing = editingSlot?.dayIndex === dayIndex && editingSlot?.slotId === slot.id;
                          const isBooked = slot.booked || false;
                          
                          return (
                            <motion.div
                              key={slot.id}
                              whileHover={{ scale: isBooked ? 1 : 1.02 }}
                              className={`p-3 rounded-xl text-xs shadow-sm transition-all border-2 ${
                                isBooked
                                  ? 'bg-red-50 border-red-200 cursor-not-allowed'
                                  : 'bg-white border-primary/20 hover:border-primary/30 hover:shadow-md'
                              }`}
                            >
                              {isEditing && !isBooked ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="time"
                                      value={editingTime}
                                      onChange={(e) => setEditingTime(e.target.value)}
                                      className="h-7 text-xs flex-1"
                                      step={recommendedStep * 60}
                                    />
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={saveTimeSlot}
                                      className="h-6 flex-1 gap-1"
                                    >
                                      <Check className="w-3 h-3" />
                                      {t('schedule.save')}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={cancelEditingSlot}
                                      className="h-6 flex-1 gap-1"
                                    >
                                      <X className="w-3 h-3" />
                                      {t('schedule.cancel')}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1">
                                      <Clock className={`w-3 h-3 ${isBooked ? 'text-red-600' : ''}`} />
                                      <span className={isBooked ? 'text-red-800 font-medium' : ''}>{slot.time}</span>
                                    </div>
                                    {!isBooked && (
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEditingSlot(dayIndex, slot.id, slot.time)}
                                          className="h-5 w-5 p-0"
                                        >
                                          <Edit className="w-3 h-3 text-blue-500" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeTimeSlot(dayIndex, slot.id)}
                                          className="h-5 w-5 p-0"
                                        >
                                          <Trash2 className="w-3 h-3 text-red-500" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs w-full justify-center font-semibold rounded-lg ${
                                      isBooked
                                        ? 'bg-red-100 text-red-700 border-red-300'
                                        : 'bg-primary/10 text-primary border-primary/30'
                                    }`}
                                  >
                                    {isBooked ? t('schedule.booked') : t('schedule.open')}
                                  </Badge>
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddSlotDialog(dayIndex)}
                          className="w-full gap-1 text-xs h-7"
                        >
                          <Plus className="w-3 h-3" />
                          {t('schedule.addSlot')}
                        </Button>
                      </div>
                    )}
                    {daySchedule.isOff && (
                      <div className="flex items-center justify-center py-4">
                        <span className="text-xs text-gray-500">{t('schedule.dayOff')}</span>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Time Picker Modal */}
      <Dialog open={showTimePickerModal} onOpenChange={setShowTimePickerModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('schedule.addSlot') || 'Add Time Slot'}</DialogTitle>
            <DialogDescription>
              {t('schedule.addSlotDescription') || 'Choose a start time to create the first time slot'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">{t('schedule.startTime') || 'Start Time'}</Label>
              <Input
                type="time"
                id="startTime"
                value={selectedStartTime}
                onChange={(e) => setSelectedStartTime(e.target.value)}
                step={recommendedStep * 60}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTimePickerCancel}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleTimePickerConfirm}
            >
              {t('common.confirm') || 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Setup Confirmation Modal */}
      <Dialog open={showQuickSetupConfirmModal} onOpenChange={setShowQuickSetupConfirmModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('schedule.replaceTitle') || 'Replace existing slots?'}</DialogTitle>
            <DialogDescription>
              {t('schedule.replaceDescription') || 'This will replace all existing time slots with new generated slots. This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuickSetupConfirmModal(false)}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={executeQuickSetup}
              disabled={isQuickSetupProcessing}
            >
              {isQuickSetupProcessing ? (
                <div className="flex items-center gap-1">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.928l3-2.647z"></path>
                  </svg>
                  {t('schedule.settingUp') || 'Setting up...'}
                </div>
              ) : (
                t('schedule.replace') || 'Replace'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}