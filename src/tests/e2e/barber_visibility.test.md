# E2E Test: Barber Visibility

## Test Scenario: Create Barber → Activate Subscription → Verify Visibility

### Prerequisites
- Clean database or test environment
- Backend server running
- Frontend application running
- Test credentials ready

---

## Test Case 1: New Barber with Trial Subscription

### Step 1: Sign Up as Barber
**Action:**
1. Navigate to signup page
2. Enter details:
   - Phone: +998901234567
   - Password: TestBarber123!
   - Full Name: Test Barbershop
   - Role: Barber
   - Subscription: 3-month free trial
3. Click "Sign Up"

**Expected:**
- ✅ Account created successfully
- ✅ Redirected to barber dashboard
- ✅ Toast: "Account created successfully"

**Verification:**
```sql
SELECT id, full_name, subscription_status, trial_used, visible_to_public, is_active
FROM barbers
WHERE phone = '+998901234567';

-- Expected:
-- subscription_status: 'active'
-- trial_used: true
-- visible_to_public: true
-- is_active: true
```

### Step 2: Add Services
**Action:**
1. Navigate to "Services" tab
2. Click "Add Service"
3. Enter:
   - Name: Classic Haircut
   - Duration: 30 minutes
   - Price: 50000 UZS
4. Click "Save"

**Expected:**
- ✅ Service added successfully
- ✅ Service visible in list
- ✅ Toast: "Services saved successfully"

**Verification:**
```sql
SELECT * FROM services
WHERE barber_id = (SELECT id FROM barbers WHERE phone = '+998901234567');

-- Expected: 1 row with service details
```

### Step 3: Complete Profile
**Action:**
1. Navigate to "Profile" tab
2. Fill in:
   - Bio: "Professional barbershop..."
   - Address: "123 Main Street"
   - Working hours: Mon-Sat 9AM-8PM
   - Languages: Uzbek, Russian
   - Districts: Yunusabad, Mirzo-Ulugbek
3. Click "Save Profile"

**Expected:**
- ✅ Profile updated
- ✅ Toast: "Profile updated successfully"

### Step 4: Log Out
**Action:**
1. Click profile menu
2. Click "Log Out"

**Expected:**
- ✅ Logged out
- ✅ Redirected to home page

### Step 5: Browse as Customer (Anonymous)
**Action:**
1. Navigate to barber search page
2. Open browser console
3. Look for barber cards

**Expected:**
- ✅ Test Barbershop is visible in list
- ✅ Console shows: "✅ Barber Test Barbershop visible: true"
- ✅ Service "Classic Haircut" is displayed
- ✅ Price range shows: 50,000 UZS

**Verification:**
```javascript
// In browser console
const barbers = document.querySelectorAll('[data-testid="barber-card"]');
console.log('Barbers found:', barbers.length);

// Should include Test Barbershop
```

### Step 6: Test Database Query
**Action:**
```sql
-- Run as anonymous user
SET ROLE anon;

SELECT 
  id, 
  full_name, 
  subscription_status, 
  visible_to_public,
  is_active
FROM barbers
WHERE full_name = 'Test Barbershop';

-- Reset role
RESET ROLE;
```

**Expected:**
- ✅ Query returns 1 row
- ✅ Test Barbershop is included
- ✅ visible_to_public = true

### Step 7: Test API Endpoint
**Action:**
```bash
curl -X GET 'https://<project-id>.supabase.co/functions/v1/make-server-166b98fa/barbers' \
  -H 'Authorization: Bearer <anon-key>' | jq '.barbers[] | select(.full_name == "Test Barbershop")'
```

**Expected:**
```json
{
  "id": "...",
  "full_name": "Test Barbershop",
  "subscription_status": "active",
  "trial_used": true,
  "visible_to_public": true,
  "is_active": true,
  "services": [
    {
      "name": "Classic Haircut",
      "duration": 30,
      "price": 50000
    }
  ]
}
```

---

## Test Case 2: Existing Barber Activates Subscription

### Step 1: Create Inactive Barber
**Action:**
```sql
INSERT INTO barbers (
  id, 
  full_name, 
  phone, 
  subscription_status, 
  trial_used, 
  visible_to_public, 
  is_active
) VALUES (
  gen_random_uuid(),
  'Hidden Barber',
  '+998901111111',
  'inactive',
  false,
  false,
  true
);
```

**Expected:**
- ✅ Barber created
- ✅ visible_to_public = false
- ✅ Not visible to customers

### Step 2: Verify Hidden
**Action:**
```bash
curl -X GET 'https://<project-id>.supabase.co/functions/v1/make-server-166b98fa/barbers' \
  -H 'Authorization: Bearer <anon-key>' | jq '.barbers[] | select(.full_name == "Hidden Barber")'
```

**Expected:**
- ✅ No results (barber is hidden)

### Step 3: Activate Trial
**Action:**
```sql
UPDATE barbers
SET 
  subscription_status = 'active',
  trial_used = true,
  subscription_expiry_date = NOW() + INTERVAL '3 months'
WHERE full_name = 'Hidden Barber';
```

**Expected:**
- ✅ Trigger automatically sets visible_to_public = true

**Verification:**
```sql
SELECT visible_to_public, is_active, subscription_status
FROM barbers
WHERE full_name = 'Hidden Barber';

-- Expected:
-- visible_to_public: true (set by trigger)
-- is_active: true
-- subscription_status: 'active'
```

### Step 4: Verify Now Visible
**Action:**
```bash
curl -X GET 'https://<project-id>.supabase.co/functions/v1/make-server-166b98fa/barbers' \
  -H 'Authorization: Bearer <anon-key>' | jq '.barbers[] | select(.full_name == "Hidden Barber")'
```

**Expected:**
```json
{
  "full_name": "Hidden Barber",
  "subscription_status": "active",
  "visible_to_public": true,
  "is_active": true
}
```

---

## Test Case 3: Subscription Expiry Hides Barber

### Step 1: Create Barber with Expiring Subscription
**Action:**
```sql
INSERT INTO barbers (
  id, 
  full_name, 
  phone, 
  subscription_status, 
  subscription_expiry_date,
  visible_to_public, 
  is_active
) VALUES (
  gen_random_uuid(),
  'Expiring Barber',
  '+998902222222',
  'active',
  NOW() + INTERVAL '1 second',
  true,
  true
);
```

### Step 2: Verify Initially Visible
**Action:**
```bash
curl -X GET 'https://<project-id>.supabase.co/functions/v1/make-server-166b98fa/barbers' \
  -H 'Authorization: Bearer <anon-key>' | jq '.barbers[] | select(.full_name == "Expiring Barber")'
```

**Expected:**
- ✅ Barber is visible

### Step 3: Wait for Expiry
**Action:**
```bash
# Wait 2 seconds
sleep 2
```

### Step 4: Update Subscription (Simulate Cron Job)
**Action:**
```sql
UPDATE barbers
SET visible_to_public = false
WHERE subscription_expiry_date < NOW()
  AND subscription_status = 'active';
```

### Step 5: Verify Now Hidden
**Action:**
```bash
curl -X GET 'https://<project-id>.supabase.co/functions/v1/make-server-166b98fa/barbers' \
  -H 'Authorization: Bearer <anon-key>' | jq '.barbers[] | select(.full_name == "Expiring Barber")'
```

**Expected:**
- ✅ No results (barber is hidden after expiry)

---

## Test Case 4: RLS Policy Enforcement

### Step 1: Test Anonymous Read
**Action:**
```sql
BEGIN;
SET LOCAL ROLE anon;

SELECT COUNT(*) as visible_count
FROM barbers;

ROLLBACK;
```

**Expected:**
- ✅ Returns only visible barbers
- ✅ Hidden barbers not included

### Step 2: Test Barber Can Read Own Profile
**Action:**
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '<barber-user-id>';

SELECT * FROM barbers WHERE id = '<barber-user-id>';

ROLLBACK;
```

**Expected:**
- ✅ Barber can see their own profile
- ✅ Includes all fields (even if hidden from public)

### Step 3: Test Barber Cannot Read Other Profiles
**Action:**
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '<barber-user-id>';

SELECT * FROM barbers WHERE id != '<barber-user-id>' AND visible_to_public = false;

ROLLBACK;
```

**Expected:**
- ✅ No results (cannot see hidden barbers)

---

## Performance Test

### Step 1: Create 100 Barbers
**Action:**
```sql
INSERT INTO barbers (id, full_name, phone, subscription_status, visible_to_public, is_active)
SELECT 
  gen_random_uuid(),
  'Barber ' || generate_series,
  '+99890' || LPAD(generate_series::text, 7, '0'),
  CASE WHEN random() > 0.3 THEN 'active' ELSE 'inactive' END,
  random() > 0.3,
  true
FROM generate_series(1, 100);
```

### Step 2: Test Query Performance
**Action:**
```sql
EXPLAIN ANALYZE
SELECT * FROM barbers
WHERE 
  is_active = true 
  AND (
    visible_to_public = true 
    OR subscription_status = 'active'
    OR trial_used = true
  )
  AND (
    subscription_expiry_date IS NULL 
    OR subscription_expiry_date > NOW()
  );
```

**Expected:**
- ✅ Query completes in < 50ms
- ✅ Uses index on (is_active, visible_to_public, subscription_status)
- ✅ No sequential scans

### Step 3: Test Frontend Load Time
**Action:**
1. Open DevTools Network tab
2. Refresh page
3. Measure time to first barber card

**Expected:**
- ✅ API response < 500ms
- ✅ First paint < 1s
- ✅ All cards rendered < 2s

---

## Cleanup

```sql
-- Remove test barbers
DELETE FROM barbers WHERE full_name LIKE 'Test %' OR full_name LIKE 'Barber %' OR full_name IN ('Hidden Barber', 'Expiring Barber');

-- Remove test services
DELETE FROM services WHERE barber_id NOT IN (SELECT id FROM barbers);
```

---

## Test Results Template

```markdown
## Test Run: [Date]

### Environment
- Database: [Production/Staging/Local]
- Backend: [URL]
- Frontend: [URL]

### Test Case 1: New Barber with Trial ✅ / ❌
- [ ] Sign up successful
- [ ] Services added
- [ ] Profile completed
- [ ] Visible to customers
- [ ] API returns barber
- [ ] Database query works

### Test Case 2: Activate Subscription ✅ / ❌
- [ ] Inactive barber hidden
- [ ] Activation makes visible
- [ ] Trigger sets flags
- [ ] API returns barber

### Test Case 3: Subscription Expiry ✅ / ❌
- [ ] Initially visible
- [ ] Hidden after expiry
- [ ] Not in API response

### Test Case 4: RLS Policies ✅ / ❌
- [ ] Anonymous can read visible
- [ ] Barber can read own
- [ ] Cannot read hidden

### Performance ✅ / ❌
- [ ] Query < 50ms
- [ ] API response < 500ms
- [ ] Page load < 2s

### Issues Found
[List any issues]

### Overall Result: PASS / FAIL
```

---

**Status:** Ready for testing
**Last Updated:** December 8, 2024
