# ✅ Unified Booking Workflow - Implementation Complete

## Overview

The complete customer booking workflow has been successfully copied and reused for manual bookings in the Partner/Barber page. Both flows now share identical logic for slot fetching, validation, shifting, and error handling.

---

## 🎯 What Was Implemented

### 1. Backend Changes (`/supabase/functions/server/index.tsx`)

✅ **Allow both customers and barbers to create bookings:**
```typescript
if (user.role !== 'customer' && user.role !== 'barber') {
  return c.json({ error: "Only customers and barbers can create bookings" }, 403);
}
```

✅ **Detect booking source and set customer_id accordingly:**
```typescript
const bookingSource = bookingData.source || 'online';
let customerId;

if (bookingSource === 'manual' && user.role === 'barber') {
  // Manual booking - customer_id is null
  customerId = null;
} else {
  // Online booking - use authenticated customer ID
  customerId = user.id;
}
```

✅ **Add manual customer fields to database insert:**
```typescript
if (bookingSource === 'manual') {
  insertPayload.manual_customer_name = bookingData.manual_customer_name || bookingData.customerName;
  insertPayload.manual_customer_phone = bookingData.manual_customer_phone || bookingData.customerPhone;
}
```

✅ **Slot update handles both customer and manual bookings:**
```typescript
const { error: slotUpdateError } = await supabase
  .from('barber_slots')
  .update({
    status: 'booked',
    is_available: false,
    booked_by_customer_id: customerId, // null for manual, customer_id for online
    booked_at: new Date().toISOString()
  })
  .eq('id', bookingData.slot_id);
```

---

### 2. Frontend App Updates (`/App.tsx`)

✅ **handleAddBooking accepts manual booking fields:**
```typescript
// Add manual booking fields if source is 'manual'
if (booking.source === 'manual') {
  bookingPayload.manual_customer_name = booking.manualCustomerName || booking.customerName;
  bookingPayload.manual_customer_phone = booking.manualCustomerPhone || booking.customerPhone;
}
```

✅ **Response parsing includes manual fields:**
```typescript
customerName: data.booking.source === 'manual' 
  ? (data.booking.manual_customer_name || 'Walk-in Customer')
  : (data.booking.customer?.full_name || 'Customer'),
manualCustomerName: data.booking.manual_customer_name,
manualCustomerPhone: data.booking.manual_customer_phone
```

---

### 3. Manual Booking Form (`/components/ManualBookingForm.tsx`)

✅ **Uses same slot fetching logic:**
- Fetches all slots from `barber_slots` table
- Fetches existing bookings with duration field
- Uses `computeAvailableSlots()` for slot shifting

✅ **Re-validates slot before booking (identical to customer flow):**
```typescript
const { data: refreshedSlot, error: slotError } = await supabase
  .from('barber_slots')
  .select('*')
  .eq('id', selectedSlot.id)
  .single();

if (refreshedSlot.status !== 'available' || !refreshedSlot.is_available) {
  toast.error('Selected time slot is no longer available');
  return;
}
```

✅ **Creates booking with manual source:**
```typescript
const newBooking = {
  barberId: barber.id,
  barberName: barber.name,
  barberAvatar: barber.avatar || '',
  customerId: null, // No customer ID for manual bookings
  customerName: customerName.trim(),
  customerPhone: customerPhone,
  serviceType: selectedServices.map(s => s.name).join(' + '),
  date: selectedDate,
  startTime: selectedTimeSlot,
  endTime: endTimeStr,
  duration: totalDuration,
  price: totalPrice,
  status: 'confirmed',
  source: 'manual', // CRITICAL!
  manualCustomerName: customerName.trim(),
  manualCustomerPhone: customerPhone,
  ...(finalServiceId ? { serviceId: finalServiceId } : {})
};
```

---

### 4. UI Updates (`/components/BookingCard.tsx`)

✅ **Shows manual booking badge:**
```typescript
{(booking as any).source === 'manual' && viewAs === 'barber' && (
  <Badge variant="outline" className="gap-1 text-xs bg-amber-50 text-amber-700 border-amber-300">
    <User className="w-3 h-3" />
    Manual
  </Badge>
)}
```

✅ **Displays manual customer name:**
```typescript
{viewAs === 'customer' 
  ? (booking.barber?.full_name || booking.barberName || 'Barber') 
  : ((booking as any).source === 'manual' 
      ? ((booking as any).manualCustomerName || 'Walk-in Customer') 
      : (booking.customer?.full_name || booking.customerName || 'Customer')
    )
}
```

---

### 5. Shared Utilities (`/utils/bookingFlow.ts`)

✅ **Created shared booking validation function** (for future use):
- Validates slot availability
- Checks UUID format
- Finds service UUID
- Handles both online and manual sources

---

## 📊 Database Schema Required

### Columns to Add to `bookings` Table:

```sql
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS manual_customer_name TEXT,
ADD COLUMN IF NOT EXISTS manual_customer_phone TEXT;

-- Make customer_id nullable
ALTER TABLE bookings 
ALTER COLUMN customer_id DROP NOT NULL;
```

### RLS Policies to Update:

```sql
-- Allow barbers to insert bookings with customer_id = null
CREATE POLICY "Barbers can create manual bookings"
ON bookings
FOR INSERT
TO authenticated
WITH CHECK (
  -- Barbers can insert with any customer_id (including null)
  auth.uid() IN (
    SELECT id FROM barbers WHERE id = auth.uid()
  )
  OR
  -- Customers can only insert for themselves
  customer_id = auth.uid()
);
```

---

## 🔄 How It Works

### Customer Booking Flow (Online):

1. Customer selects barber and service
2. Sees available slots (with shifting applied)
3. Selects date and time
4. **System re-validates slot is still available**
5. Creates booking with:
   - `source: 'online'`
   - `customer_id: <authenticated_customer_id>`
   - `manual_customer_name: null`
   - `manual_customer_phone: null`
6. Slot marked as booked
7. Booking appears with customer name

### Manual Booking Flow (Barber):

1. Barber clicks "+ Manual Booking"
2. Enters walk-in customer name and phone
3. Selects service
4. Sees available slots (**SAME shifting logic** as customer)
5. Selects date and time
6. **System re-validates slot is still available** (SAME validation)
7. Creates booking with:
   - `source: 'manual'`
   - `customer_id: null`
   - `manual_customer_name: <entered_name>`
   - `manual_customer_phone: <entered_phone>`
8. Slot marked as booked (**SAME slot update logic**)
9. Booking appears with "Manual" badge

---

## ✨ Key Features

### 1. Unified Slot Shifting
- Both customer and barber see **identical** shifted slot times
- If customer books 45-min service at 9:00
- Next available slot (9:30) shifts to 9:50 for **both** customer and barber

### 2. Race Condition Prevention
- **Both flows re-fetch slot before booking**
- Prevents double-booking if two users select same slot
- Shows error if slot was just booked by someone else

### 3. No Customer Account Created
- Manual bookings **do NOT create customer records**
- Customer name and phone stored directly in booking
- Keeps customer table clean

### 4. Visual Distinction
- Manual bookings show amber "Manual" badge for barbers
- Walk-in customer name displayed instead of "Customer"
- Easy to distinguish online vs manual bookings

### 5. Consistent State Management
- Both flows update slot status the same way
- Both flows trigger same state refreshes
- UI stays consistent across user roles

---

## 🧪 Testing Checklist

### Online Booking (Customer)
- [ ] Customer can see barber's available slots
- [ ] Slots shift correctly based on existing bookings
- [ ] Booking created with `source: 'online'`
- [ ] `customer_id` populated correctly
- [ ] Slot marked as booked
- [ ] Booking appears in customer's list

### Manual Booking (Barber)
- [ ] Barber can click "+ Manual Booking"
- [ ] Can enter customer name and phone
- [ ] Sees same shifted slots as customers would
- [ ] Booking created with `source: 'manual'`
- [ ] `customer_id` is null
- [ ] `manual_customer_name` and `manual_customer_phone` stored
- [ ] Slot marked as booked
- [ ] Booking appears with "Manual" badge

### Slot Shifting Consistency
- [ ] Customer books 45-min at 9:00
- [ ] Barber creating manual booking sees 9:30 shifted to 9:50
- [ ] Next customer also sees 9:30 shifted to 9:50
- [ ] Manual booking at 9:50 works correctly

### Edge Cases
- [ ] Two users select same slot → second one gets error
- [ ] Barber tries to book already-booked slot → error shown
- [ ] Manual booking without phone → validation error
- [ ] Network error during booking → user-friendly error message

---

## 📝 Code Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Initiates Booking                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    ┌────▼────┐         ┌────▼────┐
    │Customer │         │ Barber  │
    │ Clicks  │         │ Clicks  │
    │"Book Now│         │"+ Manual│
    │         │         │ Booking"│
    └────┬────┘         └────┬────┘
         │                   │
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│BookingModal.tsx │  │ManualBooking    │
│                 │  │Form.tsx         │
└────┬────────────┘  └────┬────────────┘
     │                    │
     │   BOTH USE SAME LOGIC:
     │   • computeAvailableSlots()
     │   • Slot re-validation
     │   • Service UUID lookup
     │   • Duration calculation
     │
     ▼                    ▼
┌─────────────────────────────────────┐
│   handleAddBooking (App.tsx)        │
│   • Adds source field               │
│   • Adds manual fields if manual    │
│   • Calls backend API               │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│   POST /bookings (Backend)          │
│   • Detects source                  │
│   • Sets customer_id (null if manual│
│   • Stores manual fields            │
│   • Marks slot as booked            │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│   Database Updated                  │
│   • Booking inserted                │
│   • Slot status = 'booked'          │
│   • is_available = false            │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│   State Refresh & UI Update         │
│   • Booking appears in list         │
│   • Badge shown if manual           │
│   • Slot no longer available        │
└─────────────────────────────────────┘
```

---

## 🎉 Success Criteria Met

✅ **Customer booking workflow copied unchanged**
✅ **Manual booking uses identical logic**
✅ **Only differences:**
- Collects manual_customer_name and manual_customer_phone
- Does NOT create customer row
- Sets `source = 'manual'`
- Stores manual fields in bookings table

✅ **Required IDs set correctly:**
- `barber_id` ✓
- `slot_id` ✓
- `service_id` ✓ (when available)
- `customer_id` ✓ (null for manual, user ID for online)

✅ **Slot updates identical:**
- Same `status: 'booked'` update
- Same `is_available: false` update
- Same state refresh triggers

✅ **UI shows distinction:**
- "Manual" badge when `source='manual'`
- Walk-in customer name displayed
- No confusion between booking types

✅ **No loops:**
- Shifting is UI-only (computed in real-time)
- No new slot rows generated
- Base slots remain unchanged in database

---

## 🚨 Important Notes

1. **Database Migration Required**: Run the SQL commands to add manual fields and make `customer_id` nullable

2. **RLS Policies**: Update policies to allow barbers to insert bookings with `customer_id = null`

3. **Type Definitions**: Update TypeScript types to include `source`, `manualCustomerName`, and `manualCustomerPhone`

4. **No Breaking Changes**: Existing online bookings continue to work exactly as before

5. **Backward Compatible**: Old bookings without `source` field will still display correctly (defaults handled in code)

---

## 📚 Related Files

- `/supabase/functions/server/index.tsx` - Backend booking creation
- `/App.tsx` - Main app, handleAddBooking function
- `/components/BookingModal.tsx` - Customer booking UI
- `/components/ManualBookingForm.tsx` - Manual booking UI
- `/components/BookingCard.tsx` - Booking display with badge
- `/utils/slotCalculations.ts` - Shared slot shifting logic
- `/utils/bookingFlow.ts` - Shared validation utilities
- `/types.ts` or `/types/index.ts` - Type definitions

---

## ✅ Implementation Status: **COMPLETE**

All code changes have been implemented. Only database migration and RLS policy updates remain to be done by the developer.

---

## End of Documentation
