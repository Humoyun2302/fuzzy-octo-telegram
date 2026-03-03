import { User, Barber, Booking, ManualBooking } from '../types';

/**
 * Synchronize customer profile changes across all bookings
 */
export function syncCustomerProfileInBookings(
  updatedCustomer: User,
  bookings: Booking[]
): Booking[] {
  return bookings.map(booking => {
    if (booking.customerId === updatedCustomer.id) {
      return {
        ...booking,
        customerName: updatedCustomer.name,
        customerAvatar: updatedCustomer.avatar,
        customerPhone: updatedCustomer.phone,
      };
    }
    return booking;
  });
}

/**
 * Synchronize barber profile changes across all bookings
 */
export function syncBarberProfileInBookings(
  updatedBarber: Barber,
  bookings: Booking[]
): Booking[] {
  return bookings.map(booking => {
    if (booking.barberId === updatedBarber.id) {
      return {
        ...booking,
        barberName: updatedBarber.name,
        barberAvatar: updatedBarber.avatar,
      };
    }
    return booking;
  });
}

/**
 * Synchronize barber profile changes in manual bookings
 */
export function syncBarberProfileInManualBookings(
  updatedBarber: Barber,
  manualBookings: ManualBooking[]
): ManualBooking[] {
  return manualBookings.map(booking => {
    if (booking.barberId === updatedBarber.id) {
      return {
        ...booking,
        barberName: updatedBarber.name,
        barberAvatar: updatedBarber.avatar,
      };
    }
    return booking;
  });
}

/**
 * Synchronize barber profile in the barbers list
 */
export function syncBarberInList(
  updatedBarber: Barber,
  barbers: Barber[]
): Barber[] {
  return barbers.map(barber => 
    barber.id === updatedBarber.id ? updatedBarber : barber
  );
}

// Storage keys
const STORAGE_KEYS = {
  CUSTOMER_PROFILE: 'trimly-customer-profile',
  BARBER_PROFILE: 'trimly-barber-profile',
  CUSTOMER_BOOKINGS: 'trimly-customer-bookings',
  BARBER_BOOKINGS: 'trimly-barber-bookings',
  MANUAL_BOOKINGS: 'trimly-manual-bookings',
  BARBERS_LIST: 'trimly-barbers-list',
  FAVORITES: 'trimly-favorites',
};

/**
 * Save customer profile to localStorage
 */
export function saveCustomerProfile(customer: User): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMER_PROFILE, JSON.stringify(customer));
  } catch (error) {
    console.error('Failed to save customer profile:', error);
  }
}

/**
 * Load customer profile from localStorage
 */
export function loadCustomerProfile(): User | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMER_PROFILE);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load customer profile:', error);
    return null;
  }
}

/**
 * Save barber profile to localStorage
 */
export function saveBarberProfile(barber: Barber): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BARBER_PROFILE, JSON.stringify(barber));
  } catch (error) {
    console.error('Failed to save barber profile:', error);
  }
}

/**
 * Load barber profile from localStorage
 */
export function loadBarberProfile(): Barber | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.BARBER_PROFILE);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load barber profile:', error);
    return null;
  }
}

/**
 * Save customer bookings to localStorage
 */
export function saveCustomerBookings(bookings: Booking[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMER_BOOKINGS, JSON.stringify(bookings));
  } catch (error) {
    console.error('Failed to save customer bookings:', error);
  }
}

/**
 * Load customer bookings from localStorage
 */
export function loadCustomerBookings(): Booking[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMER_BOOKINGS);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load customer bookings:', error);
    return null;
  }
}

/**
 * Save barber bookings to localStorage
 */
export function saveBarberBookings(bookings: Booking[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BARBER_BOOKINGS, JSON.stringify(bookings));
  } catch (error) {
    console.error('Failed to save barber bookings:', error);
  }
}

/**
 * Load barber bookings from localStorage
 */
export function loadBarberBookings(): Booking[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.BARBER_BOOKINGS);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load barber bookings:', error);
    return null;
  }
}

/**
 * Save manual bookings to localStorage
 */
export function saveManualBookings(bookings: ManualBooking[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MANUAL_BOOKINGS, JSON.stringify(bookings));
  } catch (error) {
    console.error('Failed to save manual bookings:', error);
  }
}

/**
 * Load manual bookings from localStorage
 */
export function loadManualBookings(): ManualBooking[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.MANUAL_BOOKINGS);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load manual bookings:', error);
    return null;
  }
}

/**
 * Save barbers list to localStorage
 */
export function saveBarbersList(barbers: Barber[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BARBERS_LIST, JSON.stringify(barbers));
  } catch (error) {
    console.error('Failed to save barbers list:', error);
  }
}

/**
 * Load barbers list from localStorage
 */
export function loadBarbersList(): Barber[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.BARBERS_LIST);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load barbers list:', error);
    return null;
  }
}

/**
 * Save favorites to localStorage
 */
export function saveFavorites(favorites: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save favorites:', error);
  }
}

/**
 * Load favorites from localStorage
 */
export function loadFavorites(): string[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load favorites:', error);
    return null;
  }
}
