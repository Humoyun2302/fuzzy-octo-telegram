/**
 * Shared Booking Flow - Used by both Customer and Manual Bookings
 * 
 * This file contains the unified booking creation logic that ensures
 * consistent behavior between customer self-service bookings and
 * barber manual bookings.
 */

import { supabase } from './supabase/client';

// Helper function to validate UUID format
export const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export interface BookingFlowParams {
  // Required fields
  barberId: string;
  barber: {
    id: string;
    name: string;
    avatar?: string;
    services?: Array<{ id: string; name: string; duration: number; price: number }>;
  };
  selectedSlot: {
    id: string;
    start_time: string;
    end_time: string;
    slot_date: string;
    status: string;
    is_available: boolean;
  };
  selectedServices: string[]; // Array of service names
  selectedDate: string;
  selectedTimeSlot: string; // Display time (may be shifted)
  totalDuration: number;
  totalPrice: number;
  
  // Booking source
  source: 'online' | 'manual';
  
  // For customer bookings
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  
  // For manual bookings (barber creates for walk-in customer)
  manualCustomerName?: string;
  manualCustomerPhone?: string;
  
  // Optional
  notes?: string;
}

export interface BookingFlowResult {
  success: boolean;
  booking?: any;
  error?: string;
}

/**
 * Shared booking creation flow
 * Used by both customer booking modal and barber manual booking form
 */
export async function createBookingFlow(params: BookingFlowParams): Promise<BookingFlowResult> {
  const {
    barberId,
    barber,
    selectedSlot,
    selectedServices,
    selectedDate,
    selectedTimeSlot,
    totalDuration,
    totalPrice,
    source,
    customerId,
    customerName,
    customerPhone,
    manualCustomerName,
    manualCustomerPhone,
    notes,
  } = params;

  try {
    console.log(`[BOOKING FLOW] Starting ${source} booking creation...`);

    // STEP 1: Re-fetch slot to validate availability (prevent race conditions)
    console.log('[BOOKING FLOW] Re-fetching slot by ID:', selectedSlot.id);
    
    const { data: refreshedSlot, error: slotError } = await supabase
      .from('barber_slots')
      .select('*')
      .eq('id', selectedSlot.id)
      .single();

    if (slotError || !refreshedSlot) {
      console.error('[BOOKING FLOW] Slot not found:', slotError);
      return {
        success: false,
        error: 'Selected time slot is no longer available'
      };
    }

    // Check if slot is still available
    if (refreshedSlot.status !== 'available' || !refreshedSlot.is_available) {
      console.error('[BOOKING FLOW] Slot is no longer available:', refreshedSlot);
      return {
        success: false,
        error: 'Selected time slot has already been booked'
      };
    }

    console.log('[BOOKING FLOW] ✅ Slot is still available');

    // STEP 2: Validate barber ID
    if (!barberId || !isValidUUID(barberId)) {
      return {
        success: false,
        error: 'Invalid barber information'
      };
    }

    // STEP 3: Validate customer ID (only for customer bookings)
    if (source === 'online' && (!customerId || !isValidUUID(customerId))) {
      return {
        success: false,
        error: 'Invalid customer information'
      };
    }

    // STEP 4: Validate services
    if (!selectedServices || selectedServices.length === 0) {
      return {
        success: false,
        error: 'Please select a service'
      };
    }

    // STEP 5: Find service UUID from barber.services (database-backed services)
    let finalServiceId: string | undefined;
    
    console.log('[BOOKING FLOW] Looking for service UUID:', {
      selectedServices,
      barberServices: barber.services,
      barberServicesCount: barber.services?.length || 0
    });

    if (barber.services && barber.services.length > 0) {
      const firstSelectedServiceName = selectedServices[0];
      const matchingService = barber.services.find(s => s.name === firstSelectedServiceName);
      
      if (matchingService && isValidUUID(matchingService.id)) {
        finalServiceId = matchingService.id;
        console.log('[BOOKING FLOW] ✅ Found service UUID:', finalServiceId);
      } else {
        console.log('[BOOKING FLOW] ⚠️ No valid UUID found for service:', firstSelectedServiceName);
      }
    } else {
      console.log('[BOOKING FLOW] ⚠️ Barber has no database-backed services');
    }

    // STEP 6: Calculate end time
    const [startHour, startMinute] = selectedTimeSlot.split(':');
    const endTime = new Date();
    endTime.setHours(parseInt(startHour), parseInt(startMinute) + totalDuration);
    const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

    // STEP 7: Create booking object
    const bookingData: any = {
      barberId,
      barberName: barber.name,
      barberAvatar: barber.avatar || '',
      serviceType: selectedServices.join(' + '),
      date: selectedDate,
      startTime: selectedTimeSlot, // Display time (may be shifted)
      endTime: endTimeStr,
      duration: totalDuration, // CRITICAL for slot shifting!
      price: totalPrice,
      status: 'confirmed',
      slotId: selectedSlot.id, // Base slot ID (CRITICAL!)
      source, // 'online' or 'manual'
      notes: notes || '',
    };

    // Add service ID if found
    if (finalServiceId) {
      bookingData.serviceId = finalServiceId;
    }

    // STEP 8: Add customer-specific or manual-specific fields
    if (source === 'online') {
      // Customer booking - requires customer_id
      bookingData.customerId = customerId;
      bookingData.customerName = customerName;
      bookingData.customerPhone = customerPhone;
    } else if (source === 'manual') {
      // Manual booking - no customer_id, use manual fields
      // Set customer_id to null (or barber's ID if schema requires it)
      bookingData.customerId = null; // Will be handled by backend
      bookingData.customerName = manualCustomerName;
      bookingData.customerPhone = manualCustomerPhone;
      bookingData.manualCustomerName = manualCustomerName;
      bookingData.manualCustomerPhone = manualCustomerPhone;
    }

    console.log('[BOOKING FLOW] Booking payload created:', {
      source,
      barberId: bookingData.barberId,
      customerId: bookingData.customerId,
      slotId: bookingData.slotId,
      serviceId: bookingData.serviceId,
      serviceType: bookingData.serviceType,
      duration: bookingData.duration,
      manualCustomerName: bookingData.manualCustomerName,
      manualCustomerPhone: bookingData.manualCustomerPhone
    });

    return {
      success: true,
      booking: bookingData
    };

  } catch (error: any) {
    console.error('[BOOKING FLOW] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create booking'
    };
  }
}
