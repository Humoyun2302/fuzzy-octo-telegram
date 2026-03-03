# 🔍 Implementation Verification Checklist

This document helps verify that all components of the unified booking workflow are correctly implemented.

---

## ✅ Backend Verification

### 1. Booking Endpoint (`/supabase/functions/server/index.tsx`)

**Check Line ~821-827:** POST `/bookings` endpoint accepts both customers and barbers
```typescript
if (user.role !== 'customer' && user.role !== 'barber') {
  return c.json({ error: "Only customers and barbers can create bookings" }, 403);
}
```
- [ ] Both 'customer' and 'barber' roles allowed ✓

**Check Line ~830-845:** Source detection and customer_id logic
```typescript
const bookingSource = bookingData.source || 'online';
let customerId;

if (bookingSource === 'manual' && user.role === 'barber') {
  customerId = null;
} else {
  customerId = user.id;
}
```
- [ ] Manual bookings set customer_id to null ✓
- [ ] Online bookings use user.id ✓

**Check Line ~862-880:** Manual fields added to insert payload
```typescript
if (bookingSource === 'manual') {
  insertPayload.manual_customer_name = bookingData.manual_customer_name || bookingData.customerName;
  insertPayload.manual_customer_phone = bookingData.manual_customer_phone || bookingData.customerPhone;
}
```
- [ ] Manual customer name stored ✓
- [ ] Manual customer phone stored ✓

**Check Line ~932-947:** Slot update handles both booking types
```typescript
booked_by_customer_id: customerId, // null for manual, customer_id for online
```
- [ ] Slot update accepts null customer_id ✓

---

## ✅ Frontend App Verification

### 2. Booking Handler (`/App.tsx`)

**Check Line ~632-648:** Booking payload includes manual fields
```typescript
if (booking.source === 'manual') {
  bookingPayload.manual_customer_name = booking.manualCustomerName || booking.customerName;
  bookingPayload.manual_customer_phone = booking.manualCustomerPhone || booking.customerPhone;
}
```
- [ ] Manual fields added to payload ✓

**Check Line ~747-764:** Response parsing includes manual fields
```typescript
customerName: data.booking.source === 'manual' 
  ? (data.booking.manual_customer_name || 'Walk-in Customer')
  : (data.booking.customer?.full_name || 'Customer'),
manualCustomerName: data.booking.manual_customer_name,
manualCustomerPhone: data.booking.manual_customer_phone
```
- [ ] Manual customer name parsed ✓
- [ ] Manual customer phone parsed ✓

---

## ✅ Manual Booking Form Verification

### 3. Form Component (`/components/ManualBookingForm.tsx`)

**Check Line ~14:** Imports slot calculation utility
```typescript
import { computeAvailableSlots } from '../utils/slotCalculations';
```
- [ ] Shared slot calculation imported ✓

**Check Line ~100-192:** Slot fetching uses same logic as customer booking
```typescript
const { data: allSlots, error: slotsError } = await supabase
  .from('barber_slots')
  .select('*')
  .eq('barber_id', barber.id)
  .eq('slot_date', selectedDate)
  .order('start_time', { ascending: true });

const computedSlots = computeAvailableSlots(
  allSlots,
  bookings || [],
  minServiceDuration
);
```
- [ ] Fetches all slots (available + booked) ✓
- [ ] Uses computeAvailableSlots() ✓
- [ ] Fetches existing bookings ✓

**Check Line ~174-224:** Booking confirmation with manual fields
```typescript
const newBooking: Omit<ManualBooking, 'id'> = {
  // ... other fields ...
  customerId: null,
  source: 'manual',
  manualCustomerName: customerName.trim(),
  manualCustomerPhone: customerPhone,
  ...(finalServiceId ? { serviceId: finalServiceId } : {})
};
```
- [ ] customerId set to null ✓
- [ ] source set to 'manual' ✓
- [ ] manualCustomerName included ✓
- [ ] manualCustomerPhone included ✓
- [ ] serviceId lookup implemented ✓

---

## ✅ UI Components Verification

### 4. Booking Card (`/components/BookingCard.tsx`)

**Check Line ~3:** User icon imported
```typescript
import { Calendar, Clock, DollarSign, ChevronDown, X, RefreshCw, Repeat, Phone, Copy, User } from 'lucide-react';
```
- [ ] User icon imported ✓

**Check Line ~125:** Manual customer name display
```typescript
{viewAs === 'customer' 
  ? (booking.barber?.full_name || booking.barberName || 'Barber') 
  : ((booking as any).source === 'manual' 
      ? ((booking as any).manualCustomerName || 'Walk-in Customer') 
      : (booking.customer?.full_name || booking.customerName || 'Customer')
    )
}
```
- [ ] Shows manual customer name for barber view ✓
- [ ] Falls back to 'Walk-in Customer' ✓

**Check Line ~128-135:** Manual badge display
```typescript
{(booking as any).source === 'manual' && viewAs === 'barber' && (
  <Badge variant="outline" className="gap-1 text-xs bg-amber-50 text-amber-700 border-amber-300">
    <User className="w-3 h-3" />
    Manual
  </Badge>
)}
```
- [ ] Badge shown for manual bookings ✓
- [ ] Only visible to barbers ✓
- [ ] Amber styling applied ✓

---

## ✅ Type Definitions Verification

### 5. Type Definitions (`/types/index.ts`)

**Check Line ~61-108:** Booking interface updated
```typescript
export interface Booking {
  // ... existing fields ...
  customerId: string | null; // Nullable for manual bookings
  source?: 'online' | 'manual';
  notes?: string;
  manualCustomerName?: string;
  manualCustomerPhone?: string;
  // ...
}
```
- [ ] customerId is nullable ✓
- [ ] source field added ✓
- [ ] manualCustomerName field added ✓
- [ ] manualCustomerPhone field added ✓

**Check Line ~110-145:** ManualBooking interface aligned
```typescript
export interface ManualBooking {
  // ... existing fields ...
  customerId: string | null;
  serviceType: string;
  source: 'manual' | 'oral' | 'phone' | 'telegram' | 'whatsapp' | 'walkin' | 'other';
  slotId?: string;
  serviceId?: string;
  manualCustomerName?: string;
  manualCustomerPhone?: string;
}
```
- [ ] Consistent with Booking interface ✓
- [ ] Has required fields for slot booking ✓

---

## ✅ Database Schema Verification

### 6. Database Tables

**Run these queries to verify:**

```sql
-- Check bookings table structure
\d bookings;
```
- [ ] `customer_id` column is nullable
- [ ] `manual_customer_name` column exists (TEXT)
- [ ] `manual_customer_phone` column exists (TEXT)
- [ ] `source` column exists (TEXT)

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'bookings';
```
- [ ] Policy allows barbers to insert bookings
- [ ] Policy allows customer_id to be null for barbers

**Test queries:**

```sql
-- Test inserting a manual booking
INSERT INTO bookings (
  booking_code, barber_id, customer_id, service_type, 
  date, start_time, end_time, duration, price, status, 
  source, manual_customer_name, manual_customer_phone
) VALUES (
  'TEST-MANUAL-001', '<barber_uuid>', NULL, 'Haircut',
  '2024-12-20', '14:00', '14:45', 45, 50000, 'booked',
  'manual', 'Test Customer', '+998 90 123 45 67'
);
```
- [ ] Insert succeeds with customer_id = NULL ✓

```sql
-- Query manual bookings
SELECT * FROM bookings WHERE source = 'manual';
```
- [ ] Manual bookings returned ✓
- [ ] manual_customer_name populated ✓
- [ ] manual_customer_phone populated ✓

---

## ✅ Integration Testing

### 7. Customer Booking Flow

**Test Steps:**
1. Log in as customer
2. Select a barber
3. Click "Book Now"
4. Select service (e.g., 45-minute haircut)
5. Select date (e.g., today)
6. Select time slot (e.g., 9:00)
7. Confirm booking

**Expected Results:**
- [ ] Booking created with `source: 'online'`
- [ ] `customer_id` is set to authenticated customer
- [ ] `manual_customer_name` is NULL
- [ ] Slot marked as booked in database
- [ ] Booking appears in customer's booking list

### 8. Manual Booking Flow

**Test Steps:**
1. Log in as barber
2. Click "+ Manual Booking"
3. Enter customer name: "John Doe"
4. Enter phone: "+998 90 123 45 67"
5. Select service (e.g., 45-minute haircut)
6. Select same date as test #7
7. Select next available slot (should be shifted)
8. Confirm booking

**Expected Results:**
- [ ] Booking created with `source: 'manual'`
- [ ] `customer_id` is NULL
- [ ] `manual_customer_name` is "John Doe"
- [ ] `manual_customer_phone` is "+998 90 123 45 67"
- [ ] Slot marked as booked in database
- [ ] Booking appears in barber's booking list with "Manual" badge

### 9. Slot Shifting Verification

**Test Steps:**
1. As customer, book 45-min service at 9:00
2. As barber, open manual booking form
3. Select same date
4. Observe available time slots

**Expected Results:**
- [ ] 9:00 slot is NOT visible (booked)
- [ ] 9:30 slot is shifted to 9:50 (45 min + 5 min buffer)
- [ ] 10:00 slot appears at 10:00 (original time)
- [ ] Slot shifting is identical to what customer would see

### 10. Race Condition Prevention

**Test Steps:**
1. Open two browser windows
2. Window 1: Customer starts booking 9:00 slot
3. Window 2: Barber starts manual booking
4. Window 1: Customer confirms 9:00 slot
5. Window 2: Barber tries to book same 9:00 slot

**Expected Results:**
- [ ] Window 1 booking succeeds
- [ ] Window 2 shows error: "Slot is no longer available"
- [ ] No double-booking in database
- [ ] Both users can refresh and see correct available slots

---

## ✅ UI/UX Verification

### 11. Visual Elements

**Barber Dashboard:**
- [ ] "+ Manual Booking" button visible
- [ ] Manual booking form has customer info fields
- [ ] Time slots show with proper shifting
- [ ] Manual bookings show amber "Manual" badge
- [ ] Walk-in customer name displays correctly

**Customer Dashboard:**
- [ ] "Book Now" button works
- [ ] Time slots show with proper shifting
- [ ] No "Manual" badge visible to customers
- [ ] Customer bookings show barber name

**Booking Cards:**
- [ ] Barber view shows customer name or "Walk-in Customer"
- [ ] Customer view shows barber name
- [ ] Manual badge only visible to barbers
- [ ] All booking details display correctly

---

## ✅ Error Handling Verification

### 12. Error Scenarios

**Test these error cases:**

**Slot Already Booked:**
- [ ] Error message shown
- [ ] User prompted to select another slot

**Invalid Phone Number:**
- [ ] Validation error shown in manual booking form
- [ ] Cannot proceed without valid phone

**Network Error:**
- [ ] User-friendly error message
- [ ] Form state preserved
- [ ] User can retry

**Expired Session:**
- [ ] User redirected to login
- [ ] Booking data not lost

---

## 📊 Summary Checklist

### Code Implementation
- [x] Backend accepts both customers and barbers
- [x] Backend detects manual vs online source
- [x] Backend stores manual customer fields
- [x] Frontend passes manual fields in payload
- [x] Manual booking form uses shared slot logic
- [x] Manual booking form sets source='manual'
- [x] Booking card shows manual badge
- [x] Types updated with manual fields

### Database Schema
- [ ] customer_id is nullable
- [ ] manual_customer_name column exists
- [ ] manual_customer_phone column exists
- [ ] RLS policies updated

### Testing
- [ ] Customer booking flow works
- [ ] Manual booking flow works
- [ ] Slot shifting is consistent
- [ ] Race conditions prevented
- [ ] UI displays correctly
- [ ] Error handling works

---

## 🎯 Final Sign-Off

Once all checkboxes are marked, the implementation is complete and verified.

**Implementation Status:** Code Complete ✅  
**Database Status:** Pending Migration ⏳  
**Testing Status:** Pending Manual Testing ⏳

---

## 📝 Notes

Add any issues or observations during verification:

```
[Date] [Tester Name]
- Issue found: ...
- Resolution: ...
```

---

## End of Verification Checklist
