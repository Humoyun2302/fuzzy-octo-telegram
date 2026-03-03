# 📘 Trimly Backend - Complete Guide

**Everything you need to know about the Trimly backend in one place.**

---

## 🎯 What is This?

Trimly is a production-ready barber booking platform with:
- ✅ Phone-number authentication (no email required)
- ✅ Real-time booking system
- ✅ Slot management (single source of truth)
- ✅ Manual bookings for walk-ins
- ✅ Subscription management for barbers
- ✅ Complete API for all operations

---

## 📋 Table of Contents

1. [Quick Start](#quick-start) - Get running in 5 minutes
2. [What You Need](#what-you-need) - Requirements
3. [Setup Steps](#setup-steps) - Detailed instructions
4. [Database Structure](#database-structure) - Tables & relationships
5. [API Reference](#api-reference) - All endpoints
6. [How It Works](#how-it-works) - Architecture & flows
7. [Testing](#testing) - Verify your setup
8. [Troubleshooting](#troubleshooting) - Common issues
9. [FAQs](#faqs) - Frequently asked questions

---

## 🚀 Quick Start

### Prerequisites

- Supabase account (free tier OK)
- Project URL: `https://qxobvbukuxlccqbcbiji.supabase.co`
- Project must be **ACTIVE** (not paused)

### 3-Step Setup

```bash
# 1. Open Supabase SQL Editor
https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji/sql

# 2. Run these SQL files in order:
/supabase/migrations/01_create_tables.sql       ← Tables
/supabase/migrations/02_auth_functions.sql      ← Authentication
/supabase/migrations/03_create_view.sql         ← Views
/supabase/migrations/04_insert_sample_data.sql  ← Test data (optional)

# 3. Verify in Table Editor
You should see: customers, barbers, services, barber_slots, bookings, favorites, sessions
```

**Done!** Your backend is ready. ⏱️ Total time: ~5 minutes

---

## 📦 What You Need

### Required

| Item | Description | Where to Get |
|------|-------------|--------------|
| Supabase Project | PostgreSQL database & backend | https://supabase.com |
| SQL Editor Access | To run migrations | Supabase Dashboard → SQL Editor |
| Project Keys | URL + Anon Key | Supabase Dashboard → Settings → API |

### Already Have

✅ **Server Code** - Located in `/supabase/functions/server/index.tsx` (auto-deployed by Figma Make)
✅ **Migration Files** - All SQL files in `/supabase/migrations/`
✅ **Documentation** - All `.md` files in project root

---

## 🔧 Setup Steps

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji
2. Click **"SQL Editor"** in left sidebar
3. Click **"+ New query"**

---

### Step 2: Run Migration 1 - Create Tables

**File:** `/supabase/migrations/01_create_tables.sql`

**What it does:**
- Creates all database tables
- Sets up relationships (foreign keys)
- Adds indexes for performance
- Creates auto-update triggers

**How to run:**
1. Open the file
2. Copy **entire content**
3. Paste into SQL Editor
4. Click **"RUN"** (or Ctrl/Cmd + Enter)

**Expected output:**
```
✅ All tables created successfully!
📋 Created tables: customers, barbers, services, barber_slots, bookings, favorites, sessions
🔄 Next step: Run 02_auth_functions.sql
```

**Tables created:**
- `customers` - Customer accounts
- `barbers` - Barber accounts & subscriptions
- `services` - Barber services (name, price, duration)
- `barber_slots` - Time slot availability (**single source of truth**)
- `bookings` - Booking records
- `favorites` - Customer favorite barbers
- `sessions` - Authentication sessions

---

### Step 3: Run Migration 2 - Auth Functions

**File:** `/supabase/migrations/02_auth_functions.sql`

**What it does:**
- Enables `pgcrypto` extension for password hashing
- Creates password hashing functions (bcrypt)
- Creates customer signup/login functions
- Creates barber signup/login functions
- Sets up session management

**How to run:**
1. Open the file
2. Copy entire content
3. Paste into SQL Editor
4. Click **"RUN"**

**Expected output:**
```
✅ Authentication functions created successfully!
🔐 Password hashing: hash_password(), verify_password()
👤 Customer auth: create_customer(), authenticate_customer()
✂️ Barber auth: create_barber(), authenticate_barber()
🎫 Session management: create_session(), verify_session(), delete_session()
🔄 Next step: Run 03_create_view.sql
```

**Functions created:**
- `hash_password(password)` - Hash plaintext password
- `verify_password(password, hash)` - Verify password
- `create_customer()` - Sign up customer
- `authenticate_customer()` - Login customer
- `create_barber()` - Sign up barber
- `authenticate_barber()` - Login barber
- `create_session()` - Create auth session
- `verify_session()` - Verify session token
- `delete_session()` - Logout

---

### Step 4: Run Migration 3 - Create Views

**File:** `/supabase/migrations/03_create_view.sql`

**What it does:**
- Creates pre-built views for common queries
- Optimizes database performance
- Simplifies frontend queries

**How to run:**
1. Open the file
2. Copy entire content
3. Paste into SQL Editor
4. Click **"RUN"**

**Expected output:**
```
✅ Database views created successfully!
📊 Created views:
  - v_available_slots_by_barber (for booking workflows)
  - v_bookings_with_details (for booking history)
  - v_barber_services (for service listings)
  - v_barber_stats (for analytics)
  - v_active_barbers (for customer search)
🔄 Next step: (Optional) Run 04_insert_sample_data.sql for testing
```

**Views created:**
- `v_available_slots_by_barber` - Available time slots with barber details
- `v_bookings_with_details` - Bookings with joined barber/customer/service data
- `v_barber_services` - Active services with barber info
- `v_barber_stats` - Barber statistics (earnings, bookings count)
- `v_active_barbers` - Only barbers with active subscriptions

---

### Step 5: Run Migration 4 - Sample Data (OPTIONAL)

**File:** `/supabase/migrations/04_insert_sample_data.sql`

**What it does:**
- Creates 3 test customer accounts
- Creates 5 test barber accounts with profiles
- Adds sample services for each barber
- Creates available time slots for tomorrow

**When to run:**
- ✅ **Run if:** You want to test the app immediately
- ❌ **Skip if:** You want a clean database to start

**How to run:**
1. Open the file
2. Copy entire content
3. Paste into SQL Editor
4. Click **"RUN"**

**Expected output:**
```
========================================
✅ SAMPLE DATA CREATED SUCCESSFULLY!
========================================

👤 TEST CUSTOMERS (Password: password123):
  • +1234567890 - John Doe
  • +1234567891 - Jane Smith
  • +1234567892 - Mike Johnson

✂️ TEST BARBERS (Password: barber123):
  • +9876543210 - Alex Martinez (Modern Styles)
  • +9876543211 - Carlos Rodriguez (Traditional)
  • +9876543212 - Sarah Chen (Kids & Family)
  • +9876543213 - James Wilson (Luxury)
  • +9876543214 - Tommy Lee (Budget-Friendly)

📅 Available slots created for tomorrow
💼 Services added for all barbers

🎯 You can now test the app with these accounts!
```

---

## 🗄️ Database Structure

### Tables Overview

```
customers (phone auth, profiles)
├── id (UUID, primary key)
├── phone (TEXT, unique)
├── password_hash (TEXT)
└── full_name (TEXT)

barbers (phone auth, profiles, subscriptions)
├── id (UUID, primary key)
├── phone (TEXT, unique)
├── password_hash (TEXT)
├── full_name (TEXT)
├── bio, avatar, address
├── districts[], languages[], specialties[]
├── subscription_status, subscription_expiry_date
└── price_range_min, price_range_max

services (what barbers offer)
├── id (UUID, primary key)
├── barber_id (→ barbers.id)
├── name (TEXT)
├── duration (INTEGER, minutes)
├── price (INTEGER, cents)
└── description (TEXT)

barber_slots (SINGLE SOURCE OF TRUTH)
├── id (UUID, primary key)
├── barber_id (→ barbers.id)
├── slot_date (DATE)
├── start_time, end_time (TIME)
├── status ('available', 'booked', 'unavailable')
├── booked_by_customer_id (→ customers.id, nullable)
└── booking_id (UUID, nullable)

bookings (booking records)
├── id (UUID, primary key)
├── booking_code (TEXT, unique, e.g., "BK-ABC123")
├── barber_id (→ barbers.id)
├── customer_id (→ customers.id, nullable for manual)
├── slot_id (→ barber_slots.id)
├── service_id (→ services.id)
├── date, start_time, end_time
├── duration, price
├── status ('confirmed', 'cancelled', 'completed')
├── source ('online' or 'manual')
└── manual_customer_name, manual_customer_phone

favorites
├── customer_id (→ customers.id)
└── barber_id (→ barbers.id)

sessions (auth tokens)
├── session_token (TEXT, unique)
├── user_id (UUID)
├── role ('customer' or 'barber')
└── expires_at (TIMESTAMPTZ)
```

### Relationships

```
customers ──┬─→ bookings
            ├─→ favorites
            └─→ barber_slots (booked_by)

barbers ──┬─→ services
          ├─→ barber_slots
          └─→ bookings

barber_slots ←─→ bookings (via slot_id & booking_id)

sessions ──→ (customers OR barbers via user_id)
```

---

## 🌐 API Reference

**Base URL:** `https://qxobvbukuxlccqbcbiji.supabase.co/functions/v1/make-server-166b98fa`

### Authentication Endpoints

#### POST `/auth/signup`
Create new account (customer or barber)

**Body:**
```json
{
  "phone": "+1234567890",
  "password": "securepass",
  "fullName": "John Doe",
  "role": "customer"  // or "barber"
}
```

**Response:**
```json
{
  "success": true,
  "user": { "id": "...", "phone": "...", "role": "..." },
  "sessionToken": "...",
  "profile": { ... }
}
```

---

#### POST `/auth/login`
Login with phone + password

**Body:**
```json
{
  "phone": "+1234567890",
  "password": "securepass"
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... },
  "sessionToken": "...",
  "profile": { ... }
}
```

---

#### POST `/auth/logout`
Logout (requires session token)

**Headers:** `Authorization: Bearer {sessionToken}`

---

#### POST `/auth/verify-session`
Check if session is valid

**Headers:** `Authorization: Bearer {sessionToken}`

**Response:**
```json
{
  "valid": true,
  "userId": "...",
  "role": "customer"
}
```

---

### Booking Endpoints

#### GET `/bookings`
Get user's bookings

**Headers:**
```
Authorization: Bearer {publicAnonKey}
X-Session-Token: {sessionToken}
```

**Response:**
```json
{
  "bookings": [
    {
      "id": "...",
      "booking_code": "BK-ABC123",
      "date": "2024-01-15",
      "start_time": "14:00:00",
      "barber": { ... },
      "customer": { ... },
      "status": "confirmed"
    }
  ]
}
```

---

#### POST `/bookings`
Create booking

**Headers:** Same as GET

**Body:**
```json
{
  "barber_id": "...",
  "customer_id": "...",
  "slot_id": "...",
  "service_id": "...",
  "date": "2024-01-15",
  "start_time": "14:00:00",
  "end_time": "14:45:00",
  "duration": 45,
  "price": 3500,
  "source": "online"
}
```

---

#### DELETE `/bookings/:id`
Cancel booking

---

#### PUT `/bookings/:id/reschedule`
Reschedule to new slot

**Body:**
```json
{
  "new_slot_id": "...",
  "new_date": "2024-01-16",
  "new_start_time": "15:00:00",
  "new_end_time": "15:45:00"
}
```

---

### Profile Endpoints

#### PUT `/barber-profile`
Update barber profile

**Body:**
```json
{
  "name": "Alex Martinez",
  "bio": "Expert barber...",
  "address": "123 Main St",
  "languages": ["English", "Spanish"],
  "districts": ["Downtown", "Midtown"],
  "specialties": ["Modern Cuts"],
  "priceRangeMin": 2000,
  "priceRangeMax": 8000
}
```

---

#### POST `/barbers/:id/services`
Save barber services

**Body:**
```json
{
  "services": [
    {
      "name": "Haircut",
      "duration": 45,
      "price": 3500,
      "description": "Modern haircut"
    }
  ]
}
```

---

## 🔄 How It Works

### Authentication Flow

```
1. User signs up
   ↓
2. Server hashes password (bcrypt)
   ↓
3. User saved to database
   ↓
4. Session token generated
   ↓
5. Token returned to frontend
   ↓
6. Token stored in localStorage
   ↓
7. All future requests include token
```

### Booking Flow

```
1. Customer picks barber & service
   ↓
2. Frontend fetches available slots:
   SELECT * FROM v_available_slots_by_barber
   WHERE barber_id = X AND slot_date = Y
   ↓
3. Customer selects slot
   ↓
4. Frontend sends POST /bookings
   ↓
5. Server:
   - Creates booking record
   - Updates slot: status = 'booked'
   - Returns confirmation
   ↓
6. Booking appears in dashboard
```

### Slot Management

```
barber_slots table = SINGLE SOURCE OF TRUTH

States:
  'available' → Free for booking
  'booked'    → Customer has reserved
  'unavailable' → Barber marked (break, lunch)

When booking created:
  - Insert into bookings
  - Update slot: status = 'booked', booking_id = X

When booking cancelled:
  - Update booking: status = 'cancelled'
  - Update slot: status = 'available', booking_id = NULL
```

---

## 🧪 Testing

### Test 1: Sign Up

1. Open app
2. Click "Sign Up"
3. Enter: `+1111111111` / `test123` / `Test User` / `Customer`
4. **Expected:** Account created, logged in

### Test 2: Login (with sample data)

1. Click "Login"
2. Enter: `+1234567890` / `password123`
3. **Expected:** Logged in as John Doe

### Test 3: View Barbers

1. Go to "Search" tab
2. **Expected:** List of 5 barbers (if sample data was run)

### Test 4: Create Booking

1. Click on a barber
2. Select service
3. Pick tomorrow's date
4. Select time slot
5. Confirm
6. **Expected:** Booking created, success message

---

## 🆘 Troubleshooting

### "Failed to fetch"

**Cause:** Project paused, migrations failed, or network issue

**Fix:**
1. Check project is active in Supabase dashboard
2. Verify all migrations ran successfully
3. Check browser console for specific error

---

### "Authentication failed"

**Cause:** Password functions not created or wrong credentials

**Fix:**
1. Re-run `02_auth_functions.sql`
2. Verify phone format (include +)
3. Check password is correct

---

### No barbers showing

**Cause:** No barbers in database or expired subscriptions

**Fix:**
1. Run `04_insert_sample_data.sql`
2. OR sign up as a barber
3. Check `subscription_status` and `subscription_expiry_date`

---

### "Slot not available"

**Cause:** Someone else booked it, or it's marked unavailable

**Fix:**
1. Refresh slots
2. Pick different time
3. Check `barber_slots` table status

---

## ❓ FAQs

**Q: Do I need to deploy the server?**
A: No! Figma Make auto-deploys `/supabase/functions/server/index.tsx`

**Q: Can I use email instead of phone?**
A: No. System is phone-only by design.

**Q: Where is Row Level Security (RLS)?**
A: We don't use RLS. Server uses service role key to bypass it.

**Q: How do I reset the database?**
A: Delete all rows in Supabase Table Editor, then re-run migrations.

**Q: Can I modify the schema?**
A: Yes, but you'll need to write custom migration SQL.

**Q: Where are passwords stored?**
A: In `password_hash` column, encrypted with bcrypt (10 rounds).

**Q: How long do sessions last?**
A: 30 days (720 hours) by default.

**Q: What happens when a barber's trial expires?**
A: They're hidden from customer search, can't receive new bookings.

**Q: Can I have both online and manual bookings?**
A: Yes! Set `source` to 'online' or 'manual' in booking.

**Q: How do I add more barbers?**
A: Sign up through the app with `role="barber"`, or insert SQL.

---

## 📚 Additional Resources

- **[QUICK_START.md](./QUICK_START.md)** - 5-minute setup guide
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Complete database reference
- **[BACKEND_API_ENDPOINTS.md](./BACKEND_API_ENDPOINTS.md)** - Full API docs
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design & flows
- **[SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)** - Printable checklist

---

## ✅ Success Checklist

Before considering setup complete:

- [ ] All 4 SQL migrations ran successfully
- [ ] 8 tables visible in Supabase Table Editor
- [ ] Can sign up new account
- [ ] Can login with test account
- [ ] Barbers list appears (if sample data run)
- [ ] No "Failed to fetch" errors
- [ ] Can create booking (if sample data run)
- [ ] Booking appears in dashboard

**All checked?** 🎉 **Your backend is production-ready!**

---

**Total Setup Time:** ~5 minutes
**Difficulty:** Beginner-friendly
**Production Ready:** Yes

Start building your barber booking platform! 🚀💈
