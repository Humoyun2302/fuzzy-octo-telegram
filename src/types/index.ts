export type UserRole = 'customer' | 'barber' | null;

export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number; // in UZS
  description?: string; // optional, max 150 chars
  orderIndex?: number;
}

export interface GalleryImage {
  id: string;
  url: string;
  type?: 'interior' | 'exterior';
  orderIndex: number;
}

export interface User {
  id: string;
  name: string;
  // Email is optional in our app as we use phone as primary identifier (mocked as email for Supabase)
  // We generally don't display email to the user.
  email?: string; 
  role: 'customer' | 'barber';
  avatar?: string;
  phone?: string;
  bio?: string;
  preferredDistricts?: string[];
  preferredLanguage?: string;
}

export interface Barber {
  id: string;
  name: string;
  username?: string; // Unique username for public URL (e.g., "jonibek" in trimly.uz/b/jonibek)
  avatar: string;
  rating: number;
  reviewCount: number;
  distance: number;
  languages: string[];
  specialties: string[]; // Deprecated - kept for backward compatibility
  services?: Service[]; // New: array of service objects
  priceRange: { min: number; max: number }; // Auto-calculated from services
  districts: string[];
  phone?: string;
  bio?: string;
  description?: string; // Barber description - shown in expanded card view
  location?: string; // Maps to database location column (workplace address)
  workplaceAddress?: string;
  workplaceCoordinates?: { lat: number; lng: number };
  googleMapsUrl?: string;
  barbershopName?: string; // Name of the barbershop (optional)
  subscriptionStatus: 'active' | 'expired' | 'pending';
  subscriptionExpiryDate: string;
  lastPaymentDate?: string;
  currentPlan?: '1-month' | '6-months' | '1-year'; // Current subscription plan
  isSubscriptionActive?: boolean; // Backend-calculated boolean (single source of truth)
  gallery?: string[]; // Deprecated - kept for backward compatibility
  interiorExteriorPhotos?: GalleryImage[]; // New: 2-4 images required
  servicesForKids?: boolean; // Whether this barber provides services for kids
  trialUsed?: boolean; // Whether the barber has used their trial period
  is_available?: boolean; // Whether the barber is currently available for bookings (default: true)
}

export interface Booking {
  id: string;
  barberId: string;
  customerId: string | null; // Nullable for manual bookings
  customerAvatar?: string;
  customerPhone?: string;
  serviceType: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'rescheduled';
  bookingType?: 'online' | 'manual' | 'guest'; // Used for filtering, comes from barber_slots.booking_type (not stored in bookings table)
  source?: 'online' | 'manual' | 'guest'; // Source of the booking (guest = online without auth)
  previousDate?: string; // For rescheduled bookings - stores original date
  previousTime?: string; // For rescheduled bookings - stores original time
  updatedAt?: string; // Timestamp of last update (cancel/reschedule)
  cancelledAt?: string; // Timestamp when booking was cancelled
  // Required for backend API
  slotId?: string; // UUID of the selected slot from barber_slots
  serviceId?: string; // UUID of the selected service
  notes?: string; // Booking notes
  // Manual booking fields (when source === 'manual')
  manualCustomerName?: string; // Name of walk-in customer
  manualCustomerPhone?: string; // Phone of walk-in customer
  // Joined from barbers table
  barber?: {
    id: string;
    full_name: string;
    avatar: string;
    location?: string;
  };
  // Joined from customers table
  customer?: {
    id: string;
    full_name: string;
    phone?: string;
  };
  // Joined from barber_slots table
  slot?: {
    id: string;
    slot_date: string;
    start_time: string;
    end_time: string;
  };
  // DEPRECATED - Use barber.full_name instead
  barberName?: string;
  // DEPRECATED - Use barber.avatar instead
  barberAvatar?: string;
  // DEPRECATED - Use customer.full_name instead
  customerName?: string;
}

export interface ManualBooking {
  id: string;
  barberId: string;
  barberName: string;
  barberAvatar?: string;
  customerId: string | null; // null for manual bookings
  customerName: string;
  customerPhone?: string;
  customerTelegram?: string;
  serviceType: string; // Added for consistency with Booking
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  service?: string; // Deprecated - use serviceType
  price: number; // Changed from optional to required
  source: 'manual' | 'oral' | 'phone' | 'telegram' | 'whatsapp' | 'walkin' | 'other';
  status: 'confirmed' | 'tentative' | 'cancelled' | 'arrived' | 'noshow';
  notes?: string;
  bookingType: 'manual';
  createdAt?: string;
  slotId?: string; // UUID of the selected slot from barber_slots
  serviceId?: string; // UUID of the selected service
  manualCustomerName?: string; // Same as customerName for manual bookings
  manualCustomerPhone?: string; // Same as customerPhone for manual bookings
}

export interface Stats {
  totalCustomersThisWeek: number;
  todaysEarnings: number;
  nextAppointment?: {
    customerName: string;
    time: string;
    service: string;
  };
}

export interface TimeSlot {
  day: string;
  slots: { start: string; end: string; available: boolean }[];
}