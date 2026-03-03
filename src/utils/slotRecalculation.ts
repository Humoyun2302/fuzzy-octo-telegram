/**
 * Slot Recalculation Logic
 * 
 * Rules:
 * 1. Booking a service books ONLY the selected slot
 * 2. Calculate booking_end_time = slot_start_time + total_service_duration
 * 3. Remove all slots that start BEFORE booking_end_time
 * 4. The next available slot MUST start EXACTLY at booking_end_time
 * 5. If remaining time before the next original slot is shorter than min service duration, remove that slot
 * 6. Persist recalculated slots to database
 */

export interface SlotRecalculationParams {
  selectedSlot: {
    id: string;
    slot_date: string;
    start_time: string;
    end_time: string;
  };
  serviceDuration: number; // Total duration in minutes
  minServiceDuration: number; // Minimum service duration for this barber
  allDaySlotsForBarber: Array<{
    id: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    status: string;
    is_available: boolean;
  }>;
}

export interface SlotRecalculationResult {
  slotsToDelete: string[]; // IDs of slots to delete
  slotsToUpdate: Array<{ // Slots to update with new times
    id: string;
    new_start_time: string;
    new_end_time: string;
  }>;
}

/**
 * Convert time string (HH:MM:SS or HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM:SS)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
}

/**
 * Calculate which slots need to be deleted or updated after booking
 */
export function calculateSlotRecalculation(params: SlotRecalculationParams): SlotRecalculationResult {
  const {
    selectedSlot,
    serviceDuration,
    minServiceDuration,
    allDaySlotsForBarber
  } = params;

  const selectedStartMinutes = timeToMinutes(selectedSlot.start_time);
  const bookingEndMinutes = selectedStartMinutes + serviceDuration;

  console.log('[SLOT RECALC] 📊 Input:', {
    selectedSlot: selectedSlot.start_time,
    serviceDuration,
    bookingEndMinutes: minutesToTime(bookingEndMinutes),
    minServiceDuration,
    totalSlots: allDaySlotsForBarber.length
  });

  // Filter to only available slots on the same date that come AFTER the selected slot
  const slotsAfterBooking = allDaySlotsForBarber
    .filter(slot => 
      slot.slot_date === selectedSlot.slot_date &&
      slot.id !== selectedSlot.id && // Exclude the booked slot itself
      slot.status === 'available' &&
      slot.is_available === true
    )
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  console.log('[SLOT RECALC] 🔍 Slots after booking:', slotsAfterBooking.length);

  const slotsToDelete: string[] = [];
  const slotsToUpdate: Array<{ id: string; new_start_time: string; new_end_time: string }> = [];

  let nextExpectedStartMinutes = bookingEndMinutes;

  for (const slot of slotsAfterBooking) {
    const slotStartMinutes = timeToMinutes(slot.start_time);
    const slotEndMinutes = timeToMinutes(slot.end_time);
    const slotDuration = slotEndMinutes - slotStartMinutes;

    console.log('[SLOT RECALC] 🔄 Processing slot:', {
      id: slot.id,
      original: `${slot.start_time} - ${slot.end_time}`,
      slotStartMinutes,
      nextExpectedStartMinutes
    });

    // Rule 3: Delete slots that start BEFORE booking_end_time
    if (slotStartMinutes < bookingEndMinutes) {
      console.log('[SLOT RECALC] ❌ DELETE (starts before booking ends)');
      slotsToDelete.push(slot.id);
      continue;
    }

    // Calculate the gap between when we expect the next slot and when it actually starts
    const gap = slotStartMinutes - nextExpectedStartMinutes;

    console.log('[SLOT RECALC] 📏 Gap analysis:', {
      gap,
      minServiceDuration,
      gapTooSmall: gap > 0 && gap < minServiceDuration
    });

    // Rule 6: If there's a gap smaller than min service duration, delete this slot
    if (gap > 0 && gap < minServiceDuration) {
      console.log('[SLOT RECALC] ❌ DELETE (gap too small for any service)');
      slotsToDelete.push(slot.id);
      continue;
    }

    // Rule 4 & 5: Update slot to start exactly at nextExpectedStartMinutes
    if (slotStartMinutes !== nextExpectedStartMinutes) {
      const newStartTime = minutesToTime(nextExpectedStartMinutes);
      const newEndTime = minutesToTime(nextExpectedStartMinutes + slotDuration);
      
      console.log('[SLOT RECALC] ✏️ UPDATE:', {
        from: `${slot.start_time} - ${slot.end_time}`,
        to: `${newStartTime} - ${newEndTime}`
      });

      slotsToUpdate.push({
        id: slot.id,
        new_start_time: newStartTime,
        new_end_time: newEndTime
      });

      // Next slot should start after this updated slot ends
      nextExpectedStartMinutes = nextExpectedStartMinutes + slotDuration;
    } else {
      // Slot is already at the correct time, no update needed
      console.log('[SLOT RECALC] ✅ KEEP (already at correct time)');
      nextExpectedStartMinutes = slotEndMinutes;
    }
  }

  console.log('[SLOT RECALC] 📋 Result:', {
    slotsToDelete: slotsToDelete.length,
    slotsToUpdate: slotsToUpdate.length
  });

  return {
    slotsToDelete,
    slotsToUpdate
  };
}
