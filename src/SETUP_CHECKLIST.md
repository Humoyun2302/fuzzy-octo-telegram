# ✅ Trimly Backend Setup Checklist

Print this page or keep it open while setting up!

---

## 📋 Pre-Setup

- [ ] Supabase account created
- [ ] Project created: `qxobvbukuxlccqbcbiji`
- [ ] Project status: **ACTIVE** (not paused)
- [ ] SQL Editor opened in Supabase Dashboard

---

## 🔧 Database Setup (SQL Editor)

### Step 1: Create Tables ⏱️ 30 seconds

- [ ] Open `/supabase/migrations/01_create_tables.sql`
- [ ] Copy entire file content
- [ ] Paste into Supabase SQL Editor
- [ ] Click **RUN** button
- [ ] Wait for success message:
  ```
  ✅ All tables created successfully!
  ```

**What you get:**
- `customers` table
- `barbers` table
- `services` table
- `barber_slots` table
- `bookings` table
- `favorites` table
- `sessions` table

---

### Step 2: Create Auth Functions ⏱️ 30 seconds

- [ ] Open `/supabase/migrations/02_auth_functions.sql`
- [ ] Copy entire file content
- [ ] Paste into Supabase SQL Editor
- [ ] Click **RUN** button
- [ ] Wait for success message:
  ```
  ✅ Authentication functions created successfully!
  ```

**What you get:**
- Password hashing (bcrypt)
- Customer signup/login
- Barber signup/login
- Session management

---

### Step 3: Create Views ⏱️ 15 seconds

- [ ] Open `/supabase/migrations/03_create_view.sql`
- [ ] Copy entire file content
- [ ] Paste into Supabase SQL Editor
- [ ] Click **RUN** button
- [ ] Wait for success message:
  ```
  ✅ Database views created successfully!
  ```

**What you get:**
- Pre-built views for fast queries
- Available slots view
- Bookings with details view
- Barber stats view

---

### Step 4: Insert Sample Data ⏱️ 15 seconds (OPTIONAL)

**Skip this if you want a clean database**

**Run this if you want to test immediately**

- [ ] Open `/supabase/migrations/04_insert_sample_data.sql`
- [ ] Copy entire file content
- [ ] Paste into Supabase SQL Editor
- [ ] Click **RUN** button
- [ ] Wait for success message:
  ```
  ✅ SAMPLE DATA CREATED SUCCESSFULLY!
  ```

**What you get:**
- 3 test customers (password: `password123`)
- 5 test barbers (password: `barber123`)
- Sample services for each barber
- Available time slots for tomorrow

---

## ✅ Verification

### Check Tables Created

- [ ] Go to **Table Editor** in Supabase
- [ ] You should see these tables:

```
✓ customers
✓ barbers
✓ services
✓ barber_slots
✓ bookings
✓ favorites
✓ sessions
✓ kv_store_166b98fa (pre-existing)
```

### Check Functions Created

- [ ] Go to **Database** → **Functions** in Supabase
- [ ] You should see:

```
✓ hash_password
✓ verify_password
✓ create_customer
✓ authenticate_customer
✓ create_barber
✓ authenticate_barber
✓ create_session
✓ verify_session
✓ delete_session
```

### Check Views Created

- [ ] Go to **Table Editor** → **Views**
- [ ] You should see:

```
✓ v_available_slots_by_barber
✓ v_bookings_with_details
✓ v_barber_services
✓ v_barber_stats
✓ v_active_barbers
```

---

## 🧪 Testing

### Test 1: Sign Up

- [ ] Open Trimly app
- [ ] Click "Sign Up"
- [ ] Fill in:
  - Phone: `+1111111111`
  - Password: `test123`
  - Full Name: `Test User`
  - Role: `Customer`
- [ ] Click "Create Account"
- [ ] **Expected:** Account created, logged in

---

### Test 2: Login (if sample data installed)

- [ ] Click "Logout"
- [ ] Click "Login"
- [ ] Enter:
  - Phone: `+1234567890`
  - Password: `password123`
- [ ] Click "Login"
- [ ] **Expected:** Logged in as "John Doe"

---

### Test 3: View Barbers

- [ ] As customer, go to "Search" tab
- [ ] **Expected:** List of barbers appears

**If no barbers:**
- Either you skipped sample data (expected)
- Or something went wrong (check console)

---

### Test 4: Create Booking (if sample data installed)

- [ ] Click on a barber
- [ ] Select a service
- [ ] Pick tomorrow's date
- [ ] Select a time slot
- [ ] Click "Confirm Booking"
- [ ] **Expected:** Booking created, success message shown

---

## 🆘 Troubleshooting Quick Reference

| Error | Fix |
|-------|-----|
| "Failed to fetch" | Project paused? Check Supabase dashboard |
| "Authentication failed" | Re-run `02_auth_functions.sql` |
| "No tables found" | Re-run `01_create_tables.sql` |
| "Phone already registered" | Use different phone number |
| No barbers showing | Run `04_insert_sample_data.sql` |

---

## 🎯 Success Criteria

You're done when:

✅ All migrations ran without errors
✅ All tables visible in Table Editor
✅ You can sign up a new account
✅ You can log in with test account
✅ Barbers appear on customer homepage
✅ No errors in browser console

---

## 📞 Next Steps After Setup

1. **Read the docs:**
   - [BACKEND_API_ENDPOINTS.md](./BACKEND_API_ENDPOINTS.md) - API reference
   - [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database structure

2. **Start building:**
   - Add your own barbers
   - Create services
   - Test bookings

3. **Deploy:**
   - Backend is auto-deployed by Figma Make
   - Just use the app!

---

## 📊 Quick Reference

### Test Accounts (if sample data installed)

**Customers:**
- `+1234567890` / `password123` (John Doe)
- `+1234567891` / `password123` (Jane Smith)
- `+1234567892` / `password123` (Mike Johnson)

**Barbers:**
- `+9876543210` / `barber123` (Alex Martinez - Modern)
- `+9876543211` / `barber123` (Carlos Rodriguez - Traditional)
- `+9876543212` / `barber123` (Sarah Chen - Kids & Family)
- `+9876543213` / `barber123` (James Wilson - Luxury)
- `+9876543214` / `barber123` (Tommy Lee - Budget)

---

### Important URLs

- **Supabase Dashboard:** https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji
- **SQL Editor:** https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji/sql
- **Table Editor:** https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji/editor

---

### Database Quick Facts

- **Total Tables:** 7 (+ 1 pre-existing)
- **Total Functions:** 9
- **Total Views:** 5
- **Password Hashing:** bcrypt (10 rounds)
- **Session Expiry:** 30 days
- **Auth Method:** Phone + Password (no email)

---

**Setup Time:** ~5 minutes
**Difficulty:** Beginner-friendly
**Status:** ✅ Ready to use!

---

Print this checklist and check off items as you complete them! 🎯
