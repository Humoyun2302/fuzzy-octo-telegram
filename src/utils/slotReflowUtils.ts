/**
 * Dynamic Time Reflow Utilities
 * 
 * This module handles the dynamic shifting of time slots based on bookings.
 * When a slot is booked, only that slot is marked as booked in the database.
 * The frontend dynamically shifts all future slots to start at the booking's end time,
 * and filters out slots with insufficient time for the minimum service duration.
 */

export interface TimeSlot {
  id: string;
  start_time: string; // "HH:MM:SS" or "HH:MM"
  end_time: string;
  slot_date: string;
  is_booked: boolean; // SINGLE SOURCE OF TRUTH
}

export interface Booking {
  id: string;
  date: string;
  start_time: string; // "HH:MM:SS" or "HH:MM"
  end_time: string;
  duration: number;
}

/**
 * Parse time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight back to HH:MM format
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Normalize time string to HH:MM format
 */
function normalizeTime(time: string): string {
  return time.substring(0, 5); // "09:00:00" -> "09:00"
}

/**
 * Apply dynamic reflow logic to time slots based on bookings
 * 
 * @param slots - All slots for the day (both available and booked)
 * @param bookings - All bookings for the day
 * @param minServiceDuration - Minimum service duration in minutes
 * @returns Array of reflowed available time slots with display times
 */
export function applySlotReflow(
  slots: TimeSlot[],
  bookings: Booking[],
  minServiceDuration: number
): Array<{ originalSlot: TimeSlot; displayTime: string; available: boolean }> {
  // Sort slots by start time
  const sortedSlots = [...slots].sort((a, b) => 
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  // Sort bookings by start time
  const sortedBookings = [...bookings].sort((a, b) => 
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  console.log('[REFLOW] Processing', sortedSlots.length, 'slots and', sortedBookings.length, 'bookings');
  console.log('[REFLOW] Min service duration:', minServiceDuration, 'minutes');

  const result: Array<{ originalSlot: TimeSlot; displayTime: string; available: boolean }> = [];
  
  // Track the current "shift" - the latest end time of all previous bookings
  let currentShift = 0; // minutes since midnight

  let bookingIndex = 0;

  for (const slot of sortedSlots) {
    const slotStartMinutes = timeToMinutes(slot.start_time);
    const slotEndMinutes = timeToMinutes(slot.end_time);
    
    // Check if there are any bookings that end after the current shift but before/at this slot's start
    while (
      bookingIndex < sortedBookings.length && 
      timeToMinutes(sortedBookings[bookingIndex].start_time) <= slotStartMinutes
    ) {
      const booking = sortedBookings[bookingIndex];
      const bookingEndMinutes = timeToMinutes(booking.end_time);
      
      // Update shift to the latest booking end time
      currentShift = Math.max(currentShift, bookingEndMinutes);
      
      console.log('[REFLOW] Booking', bookingIndex, 'ends at', booking.end_time, '- shift now:', minutesToTime(currentShift));
      
      bookingIndex++;
    }

    // Calculate the display time (shifted start time)
    const displayStartMinutes = Math.max(slotStartMinutes, currentShift);
    const displayTime = minutesToTime(displayStartMinutes);
    
    // Calculate remaining time in this slot after the shift
    const remainingMinutes = slotEndMinutes - displayStartMinutes;
    
    // Check if there's enough time for minimum service duration
    const hasEnoughTime = remainingMinutes >= minServiceDuration;
    
    // SINGLE SOURCE OF TRUTH: Slot is available if NOT booked AND has enough time
    const isAvailable = slot.is_booked === false && hasEnoughTime;
    
    console.log('[REFLOW] Slot', normalizeTime(slot.start_time), '-', normalizeTime(slot.end_time), 
      '→ Display:', displayTime, '| Remaining:', remainingMinutes, 'min | Available:', isAvailable);
    
    // Only include slots with enough time
    if (hasEnoughTime) {
      result.push({
        originalSlot: slot,
        displayTime,
        available: isAvailable
      });
    }
  }

  console.log('[REFLOW] Result:', result.length, 'available slots after reflow');
  
  return result;
}

/**
 * Get the minimum service duration from a list of services
 */
export function getMinServiceDuration(services: Array<{ duration: number }>): number {
  if (!services || services.length === 0) return 30; // Default 30 minutes
  return Math.min(...services.map(s => s.duration));
}

/**
 * Calculate total duration for selected services
 */
export function calculateTotalDuration(services: Array<{ duration: number }>): number {
  return services.reduce((sum, service) => sum + service.duration, 0);
}

/**
 * Calculate end time given start time and duration
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  return minutesToTime(endMinutes);
}
