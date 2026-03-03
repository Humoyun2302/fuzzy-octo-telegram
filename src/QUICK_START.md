# ⚡ Trimly - 5-Minute Quick Start

Get your backend running in 5 minutes!

---

## ✅ Prerequisites

- [ ] Supabase account created
- [ ] Project created at: https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji
- [ ] Project is **NOT paused** (check dashboard)

---

## 🚀 Step-by-Step Setup

### Step 1: Open Supabase SQL Editor (1 min)

1. Go to: https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji
2. Click **"SQL Editor"** in the left sidebar
3. Click **"+ New query"** button

---

### Step 2: Run Migrations (3 mins)

Copy and paste each file into SQL Editor, then click **RUN** (or Ctrl/Cmd + Enter):

#### ✅ Migration 1: Create Tables
File: `/supabase/migrations/01_create_tables.sql`

**What it does:**
- Creates all database tables (customers, barbers, services, etc.)
- Adds indexes for fast queries
- Sets up auto-update triggers

**Expected result:**
```
✅ All tables created successfully!
📋 Created tables: customers, barbers, services, barber_slots, bookings, favorites, sessions
```

---

#### ✅ Migration 2: Auth Functions
File: `/supabase/migrations/02_auth_functions.sql`

**What it does:**
- Creates password hashing functions (bcrypt)
- Creates signup/login functions
- Sets up session management

**Expected result:**
```
✅ Authentication functions created successfully!
🔐 Password hashing: hash_password(), verify_password()
👤 Customer auth: create_customer(), authenticate_customer()
✂️ Barber auth: create_barber(), authenticate_barber()
```

---

#### ✅ Migration 3: Database Views
File: `/supabase/migrations/03_create_view.sql`

**What it does:**
- Creates views for efficient queries
- Pre-joins tables for faster data retrieval

**Expected result:**
```
✅ Database views created successfully!
📊 Created views: v_available_slots_by_barber, v_bookings_with_details, etc.
```

---

#### ⭐ Migration 4: Sample Data (OPTIONAL)
File: `/supabase/migrations/04_insert_sample_data.sql`

**What it does:**
- Creates 3 test customers
- Creates 5 test barbers with services
- Creates sample time slots for tomorrow

**Skip this if:** You want to start with a clean database

**Run this if:** You want to test the app immediately

**Test accounts created:**
- Customers: `+1234567890`, `+1234567891`, `+1234567892` (password: `password123`)
- Barbers: `+9876543210`, `+9876543211`, etc. (password: `barber123`)

---

### Step 3: Verify Setup (1 min)

1. Click **"Table Editor"** in Supabase sidebar
2. You should see these tables:

```
✅ customers
✅ barbers
✅ services
✅ barber_slots
✅ bookings
✅ favorites
✅ sessions
✅ kv_store_166b98fa (pre-existing)
```

3. Click on `barbers` table
4. If you ran sample data (step 4), you should see 5 barbers

---

## 🎯 Test Your Setup

### Test 1: Try Signing Up

1. Open your Trimly app
2. Click "Sign Up"
3. Enter:
   - Phone: `+1111111111`
   - Password: `test123`
   - Full Name: `Test User`
   - Role: Customer
4. Click "Create Account"

**Expected:** Account created, you're logged in!

---

### Test 2: Try Logging In

If you ran sample data:

1. Click "Login"
2. Enter:
   - Phone: `+1234567890`
   - Password: `password123`
3. Click "Login"

**Expected:** Logged in as John Doe (customer)

---

### Test 3: View Barbers

1. As a customer, go to "Search" tab
2. You should see barbers listed

**If you see barbers:** ✅ Backend is working!

**If you see "Failed to fetch":**
- Check project is not paused
- Check migrations ran successfully
- Check browser console for errors

---

## 🆘 Troubleshooting

### "Failed to fetch" error

**Cause:** Supabase project might be paused or migrations failed

**Fix:**
1. Check project status at Supabase dashboard
2. Verify all migrations ran successfully (green checkmarks)
3. Look for red error messages in SQL Editor

---

### "Phone number already registered"

**Cause:** Test account already exists

**Fix:**
- Use a different phone number
- OR delete from `customers` table in Table Editor

---

### "Authentication failed"

**Cause:** Password hash functions not created

**Fix:**
- Re-run `02_auth_functions.sql`
- Check for errors in SQL Editor output

---

### No barbers showing

**Cause:** Either no barbers in database OR subscriptions expired

**Fix:**
- Run `04_insert_sample_data.sql` to add test barbers
- OR sign up as a barber yourself

---

## 📚 Next Steps

✅ Backend is running! Now you can:

1. **Read the docs:**
   - `/BACKEND_API_ENDPOINTS.md` - API reference
   - `/DATABASE_SCHEMA.md` - Database structure
   - `/ARCHITECTURE.md` - System design

2. **Customize:**
   - Add more barbers
   - Create services
   - Set up time slots

3. **Deploy:**
   - Your backend is already deployed (Figma Make handles this)
   - Just use the app!

---

## 🎉 You're Done!

Your Trimly backend is now fully set up and ready to use!

**Total time:** ~5 minutes

**What you have:**
- ✅ Full authentication system
- ✅ Booking management
- ✅ Slot management
- ✅ Profile management
- ✅ Sample data (if you ran step 4)

**Start booking appointments!** 💈✨
