# Service Management Test Guide

## Overview
This guide covers testing the `services` table and ServicesManager component functionality for barbers to manage their offered services.

---

## Prerequisites

### 1. Run the Migration
Before testing, ensure the `services` table exists:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and execute `/supabase/migrations/20241210_create_services_table.sql`
3. Verify table creation:
   ```sql
   SELECT * FROM services LIMIT 5;
   ```

### 2. Verify Table Schema
Run this query to confirm the structure:
```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'services'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid, primary key)
- `barber_id` (text, not null, FK to barbers)
- `name` (text, not null)
- `duration` (integer, not null, must be > 0)
- `price` (numeric/decimal, not null, must be > 0)
- `description` (text, nullable)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

### 3. Verify RLS Policies
```sql
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd
FROM pg_policies
WHERE tablename = 'services';
```

**Expected policies:**
- `Allow public read of services` (SELECT)
- `Barbers can insert own services` (INSERT)
- `Barbers can update own services` (UPDATE)
- `Barbers can delete own services` (DELETE)

---

## Test Scenarios

### Test 1: Initial State (No Services)
**Purpose:** Verify empty state displays correctly

**Steps:**
1. Log in as a new barber who hasn't added services
2. Navigate to Barber Dashboard → Edit Profile
3. Scroll to Services Management section

**Expected Results:**
- ✅ Shows empty state message
- ✅ "Add your first service" button displayed
- ✅ No service cards shown
- ✅ No console errors

---

### Test 2: Add First Service
**Purpose:** Test creating a new service

**Steps:**
1. Click "Add Service" button (or "+ Add First Service")
2. Form expands with fields:
   - Service Name (required)
   - Duration (minutes, required)
   - Price (UZS, required)
   - Description (optional)
3. Fill in:
   - Name: "Classic Haircut"
   - Duration: 30
   - Price: 50000
   - Description: "Standard men's haircut"
4. Click "Add Service"

**Expected Results:**
- ✅ Form validates required fields
- ✅ Service card appears immediately
- ✅ Toast: "Service added successfully"
- ✅ Form closes automatically
- ✅ Database verification:
   ```sql
   SELECT * FROM services WHERE barber_id = 'YOUR_BARBER_ID';
   ```
   Should show 1 service with correct data

---

### Test 3: Add Multiple Services
**Purpose:** Test adding several services

**Steps:**
1. Add these services:
   - **Fade Haircut**: 45 min, 70000 UZS
   - **Beard Trim**: 20 min, 30000 UZS
   - **Hair + Beard Combo**: 60 min, 85000 UZS
   - **Kids Haircut**: 25 min, 40000 UZS
2. Observe UI behavior

**Expected Results:**
- ✅ Each service displays in a card
- ✅ Services show duration and price badges
- ✅ Description appears (if provided)
- ✅ Each card has Edit and Delete buttons
- ✅ Database shows all services:
   ```sql
   SELECT name, duration, price FROM services 
   WHERE barber_id = 'YOUR_BARBER_ID'
   ORDER BY created_at;
   ```

---

### Test 4: Validation - Required Fields
**Purpose:** Verify form validation works

**Steps:**
1. Click "Add Service"
2. Try to submit with empty name
3. Try to submit with name but no duration
4. Try to submit with name and duration but no price

**Expected Results:**
- ✅ Toast error: "Service name is required"
- ✅ Toast error: "Duration must be positive"
- ✅ Toast error: "Price must be positive"
- ✅ No service created in database
- ✅ Form remains open

---

### Test 5: Validation - Invalid Values
**Purpose:** Test data type and range validation

**Steps:**
1. Try to add service with:
   - Duration: 0 minutes
   - Expected: Error toast
2. Try to add service with:
   - Duration: -5 minutes
   - Expected: Error toast or browser prevents negative input
3. Try to add service with:
   - Price: 0 UZS
   - Expected: Error toast
4. Try to add service with:
   - Description: 200 characters (max is 150)
   - Expected: Error toast

**Expected Results:**
- ✅ Duration 0: Toast "Duration must be positive"
- ✅ Duration negative: Prevented or error shown
- ✅ Price 0: Toast "Price must be positive"
- ✅ Description too long: Toast "Description too long (max 150 characters)"
- ✅ Character counter shows: "150/150" when at limit

---

### Test 6: Edit Service
**Purpose:** Test updating existing service

**Steps:**
1. Click Edit (pencil icon) on "Classic Haircut"
2. Form opens pre-filled with current data
3. Change:
   - Duration: 30 → 40 minutes
   - Price: 50000 → 60000 UZS
4. Click "Update Service"

**Expected Results:**
- ✅ Form pre-populates correctly
- ✅ Service card updates immediately
- ✅ Toast: "Service updated successfully"
- ✅ Form closes
- ✅ Database verification:
   ```sql
   SELECT name, duration, price FROM services 
   WHERE name = 'Classic Haircut' 
   AND barber_id = 'YOUR_BARBER_ID';
   ```
   Should show updated values (40, 60000)

---

### Test 7: Cancel Edit
**Purpose:** Verify canceling edit doesn't save changes

**Steps:**
1. Click Edit on any service
2. Change some values
3. Click "Cancel" button

**Expected Results:**
- ✅ Form closes
- ✅ Service card shows original values (no changes)
- ✅ No database update
- ✅ No toast message

---

### Test 8: Delete Service
**Purpose:** Test removing a service

**Steps:**
1. Note the total number of services
2. Click Delete (trash icon) on "Kids Haircut"
3. Observe changes

**Expected Results:**
- ✅ Service card disappears immediately
- ✅ Toast: "Service removed successfully"
- ✅ Other services remain intact
- ✅ Database verification:
   ```sql
   SELECT COUNT(*) FROM services WHERE barber_id = 'YOUR_BARBER_ID';
   ```
   Count should decrease by 1
   ```sql
   SELECT * FROM services WHERE name = 'Kids Haircut' AND barber_id = 'YOUR_BARBER_ID';
   ```
   Should return 0 rows

---

### Test 9: Show More/Show Less (Pagination)
**Purpose:** Test UI with many services

**Steps:**
1. Add 8 services total (if you have fewer than 7)
2. Observe if "Show More" button appears
3. Click "Show More"
4. Click "Show Less"

**Expected Results:**
- ✅ By default, shows first 6 services
- ✅ "Show More (2)" button appears (if 8 services)
- ✅ Clicking "Show More" reveals all services
- ✅ Button changes to "Show Less"
- ✅ Clicking "Show Less" collapses to 6 again

---

### Test 10: Price Range Calculation
**Purpose:** Verify price range auto-calculates for barber profile

**Steps:**
1. Check current services and their prices
2. Note the cheapest and most expensive
3. Calculate total of all prices
4. Save profile
5. View barber card/profile preview

**Expected Results:**
- ✅ Price range shows: "Min price - Max price"
- ✅ Min = lowest individual service price
- ✅ Max = sum of all service prices
- ✅ Example: If you have 50k, 70k, 30k services:
  - Min: 30,000 UZS
  - Max: 150,000 UZS (sum)

**Code location:** `/components/BarberProfileEditor.tsx` lines 129-138

---

### Test 11: Profile Save Integration
**Purpose:** Test services save when profile is saved

**Steps:**
1. Add/edit services in profile editor
2. Make another change (e.g., update bio)
3. Click "Save Profile"
4. Close profile editor
5. Re-open profile editor

**Expected Results:**
- ✅ Services persist after save
- ✅ Toast: "Services saved successfully"
- ✅ Toast: "Profile updated successfully"
- ✅ Re-opening shows saved services
- ✅ Database shows services linked to barber

---

### Test 12: Data Persistence Across Sessions
**Purpose:** Verify services persist after logout/login

**Steps:**
1. Add several services
2. Save profile
3. Log out
4. Log back in
5. Go to Edit Profile

**Expected Results:**
- ✅ All services appear as they were
- ✅ No data loss
- ✅ Correct order maintained

---

### Test 13: Row Level Security - Read Access
**Purpose:** Verify customers can see services

**Steps:**
1. Add services as Barber A
2. Log out
3. Log in as Customer
4. Browse barbers and view Barber A's profile
5. Or run SQL as anonymous:
   ```sql
   -- No auth context
   SELECT * FROM services WHERE barber_id = 'BARBER_A_ID';
   ```

**Expected Results:**
- ✅ Customer can see all services for that barber
- ✅ Services display in booking modal
- ✅ SQL query succeeds (RLS allows public read)

---

### Test 14: RLS - Write Protection
**Purpose:** Verify barbers can't edit each other's services

**Steps:**
1. Log in as Barber A
2. Get a service ID from Barber B:
   ```sql
   SELECT id FROM services WHERE barber_id = 'BARBER_B_ID' LIMIT 1;
   ```
3. Try to delete it via API or direct query:
   ```javascript
   // In browser console as Barber A
   const { error } = await supabase
     .from('services')
     .delete()
     .eq('id', 'BARBER_B_SERVICE_ID');
   console.log(error);
   ```

**Expected Results:**
- ✅ Delete fails (RLS blocks it)
- ✅ No rows affected
- ✅ Error or silent failure
- ✅ Service remains in database

---

### Test 15: Foreign Key Constraint
**Purpose:** Verify referential integrity

**Steps:**
1. Try to insert service with non-existent barber:
   ```sql
   INSERT INTO services (barber_id, name, duration, price)
   VALUES ('fake-barber-id-12345', 'Test Service', 30, 50000);
   ```

**Expected Results:**
- ❌ Insert fails
- ✅ Error: `violates foreign key constraint "services_barber_id_fkey"`

---

### Test 16: Cascade Delete
**Purpose:** Verify services deleted when barber is removed

**Steps:**
⚠️ **WARNING: Destructive test - use test account only**

1. Create test barber account
2. Add 3-4 services for test barber
3. Verify services exist:
   ```sql
   SELECT COUNT(*) FROM services WHERE barber_id = 'TEST_BARBER_ID';
   ```
4. Delete test barber:
   ```sql
   DELETE FROM barbers WHERE id = 'TEST_BARBER_ID';
   ```
5. Check services:
   ```sql
   SELECT COUNT(*) FROM services WHERE barber_id = 'TEST_BARBER_ID';
   ```

**Expected Results:**
- ✅ All services automatically deleted
- ✅ Returns 0 rows after barber deletion

---

### Test 17: Auto-Update Timestamp
**Purpose:** Verify `updated_at` changes on edit

**Steps:**
1. Note a service's current timestamp:
   ```sql
   SELECT id, name, updated_at FROM services WHERE name = 'Classic Haircut';
   ```
2. Edit that service via UI (change duration or price)
3. Re-run query

**Expected Results:**
- ✅ `updated_at` timestamp is newer
- ✅ Automatic via trigger

---

### Test 18: Long Service Name
**Purpose:** Test UI with long text

**Steps:**
1. Add service with name: "Premium Executive Haircut with Styling and Consultation"
2. Observe display

**Expected Results:**
- ✅ Name truncates with ellipsis if too long
- ✅ Full name visible on hover (if implemented)
- ✅ Card layout doesn't break
- ✅ Max 50 characters enforced in UI

---

### Test 19: Special Characters in Name
**Purpose:** Test edge cases

**Steps:**
1. Add service with name: "Men's Haircut & Beard"
2. Add service with description containing: "Includes: wash, cut, style"

**Expected Results:**
- ✅ Apostrophes and special chars save correctly
- ✅ No SQL injection issues
- ✅ Display renders properly
- ✅ No encoding problems

---

### Test 20: Profile Save Without Services
**Purpose:** Test validation prevents saving without services

**Steps:**
1. Delete all services
2. Try to save profile

**Expected Results:**
- ✅ Toast error: "Please add at least one service"
- ✅ Profile save blocked
- ✅ User remains in edit mode

**Code location:** `/components/BarberProfileEditor.tsx` lines 148-151

---

## API Endpoint Testing

### Test via Backend API

#### Get Services
```bash
curl -X GET \
  "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-166b98fa/barbers/BARBER_ID/services" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

**Expected:** JSON array of services

#### Save Services
```bash
curl -X POST \
  "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-166b98fa/barbers/BARBER_ID/services" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "services": [
      {
        "name": "Test Service",
        "duration": 30,
        "price": 50000,
        "description": "Test description"
      }
    ]
  }'
```

**Expected:** Success response with saved services

---

## Common Issues & Troubleshooting

### Issue 1: "Table doesn't exist" error
**Solution:**
- Run migration: `/supabase/migrations/20241210_create_services_table.sql`
- Verify in Supabase Dashboard → Table Editor

### Issue 2: Services don't save (no error shown)
**Solution:**
- Open browser console (F12)
- Check Network tab for failed requests
- Look for 401 Unauthorized (not logged in)
- Look for 403 Forbidden (RLS blocking)
- Look for 404 Not Found (barber doesn't exist in `barbers` table)

### Issue 3: "Barber profile not found" error
**Solution:**
- User must exist in `barbers` table
- Check:
  ```sql
  SELECT id FROM barbers WHERE id = 'YOUR_USER_ID';
  ```
- If missing, re-login to trigger sync (server creates barber row on login)

### Issue 4: Services not loading after page refresh
**Solution:**
- Check if services fetch API is called:
  ```javascript
  // In App.tsx, lines 78-85
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .eq('barber_id', userId);
  ```
- Verify barber_id matches user ID
- Check RLS allows public read

### Issue 5: Price displays incorrectly
**Solution:**
- Ensure price stored as number, not string
- Check formatting function: `formatPrice(price)`
- Database stores as DECIMAL(10,2)
- Frontend should display with thousand separators

### Issue 6: Duration validation allows 0
**Solution:**
- Database CHECK constraint should prevent: `CHECK (duration > 0)`
- Frontend validation in ServicesManager.tsx lines 46-49
- If both pass, check if parseInt() returns 0

---

## Database Queries for Verification

### View all services for a barber
```sql
SELECT 
    id,
    name,
    duration,
    price,
    description,
    created_at,
    updated_at
FROM services
WHERE barber_id = 'YOUR_BARBER_ID'
ORDER BY created_at DESC;
```

### Count services per barber
```sql
SELECT 
    barber_id,
    COUNT(*) as service_count,
    MIN(price) as cheapest,
    MAX(price) as most_expensive,
    AVG(price)::numeric(10,2) as average_price
FROM services
GROUP BY barber_id
ORDER BY service_count DESC;
```

### Find barbers with no services
```sql
SELECT b.id, b.full_name
FROM barbers b
LEFT JOIN services s ON s.barber_id = b.id
WHERE s.id IS NULL;
```

### Check for duplicate service names (same barber)
```sql
SELECT 
    barber_id,
    name,
    COUNT(*) as duplicates
FROM services
GROUP BY barber_id, name
HAVING COUNT(*) > 1;
```

### Services created in last 24 hours
```sql
SELECT 
    s.name,
    b.full_name as barber_name,
    s.created_at
FROM services s
JOIN barbers b ON s.barber_id = b.id
WHERE s.created_at > NOW() - INTERVAL '24 hours'
ORDER BY s.created_at DESC;
```

---

## Success Criteria

All tests pass when:
- ✅ Table schema matches specification
- ✅ All CRUD operations work correctly
- ✅ RLS policies enforce security
- ✅ Services persist across sessions
- ✅ UI updates reflect database changes
- ✅ No console errors during normal operation
- ✅ Validation prevents invalid data
- ✅ Foreign key maintains referential integrity
- ✅ Cascade delete works when barber removed
- ✅ Profile save integrates services correctly

---

## Integration with Other Features

### Booking System (Future)
When customer books an appointment:
```sql
-- Customer selects a service
SELECT id, name, duration, price 
FROM services 
WHERE barber_id = 'SELECTED_BARBER_ID';

-- Booking record references service
INSERT INTO bookings (customer_id, barber_id, service_id, ...)
VALUES (...);
```

### Search/Filter (Future)
Customers can search by service:
```sql
SELECT DISTINCT b.*
FROM barbers b
JOIN services s ON s.barber_id = b.id
WHERE s.name ILIKE '%haircut%';
```

### Pricing Display
Barber cards show price range:
```javascript
// Computed from services
const priceRange = {
  min: Math.min(...services.map(s => s.price)),
  max: services.reduce((sum, s) => sum + s.price, 0)
};
```

---

## Next Steps After Testing

1. **Add service categories** (optional):
   - Haircuts, Beard, Styling, etc.
   - Filter by category in booking

2. **Service images** (optional):
   - Add photo for each service
   - Display in service list

3. **Popular services** (analytics):
   - Track booking count per service
   - Show "Most Popular" badge

4. **Service availability**:
   - Some services only available certain days
   - Link to schedule management

---

**Test completed by:** _____________  
**Date:** _____________  
**Test environment:** _____________  
**Results:** ✅ Pass / ❌ Fail  
**Notes:** _____________
