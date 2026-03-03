# 🧪 Test Scenarios - Unified Booking Workflow

Complete test scenarios for verifying the manual booking implementation works identically to customer booking.

---

## 🎭 Test Users

### Test Customer
- **Name:** Test Customer
- **Phone:** +998 90 111 11 11
- **Role:** customer
- **Purpose:** Create online bookings

### Test Barber
- **Name:** Test Barber  
- **Phone:** +998 90 222 22 22
- **Role:** barber
- **Purpose:** Create manual bookings

---

## 📋 Test Scenario 1: Basic Customer Booking

### Objective
Verify customer can create an online booking and slot is correctly marked as booked.

### Prerequisites
- Test Customer logged in
- Test Barber has slots available for today

### Steps
1. Navigate to home page
2. Find Test Barber in barber list
3. Click "Book Now" on Test Barber's card
4. Select service: "Haircut" (45 minutes, 50,000 UZS)
5. Click "Next"
6. Select today's date
7. Select time slot: 9:00
8. Click "Next"
9. Review booking details
10. Click "Confirm Booking"

### Expected Results
✅ Booking modal shows success animation  
✅ Success toast: "Booking confirmed!"  
✅ Modal auto-closes after 3 seconds  
✅ Booking appears in customer's "My Bookings"  
✅ Database check: `source = 'online'`  
✅ Database check: `customer_id = <test_customer_uuid>`  
✅ Database check: `manual_customer_name IS NULL`  
✅ Slot status changed to 'booked' in `barber_slots`  

### Database Verification
```sql
SELECT * FROM bookings 
WHERE customer_id = '<test_customer_uuid>' 
ORDER BY created_at DESC 
LIMIT 1;

-- Should show:
-- source: 'online'
-- customer_id: <uuid>
-- manual_customer_name: NULL
-- manual_customer_phone: NULL
```

---

## 📋 Test Scenario 2: Basic Manual Booking

### Objective
Verify barber can create a manual booking for walk-in customer.

### Prerequisites
- Test Barber logged in
- Test Barber has slots available for today

### Steps
1. Navigate to barber dashboard
2. Click "+ Manual Booking" button
3. Enter customer name: "John Doe"
4. Enter phone: "+998 90 333 33 33"
5. Click "Next"
6. Select service: "Haircut" (45 minutes, 50,000 UZS)
7. Click "Next"
8. Select today's date
9. Select time slot: 10:00
10. Click "Next"
11. Review booking details
12. Click "Confirm Booking"

### Expected Results
✅ Manual booking form shows success state  
✅ Success toast: "Manual booking created!"  
✅ Form auto-closes after 2 seconds  
✅ Booking appears in barber's today's schedule  
✅ Booking shows amber "Manual" badge  
✅ Customer name shows "John Doe" (not "Customer")  
✅ Database check: `source = 'manual'`  
✅ Database check: `customer_id IS NULL`  
✅ Database check: `manual_customer_name = 'John Doe'`  
✅ Database check: `manual_customer_phone = '+998 90 333 33 33'`  
✅ Slot status changed to 'booked' in `barber_slots`  

### Database Verification
```sql
SELECT * FROM bookings 
WHERE barber_id = '<test_barber_uuid>' 
AND source = 'manual'
ORDER BY created_at DESC 
LIMIT 1;

-- Should show:
-- source: 'manual'
-- customer_id: NULL
-- manual_customer_name: 'John Doe'
-- manual_customer_phone: '+998 90 333 33 33'
```

---

## 📋 Test Scenario 3: Slot Shifting Consistency

### Objective
Verify slot shifting logic is identical for both customer and manual booking flows.

### Prerequisites
- Test Barber has clean schedule for tomorrow
- Slots available: 9:00, 9:30, 10:00, 10:30, 11:00

### Steps - Part A (Customer Books)
1. Log in as Test Customer
2. Book 45-minute service at 9:00 for tomorrow
3. Confirm booking succeeds

### Steps - Part B (Verify Shifting for Next Customer)
4. Log out, log in as different customer (or use incognito)
5. Try to book same barber for tomorrow
6. Check available time slots

### Expected Results - Part B
✅ 9:00 slot is NOT visible (already booked)  
✅ 9:30 slot is NOT visible (insufficient time: needs 45 min + 5 min buffer)  
✅ 9:50 slot IS visible (shifted from 9:30)  
✅ 10:00 slot is visible at 10:00 (original time)  
✅ 10:30 slot is visible at 10:30 (original time)  

### Steps - Part C (Verify Shifting for Manual Booking)
7. Log in as Test Barber
8. Open "+ Manual Booking" form
9. Enter customer info
10. Select same date (tomorrow)
11. Check available time slots

### Expected Results - Part C
✅ Time slots are IDENTICAL to Part B  
✅ 9:00 is NOT visible  
✅ 9:30 is NOT visible  
✅ 9:50 IS visible (shifted)  
✅ 10:00 is visible at 10:00  
✅ Manual booking at 9:50 succeeds  

### Verification
```
Customer booking at 9:00 → blocks 9:00-9:45
Next available: 9:50 (original 9:30 + 20 min shift)

Both customer and barber see SAME shifted times!
```

---

## 📋 Test Scenario 4: Race Condition Prevention

### Objective
Verify that two users cannot book the same slot simultaneously.

### Prerequisites
- Test Barber has slot available at 14:00 today

### Steps
1. **Window 1** (Customer): Log in as Test Customer
2. **Window 2** (Barber): Log in as Test Barber
3. **Window 1**: Start booking process for 14:00 slot
4. **Window 2**: Open manual booking form
5. **Window 1**: Select service, date, time 14:00, click "Next"
6. **Window 2**: Enter customer info, select service
7. **Window 1**: Review and click "Confirm Booking" ⏱️ **FIRST**
8. Wait for Window 1 success confirmation
9. **Window 2**: Select same date, try to select time 14:00
10. **Window 2**: Try to confirm booking

### Expected Results
✅ Window 1: Booking succeeds, slot marked as booked  
✅ Window 2: When trying to confirm, sees error toast  
✅ Error message: "Selected time slot is no longer available"  
✅ Window 2: Redirected back to time selection  
✅ Window 2: 14:00 slot no longer appears in available list  
✅ Window 2: Must select different time slot  
✅ Database: Only ONE booking exists for 14:00 slot  
✅ No duplicate bookings created  

### Re-validation Check
```typescript
// This code runs before booking creation:
const { data: refreshedSlot } = await supabase
  .from('barber_slots')
  .select('*')
  .eq('id', selectedSlot.id)
  .single();

if (refreshedSlot.status !== 'available') {
  // ERROR: Slot is no longer available
}
```

---

## 📋 Test Scenario 5: Multiple Services Booking

### Objective
Verify booking with multiple services calculates duration correctly.

### Prerequisites
- Test Barber offers: Haircut (45 min), Beard Trim (30 min)

### Steps
1. Log in as Test Customer
2. Click "Book Now" on Test Barber
3. Select BOTH services:
   - ✅ Haircut (45 min, 50,000 UZS)
   - ✅ Beard Trim (30 min, 30,000 UZS)
4. Verify summary shows:
   - Total: 75 minutes
   - Total: 80,000 UZS
5. Click "Next"
6. Select date and time: 11:00
7. Confirm booking

### Expected Results
✅ Booking created with `duration = 75`  
✅ Booking shows `service_type = "Haircut + Beard Trim"`  
✅ End time calculated correctly: 12:15 (11:00 + 75 min)  
✅ Database shows correct duration  
✅ Next available slot considers full 75-minute duration  
✅ 11:30 slot is blocked (insufficient time)  
✅ 12:20 slot is available (after 12:15 + 5 min buffer)  

### Manual Booking Variant
Repeat test with manual booking form - results should be IDENTICAL.

---

## 📋 Test Scenario 6: Manual Booking Without Phone

### Objective
Verify phone validation in manual booking form.

### Prerequisites
- Test Barber logged in

### Steps
1. Click "+ Manual Booking"
2. Enter customer name: "Jane Doe"
3. Leave phone field empty (or incomplete)
4. Click "Next"

### Expected Results
✅ Error shown: "Invalid phone number"  
✅ Cannot proceed to next step  
✅ Phone field highlighted in red  
✅ Must enter complete phone: "+998 XX XXX XX XX"  
✅ After entering valid phone, can proceed  

---

## 📋 Test Scenario 7: Cancel Manual Booking

### Objective
Verify manual booking can be cancelled and slot becomes available again.

### Prerequisites
- Manual booking exists for 15:00 today

### Steps
1. Log in as Test Barber
2. View today's schedule
3. Find manual booking (with "Manual" badge)
4. Click booking to expand details
5. Click "Cancel Booking"
6. Confirm cancellation

### Expected Results
✅ Booking status changes to 'cancelled'  
✅ Booking still visible in history (not deleted)  
✅ Slot status changes back to 'available'  
✅ 15:00 slot appears in available slots for new bookings  
✅ Customer attempting to book sees 15:00 as available  

### Database Verification
```sql
-- Booking should be cancelled, not deleted
SELECT * FROM bookings WHERE id = '<booking_id>';
-- status: 'cancelled'
-- cancelled_at: <timestamp>

-- Slot should be available again
SELECT * FROM barber_slots WHERE id = '<slot_id>';
-- status: 'available'
-- is_available: true
```

---

## 📋 Test Scenario 8: UI Badge Visibility

### Objective
Verify "Manual" badge displays correctly based on user role.

### Prerequisites
- One online booking and one manual booking exist for Test Barber today

### Steps - Part A (Barber View)
1. Log in as Test Barber
2. View "Today's Schedule"
3. Observe booking cards

### Expected Results - Part A
✅ Online booking: NO badge, shows customer name from `customers` table  
✅ Manual booking: AMBER "Manual" badge visible  
✅ Manual booking: Shows walk-in customer name from `manual_customer_name`  

### Steps - Part B (Customer View)
4. Log out, log in as Test Customer (who made the online booking)
5. View "My Bookings"
6. Observe booking card

### Expected Results - Part B
✅ Online booking: NO badge visible  
✅ Shows barber name  
✅ Customer cannot see other bookings (including manual ones)  

### Visual Check
```
Barber Dashboard:
┌─────────────────────────────────┐
│ John Doe              [Manual]  │ ← Manual badge
│ Haircut                         │
│ 10:00 - 10:45                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Alice Smith                     │ ← No badge (online)
│ Haircut                         │
│ 11:00 - 11:45                   │
└─────────────────────────────────┘
```

---

## 📋 Test Scenario 9: Service UUID Lookup

### Objective
Verify service_id is correctly looked up and stored.

### Prerequisites
- Test Barber has database-backed services with UUIDs

### Steps
1. Log in as Test Customer
2. Book "Haircut" service
3. Confirm booking

### Expected Results
✅ Booking created successfully  
✅ Database check: `service_id = <uuid>` (not NULL)  
✅ `service_id` matches UUID from `services` table  
✅ If service not found by UUID: `service_id = NULL` (still works)  

### Database Verification
```sql
-- Check booking has service_id
SELECT id, service_type, service_id FROM bookings 
WHERE id = '<booking_id>';

-- Verify service_id matches
SELECT id, name FROM services 
WHERE id = '<service_id>';
```

### Manual Booking Variant
Same logic applies to manual bookings - service_id lookup is identical.

---

## 📋 Test Scenario 10: Network Error Handling

### Objective
Verify graceful error handling when network fails.

### Steps
1. Open browser DevTools → Network tab
2. Enable "Offline" mode
3. Log in as Test Customer
4. Try to book a service
5. Click "Confirm Booking"

### Expected Results
✅ Loading indicator appears  
✅ After timeout, error toast shown  
✅ Error message: "Failed to create booking"  
✅ Form state preserved (don't lose selections)  
✅ User can retry after going back online  

### Partial Failure Scenario
1. Book service successfully
2. Simulate network failure AFTER booking creation
3. Check if slot update fails

### Expected Results
✅ Booking still created (backend succeeded)  
✅ Warning logged: "Failed to update slot status"  
✅ Slot should still be marked (backend handles it)  
✅ Frontend refreshes and shows correct state  

---

## 📊 Performance Test Scenarios

### P1: Concurrent Bookings

**Objective:** Test system under load with multiple simultaneous bookings.

**Setup:**
- 10 customers try to book different slots simultaneously
- 5 barbers create manual bookings simultaneously

**Expected:**
- All bookings complete successfully
- No duplicate bookings
- No slots marked incorrectly
- Response time < 2 seconds per booking

### P2: Slot Calculation Performance

**Objective:** Verify slot calculation doesn't slow down with many bookings.

**Setup:**
- Barber has 50 bookings for the month
- Customer views available slots for that barber

**Expected:**
- Slot calculation completes < 500ms
- UI remains responsive
- All slot shifts calculated correctly

---

## 🔒 Security Test Scenarios

### S1: Cross-User Booking Prevention

**Objective:** Verify customer cannot create booking for another customer.

**Steps:**
1. Capture booking API request from Customer A
2. Modify `customer_id` to Customer B's UUID
3. Send modified request

**Expected:**
- Request rejected: "Unauthorized"
- Backend validates `customer_id === user.id`

### S2: Customer Cannot Create Manual Booking

**Objective:** Verify only barbers can create manual bookings.

**Steps:**
1. Capture manual booking request from barber
2. Send request with customer's auth token

**Expected:**
- Request rejected: "Only customers and barbers can create bookings"
- Backend checks `user.role === 'barber'` for manual bookings

---

## 📝 Regression Test Checklist

After any code changes, verify:

- [ ] Customer booking still works
- [ ] Manual booking still works
- [ ] Slot shifting is correct
- [ ] Race condition prevention works
- [ ] Badges display correctly
- [ ] Database fields populated correctly
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Backend logs show correct flow
- [ ] All API endpoints respond correctly

---

## 🎯 Acceptance Criteria

All scenarios must pass for implementation to be considered complete:

- ✅ Customer booking creates `source: 'online'`
- ✅ Manual booking creates `source: 'manual'`
- ✅ Slot shifting is identical for both flows
- ✅ Race conditions prevented
- ✅ Manual badge shows correctly
- ✅ No customer account created for manual bookings
- ✅ Database schema supports all fields
- ✅ Error handling is graceful
- ✅ Performance is acceptable
- ✅ Security is maintained

---

## End of Test Scenarios
