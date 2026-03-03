// Utility functions for working with barber schedules

interface TimeSlot {
  id: string;
  time: string; // Single time instead of start/end
  available: boolean;
  booked?: boolean;
}

interface DaySchedule {
  day: string;
  date: string;
  isOff: boolean;
  slots: TimeSlot[];
}

/**
 * Get all unique time slots from the saved schedule
 * Returns sorted array of time slots
 */
export function getAvailableTimeSlots(): Array<{ time: string; available: boolean }> {
  try {
    const saved = localStorage.getItem('barber-schedule');
    if (!saved) {
      // Return default time slots if no schedule is saved
      return getDefaultTimeSlots();
    }

    const schedule: DaySchedule[] = JSON.parse(saved);
    
    // Collect all unique time slots from all days
    const timeSlotMap = new Map<string, { time: string; available: boolean }>();
    
    schedule.forEach((day) => {
      if (!day.isOff) {
        day.slots.forEach((slot) => {
          if (!slot.booked) {
            if (!timeSlotMap.has(slot.time)) {
              timeSlotMap.set(slot.time, {
                time: slot.time,
                available: slot.available,
              });
            }
          }
        });
      }
    });

    // Convert to array and sort by time
    const slots = Array.from(timeSlotMap.values());
    slots.sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
    });

    // If no slots found, return default
    return slots.length > 0 ? slots : getDefaultTimeSlots();
  } catch (error) {
    console.error('Error loading schedule:', error);
    return getDefaultTimeSlots();
  }
}

/**
 * Get time slots for a specific date and day of week
 */
export function getTimeSlotsForDate(dateString: string): Array<{ time: string; available: boolean }> {
  try {
    const saved = localStorage.getItem('barber-schedule');
    if (!saved) {
      return getDefaultTimeSlots();
    }

    const schedule: DaySchedule[] = JSON.parse(saved);
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Find the matching day in the schedule
    const daySchedule = schedule.find((day) => day.day === dayName);
    
    if (!daySchedule || daySchedule.isOff) {
      return []; // No slots available on off days
    }

    // Return the slots for this day, sorted by time
    const slots = daySchedule.slots
      .filter((slot) => !slot.booked)
      .map((slot) => ({
        time: slot.time,
        available: slot.available,
      }))
      .sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
      });

    return slots.length > 0 ? slots : [];
  } catch (error) {
    console.error('Error loading schedule for date:', error);
    return getDefaultTimeSlots();
  }
}

/**
 * Default time slots fallback
 */
function getDefaultTimeSlots(): Array<{ time: string; available: boolean }> {
  return [
    { time: '09:00', available: true },
    { time: '10:00', available: true },
    { time: '11:00', available: true },
    { time: '12:00', available: true },
    { time: '14:00', available: true },
    { time: '15:00', available: true },
    { time: '16:00', available: true },
    { time: '17:00', available: true },
    { time: '18:00', available: true },
  ];
}

/**
 * Check if a day is marked as off
 */
export function isDayOff(dateString: string): boolean {
  try {
    const saved = localStorage.getItem('barber-schedule');
    if (!saved) return false;

    const schedule: DaySchedule[] = JSON.parse(saved);
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    const daySchedule = schedule.find((day) => day.day === dayName);
    return daySchedule?.isOff || false;
  } catch {
    return false;
  }
}
