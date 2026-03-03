# ✅ Trimly Quick Setup Checklist

Use this checklist to set up Trimly from scratch in **under 15 minutes**.

---

## 📋 Step-by-Step Checklist

### 1️⃣ Supabase Project Setup (2 minutes)

- [ ] Go to https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji
- [ ] Verify project is **Active** (not paused)
- [ ] Go to **Settings → API**
- [ ] Copy **Project URL**: `https://qxobvbukuxlccqbcbiji.supabase.co`
- [ ] Copy **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

### 2️⃣ Create Database Tables (5 minutes)

Open **Supabase SQL Editor** and run these scripts **in order**:

#### Script 1: Customers Table
- [ ] Copy from `/BACKEND_SETUP_COMPLETE_GUIDE.md` → Section 1.1
- [ ] Paste in SQL Editor → Click **RUN**
- [ ] Verify success message

#### Script 2: Barbers Table
- [ ] Copy from `/BACKEND_SETUP_COMPLETE_GUIDE.md` → Section 1.2
- [ ] Paste in SQL Editor → Click **RUN**
- [ ] Verify success message

#### Script 3: Services Table
- [ ] Copy from `/BACKEND_SETUP_COMPLETE_GUIDE.md` → Section 1.3
- [ ] Paste in SQL Editor → Click **RUN**
- [ ] Verify success message

#### Script 4: Barber Slots Table
- [ ] Copy from `/BACKEND_SETUP_COMPLETE_GUIDE.md` → Section 1.4
- [ ] Paste in SQL Editor → Click **RUN**
- [ ] Verify success message

#### Script 5: Bookings Table
- [ ] Copy from `/BACKEND_SETUP_COMPLETE_GUIDE.md` → Section 1.5
- [ ] Paste in SQL Editor → Click **RUN**
- [ ] Verify success message

#### Script 6: Favorites Table
- [ ] Copy from `/BACKEND_SETUP_COMPLETE_GUIDE.md` → Section 1.6
- [ ] Paste in SQL Editor → Click **RUN**
- [ ] Verify success message

#### Script 7: Password Functions
- [ ] Copy from `/BACKEND_SETUP_COMPLETE_GUIDE.md` → Section 1.7
- [ ] Paste in SQL Editor → Click **RUN**
- [ ] Verify success message

#### Script 8: Sessions Table
- [ ] Copy from `/BACKEND_SETUP_COMPLETE_GUIDE.md` → Section 2.1
- [ ] Paste in SQL Editor → Click **RUN**
- [ ] Verify success message

#### Script 9: Available Slots View
- [ ] Copy from `/BACKEND_SETUP_COMPLETE_GUIDE.md` → Section 1.8
- [ ] Paste in SQL Editor → Click **RUN**
- [ ] Verify success message

---

### 3️⃣ Verify Database (2 minutes)

Run this in **SQL Editor**:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected Output:** (8 tables)
- [ ] `barbers`
- [ ] `barber_slots`
- [ ] `bookings`
- [ ] `customers`
- [ ] `favorites`
- [ ] `services`
- [ ] `sessions`
- [ ] `v_available_slots_by_barber` (view)

---

### 4️⃣ Create Test Data (3 minutes)

#### Create Test Barber
Run in **SQL Editor**:

```sql
INSERT INTO public.barbers (
  phone,
  full_name,
  name,
  password_hash,
  bio,
  subscription_status,
  subscription_expiry_date,
  trial_used,
  districts,
  languages
) VALUES (
  '+998901234567',
  'Test Barber',
  'Test Barber',
  public.hash_password('password123'),
  'Expert barber with 10 years experience',
  'free_trial',
  NOW() + INTERVAL '14 days',
  FALSE,
  ARRAY['Tashkent', 'Chilanzar'],
  ARRAY['English', 'Russian', 'Uzbek']
) RETURNING id, full_name, phone, subscription_status;
```

- [ ] Copy the returned `id` (UUID) - you'll need it for next step
- [ ] Verify barber created successfully

#### Create Test Service
Replace `<barber-id>` with the UUID from previous step:

```sql
INSERT INTO public.services (
  barber_id,
  name,
  duration,
  price
) VALUES (
  '<barber-id>', -- Replace with actual UUID
  'Haircut',
  30,
  50000
) RETURNING id, name, duration, price;
```

- [ ] Verify service created successfully

#### Create Test Slot
Replace `<barber-id>` with the UUID:

```sql
INSERT INTO public.barber_slots (
  barber_id,
  slot_date,
  start_time,
  end_time,
  duration,
  status
) VALUES (
  '<barber-id>', -- Replace with actual UUID
  CURRENT_DATE + 1, -- Tomorrow
  '09:00:00',
  '09:30:00',
  30,
  'available'
) RETURNING id, slot_date, start_time, status;
```

- [ ] Verify slot created successfully

---

### 5️⃣ Test Backend API (2 minutes)

#### Test Health Check
Open browser or use cURL:

```
https://qxobvbukuxlccqbcbiji.supabase.co/functions/v1/make-server-166b98fa/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-20T..."
}
```

- [ ] Health check returns `status: "ok"`

#### Test Login
Use **Postman** or **cURL**:

```bash
curl -X POST https://qxobvbukuxlccqbcbiji.supabase.co/functions/v1/make-server-166b98fa/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901234567","password":"password123"}'
```

**Expected Response:**
```json
{
  "success": true,
  "sessionToken": "...",
  "user": {
    "id": "...",
    "role": "barber",
    "phone": "+998901234567"
  }
}
```

- [ ] Login successful
- [ ] Session token returned

---

### 6️⃣ Test Frontend App (1 minute)

- [ ] Open Trimly app in browser
- [ ] Check debug banner at top (should show "Connected")
- [ ] Verify no console errors
- [ ] Test barber should appear on homepage

---

## 🎯 Final Verification

All checks should be ✅:

- [ ] Supabase project is active
- [ ] 8 database tables/views created
- [ ] Password functions work
- [ ] Test barber exists
- [ ] Test service exists
- [ ] Test slot exists
- [ ] Backend API `/health` returns OK
- [ ] Login API works
- [ ] Frontend connects successfully
- [ ] No "Failed to fetch" errors

---

## 🚨 Troubleshooting

### "Table does not exist"
→ Re-run table creation scripts in SQL Editor

### "Function hash_password does not exist"
→ Run Script 7 (Password Functions)

### "Failed to fetch"
→ Check Supabase project is not paused

### "Permission denied"
→ Check RLS policies were created (included in table scripts)

### "Barber not visible on homepage"
→ Check subscription_status = 'free_trial' or 'active'
→ Check subscription_expiry_date is in future

---

## 📚 Next Steps

After setup is complete:

1. ✅ Create real barber accounts via signup
2. ✅ Test customer signup and booking flow
3. ✅ Configure payment integration (if needed)
4. ✅ Set up SMS provider for OTP (optional)

---

**Setup Complete!** 🎉

Your Trimly app is now fully functional with:
- ✅ Database tables
- ✅ Authentication
- ✅ Booking system
- ✅ Barber profiles
- ✅ Services management

Start using the app!
