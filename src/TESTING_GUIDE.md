# 🧪 Complete Testing Guide - Manual Booking Implementation

## Pre-Testing Setup

### 1. Database Migration
**IMPORTANT: Run the database migration first!**

```bash
# Open Supabase SQL Editor and run:
cat database-migration.sql
# Copy and paste the contents into the SQL Editor
# Execute the script
```

**Verify migration:**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('manual_customer_name', 'manual_customer_phone', 'customer_id', 'source');
```

Expected result:
```
manual_customer_name | text | YES
manual_customer_phone | text | YES
customer_id | uuid | YES (changed from NO)
source | text | YES
```

---

## Test Scenario 1: Customer Online Booking

### Setup:
1. Log in as a **customer**
2. Navigate to "Find Barbers" page
3. Select a barber with available slots

### Test Steps:

**Step 1: View Available Slots**
- [ ] Barber's available dates are displayed
- [ ] Time slots are shown for selected date
- [ ] Past time slots are grayed out
- [ ] Loading indicator shows while fetching slots

**Step 2: Create Booking**
- [ ] Select a service (e.g., "Haircut - 45 min")
- [ ] Select a date (e.g., tomorrow)
- [ ] Select a time slot (e.g., 09:00)
- [ ] Click "Next" → Confirm booking
- [ ] Click "Confirm Booking"

**Step 3: Verify Booking Created**
- [ ] Success message appears
- [ ] Booking appears in "My Bookings" tab
- [ ] Booking shows correct:
  - Customer name (your name)
  - Service type
  - Date and time
  - Price
  - Status: "Confirmed"
- [ ] **NO "Manual" badge displayed** (customer booking)

**Step 4: Check Database**
```sql
SELECT 
  booking_code,
  customer_id,
  source,
  manual_customer_name,
  manual_customer_phone,
  status
FROM bookings
ORDER BY created_at DESC
LIMIT 1;
```

Expected:
- `source` = `'online'` or `NULL`
- `customer_id` = your customer UUID (not null)
- `manual_customer_name` = `NULL`
- `manual_customer_phone` = `NULL`

---

## Test Scenario 2: Barber Manual Booking

### Setup:
1. Log in as a **barber**
2. Navigate to "Partner Dashboard"
3. Ensure you have available slots for today/tomorrow

### Test Steps:

**Step 1: Open Manual Booking Form**
- [ ] Click "+ Manual Booking" button (desktop) or FAB button (mobile)
- [ ] Modal opens with 4-step wizard
- [ ] Progress bar shows "Customer" step highlighted

**Step 2: Enter Customer Information**
- [ ] Enter customer name: "Walk-in Customer Test"
- [ ] Enter phone number: +998 90 123 45 67
- [ ] Phone formats automatically as you type
- [ ] Click "Next"

**Step 3: Select Service**
- [ ] Your services are displayed with duration and price
- [ ] Select one or more services
- [ ] Total duration and price calculated correctly
- [ ] Click "Next"

**Step 4: Select Date and Time**
- [ ] Available dates shown (next 14 days)
- [ ] Select tomorrow's date
- [ ] **CRITICAL**: Check if time slots match customer view:
  - If you have a booking at 9:00 for 45 minutes
  - The 9:30 slot should show as **9:50** (shifted)
- [ ] Select an available time slot
- [ ] Click "Next"

**Step 5: Confirm and Submit**
- [ ] Review screen shows:
  - Customer name: "Walk-in Customer Test"
  - Phone: +998 90 123 45 67
  - Service, date, time, duration, price
- [ ] Click "Confirm Booking"
- [ ] Success message appears
- [ ] Modal auto-closes after 2 seconds

**Step 6: Verify Booking Created**
- [ ] Booking appears in "Bookings" tab on dashboard
- [ ] **"Manual" badge is displayed** with amber/yellow color
- [ ] Customer name shows "Walk-in Customer Test" (not "Customer")
- [ ] All booking details correct

**Step 7: Check Database**
```sql
SELECT 
  booking_code,
  customer_id,
  source,
  manual_customer_name,
  manual_customer_phone,
  status
FROM bookings
WHERE source = 'manual'
ORDER BY created_at DESC
LIMIT 1;
```

Expected:
- `source` = `'manual'`
- `customer_id` = `NULL` (critical!)
- `manual_customer_name` = `'Walk-in Customer Test'`
- `manual_customer_phone` = `'+998 90 123 45 67'`
- `status` = `'booked'`

---

## Test Scenario 3: Slot Shifting Consistency

### Setup:
This test verifies that both customer and barber see the same shifted slot times.

### Test Steps:

**Step 1: Create First Booking (as Customer)**
- [ ] Log in as **customer**
- [ ] Book a 45-minute service at **09:00** for tomorrow
- [ ] Booking created successfully

**Step 2: Check Shifted Slots (as Customer)**
- [ ] Still logged in as **customer**
- [ ] Try to book same barber again for tomorrow
- [ ] **Check 09:30 slot**:
  - Should be **hidden** or **shifted to 09:50**
  - Should have 9:00 slot unavailable
- [ ] Note the shifted time

**Step 3: Check Shifted Slots (as Barber)**
- [ ] Log in as **barber** (the one from step 1)
- [ ] Click "+ Manual Booking"
- [ ] Enter customer info, select service
- [ ] Select **tomorrow's date**
- [ ] **Check available time slots**:
  - 09:00 should be unavailable
  - 09:30 should show as **09:50** (shifted)
  - **MUST match what customer saw**

**Step 4: Create Manual Booking at Shifted Time**
- [ ] Select the shifted time (e.g., 09:50)
- [ ] Complete manual booking
- [ ] Booking created successfully

**Step 5: Verify Slot Marked as Booked**
```sql
SELECT 
  slot_date,
  start_time,
  end_time,
  status,
  is_available
FROM barber_slots
WHERE barber_id = '<your-barber-uuid>'
  AND slot_date = '<tomorrow-date>'
  AND start_time BETWEEN '09:00' AND '10:00'
ORDER BY start_time;
```

Expected:
- 09:00 slot: `status='booked'`, `is_available=false`
- 09:30 slot: `status='booked'`, `is_available=false`
- Other slots: `status='available'`, `is_available=true`

---

## Test Scenario 4: Race Condition Prevention

### Setup:
This tests that slot re-validation prevents double-booking.

### Test Steps:

**Step 1: Simulate Race Condition**
- [ ] Open two browser tabs
- [ ] **Tab 1**: Log in as customer A
- [ ] **Tab 2**: Log in as customer B
- [ ] Both tabs: Navigate to same barber
- [ ] Both tabs: Select same service and same time slot
- [ ] Both tabs: Click through to confirmation screen

**Step 2: Submit Bookings Simultaneously**
- [ ] **Tab 1**: Click "Confirm Booking"
- [ ] **Tab 2**: Immediately click "Confirm Booking"

**Expected Result:**
- [ ] **One booking succeeds** (first one)
- [ ] **Other booking fails** with error:
  - "Selected time slot is no longer available" OR
  - "Selected time slot has already been booked"
- [ ] Only ONE booking created in database
- [ ] Slot marked as booked only once

---

## Test Scenario 5: UI Display & Badges

### Test Steps:

**Step 1: Check Customer View**
- [ ] Log in as **customer**
- [ ] Go to "My Bookings"
- [ ] **Online bookings**:
  - Shows barber name
  - Shows service type
  - **NO "Manual" badge**

**Step 2: Check Barber View**
- [ ] Log in as **barber**
- [ ] Go to Partner Dashboard → Bookings
- [ ] **Online bookings** (from customers):
  - Shows customer name from customer account
  - No "Manual" badge
- [ ] **Manual bookings** (created by you):
  - Shows walk-in customer name (e.g., "Walk-in Customer Test")
  - **"Manual" badge displayed** with amber/yellow color
  - Badge has user icon

---

## Test Scenario 6: Error Handling

### Test Steps:

**Test 6.1: Invalid Phone Number**
- [ ] Open manual booking form
- [ ] Enter customer name
- [ ] Enter invalid phone (e.g., "+998 12 345")
- [ ] Try to proceed to next step
- [ ] **Error shown**: "Invalid phone number"

**Test 6.2: No Service Selected**
- [ ] Open manual booking form
- [ ] Enter customer info
- [ ] Don't select any service
- [ ] Try to proceed
- [ ] **Error shown**: "Please select a service"

**Test 6.3: No Time Slot Selected**
- [ ] Open manual booking form
- [ ] Complete customer and service steps
- [ ] Don't select time slot
- [ ] Try to proceed
- [ ] **Error shown**: "Please select date and time"

**Test 6.4: Slot Already Booked**
- [ ] Start manual booking flow
- [ ] Select a time slot
- [ ] **In another tab**: Book the same slot as a customer
- [ ] Return to manual booking tab
- [ ] Try to confirm booking
- [ ] **Error shown**: "Selected time slot is no longer available"

---

## Test Scenario 7: Backend Logging

### Test Steps:

**Step 1: Check Console Logs (Customer Booking)**
- [ ] Open browser dev tools (F12)
- [ ] Go to Console tab
- [ ] Create a customer booking
- [ ] Look for logs with `[BOOKING]` prefix:
  - `[BOOKING] Online booking by customer`
  - `[BOOKINGS] Creating booking`
  - `✅ Booking created via API`

**Step 2: Check Console Logs (Manual Booking)**
- [ ] Keep dev tools open
- [ ] Create a manual booking
- [ ] Look for logs with `[MANUAL BOOKING]` prefix:
  - `[MANUAL BOOKING] Fetching slots`
  - `[MANUAL BOOKING] Submitting booking`
  - `[BOOKING] Manual booking by barber`
  - `[BOOKINGS] Added manual fields`

**Step 3: Check Server Logs**
- [ ] Open Supabase Dashboard
- [ ] Go to Logs → Edge Functions
- [ ] Filter for recent POST /bookings calls
- [ ] Check for:
  - `Manual booking by barber` (for manual)
  - `Online booking by customer` (for online)
  - `Added manual fields` (for manual)
  - `✅ Slot marked as booked`

---

## Test Scenario 8: Mobile Responsive Design

### Test Steps:

**Mobile - Customer Booking**
- [ ] Open on mobile device or responsive mode (375px width)
- [ ] Navigate to barber list
- [ ] Select barber and open booking modal
- [ ] Modal is fully visible and scrollable
- [ ] Service cards stack vertically
- [ ] Date/time grids adjust to mobile
- [ ] Buttons are touch-friendly (min 44px height)

**Mobile - Manual Booking**
- [ ] Open barber dashboard on mobile
- [ ] **FAB button visible** in bottom-right corner
- [ ] Click FAB → Manual booking modal opens
- [ ] Form is fully visible and usable
- [ ] Phone number input keyboard shows on mobile
- [ ] All steps navigable on mobile

---

## Test Scenario 9: Data Integrity

### Test Steps:

**Check Database Consistency**
```sql
-- Count bookings by source
SELECT 
  source,
  COUNT(*) as count,
  COUNT(CASE WHEN customer_id IS NULL THEN 1 END) as null_customers,
  COUNT(CASE WHEN manual_customer_name IS NOT NULL THEN 1 END) as with_manual_name
FROM bookings
GROUP BY source;
```

Expected:
- Online bookings: `customer_id` is never null
- Manual bookings: `customer_id` is always null
- Manual bookings: `manual_customer_name` is always set

**Check Slot Consistency**
```sql
-- Verify all booked slots have corresponding bookings
SELECT 
  bs.id as slot_id,
  bs.start_time,
  bs.status as slot_status,
  b.id as booking_id,
  b.source
FROM barber_slots bs
LEFT JOIN bookings b ON bs.id = b.slot_id
WHERE bs.status = 'booked'
  AND bs.slot_date >= CURRENT_DATE
ORDER BY bs.slot_date, bs.start_time;
```

Expected:
- Every `status='booked'` slot has a matching booking
- No orphaned booked slots
- Both online and manual bookings shown

---

## Test Scenario 10: Cancellation & Cleanup

### Test Steps:

**Cancel Manual Booking**
- [ ] As barber, view a manual booking
- [ ] Click "Cancel Booking"
- [ ] Confirm cancellation
- [ ] Booking status changes to "cancelled"
- [ ] Slot becomes available again
- [ ] Manual badge still shows (booking still manual source)

**Cancel Customer Booking**
- [ ] As customer, view an online booking
- [ ] Click "Cancel Booking"
- [ ] Confirm cancellation
- [ ] Booking status changes to "cancelled"
- [ ] Slot becomes available again

---

## Regression Testing Checklist

Ensure existing features still work:

- [ ] Customer registration/login still works
- [ ] Barber registration/login still works
- [ ] Service management (add/edit/delete) still works
- [ ] Slot creation by barbers still works
- [ ] Customer can still search for barbers
- [ ] Customer can still filter barbers by district/language
- [ ] Booking history displays correctly
- [ ] Profile updates work for both customers and barbers
- [ ] Subscription management still works for barbers

---

## Performance Testing

### Load Test Slot Fetching
```javascript
// Run in browser console
async function testSlotFetching() {
  const start = performance.now();
  
  // Simulate fetching slots
  const response = await fetch('/api/barber-slots?barber_id=<uuid>&date=2025-01-01');
  const data = await response.json();
  
  const end = performance.now();
  console.log(`Slot fetch took ${end - start}ms`);
  console.log(`Fetched ${data.length} slots`);
}

testSlotFetching();
```

**Expected**: < 500ms for typical slot fetch

---

## Common Issues & Solutions

### Issue: "customer_id violates not-null constraint"
**Solution**: Run database migration to make `customer_id` nullable

### Issue: Manual bookings show as "Customer" instead of walk-in name
**Solution**: Check BookingCard.tsx uses `booking.source === 'manual'` check

### Issue: Slot shifting not working for manual bookings
**Solution**: Verify ManualBookingForm uses `computeAvailableSlots()`

### Issue: "Manual" badge not showing
**Solution**: Check booking has `source: 'manual'` in database

### Issue: Barber cannot create manual booking
**Solution**: Update RLS policy to allow barbers to insert with `customer_id = null`

---

## Success Criteria

✅ All tests pass  
✅ No console errors  
✅ Both customer and barber see same slot times  
✅ Manual bookings show "Manual" badge  
✅ No customer accounts created for manual bookings  
✅ Slot shifting works identically for both flows  
✅ Race conditions prevented  
✅ Mobile responsive  
✅ Database integrity maintained  

---

## Final Verification Command

Run this SQL to verify everything is set up correctly:

```sql
-- Comprehensive verification query
SELECT 
  'Database Schema' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name = 'manual_customer_name'
    ) THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as result
UNION ALL
SELECT 
  'customer_id nullable',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name = 'customer_id' 
      AND is_nullable = 'YES'
    ) THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END
UNION ALL
SELECT 
  'Manual bookings exist',
  CASE 
    WHEN EXISTS (SELECT 1 FROM bookings WHERE source = 'manual') 
    THEN '✅ PASS' 
    ELSE '⚠️ WARNING: No manual bookings yet' 
  END
UNION ALL
SELECT 
  'RLS policy for barbers',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'bookings' 
      AND policyname LIKE '%manual%' OR policyname LIKE '%Unified%'
    ) THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END;
```

**All checks should show ✅ PASS (except manual bookings warning before first test)**

---

## End of Testing Guide

Good luck with testing! 🚀
