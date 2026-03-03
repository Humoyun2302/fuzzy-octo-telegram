/**
 * Utility functions for time validation in the booking system
 */

/**
 * Checks if a time slot is in the past
 * @param date - The date string (YYYY-MM-DD format)
 * @param timeSlot - The time slot string (HH:MM or HH:MM-HH:MM format)
 * @returns true if the time slot is in the past, false otherwise
 */
export function isTimeSlotInPast(date: string, timeSlot: string | undefined): boolean {
  // Handle undefined or null timeSlot
  if (!timeSlot) {
    return false;
  }

  const now = new Date();
  const selectedDate = new Date(date);
  
  // Normalize dates to compare only year, month, day
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDateStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  
  // If the selected date is in the future, the slot is not in the past
  if (selectedDateStart > todayStart) {
    return false;
  }
  
  // If the selected date is before today, the slot is in the past
  if (selectedDateStart < todayStart) {
    return true;
  }
  
  // If it's today, check the time
  // Extract start time from slot (handle both "HH:MM" and "HH:MM-HH:MM" formats)
  const startTime = timeSlot.includes('-') ? timeSlot.split('-')[0].trim() : timeSlot.trim();
  const [hours, minutes] = startTime.split(':').map(Number);
  
  const slotDateTime = new Date(selectedDate);
  slotDateTime.setHours(hours, minutes, 0, 0);
  
  // Add a small buffer (5 minutes) to prevent booking slots that are about to start
  const currentTimeWithBuffer = new Date(now.getTime() + 5 * 60 * 1000);
  
  return slotDateTime < currentTimeWithBuffer;
}

/**
 * Gets the current time in HH:MM format
 */
export function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Gets today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Checks if a date is today
 */
export function isToday(date: string): boolean {
  const today = getTodayDate();
  return date === today;
}