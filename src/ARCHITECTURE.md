# 🏗️ Trimly Architecture Overview

Complete system architecture and data flow documentation.

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND (React)                       │
│  - Customer Dashboard                                        │
│  - Barber Dashboard                                          │
│  - Booking Workflows                                         │
│  - Authentication UI                                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTPS / REST API
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION (Hono Server)            │
│  /supabase/functions/server/index.tsx                        │
│                                                              │
│  Routes:                                                     │
│  - /auth/*          (signup, login, logout, verify)         │
│  - /bookings/*      (CRUD operations)                        │
│  - /barber-profile  (profile updates)                        │
│  - /barbers/:id/services (service management)                │
│                                                              │
│  Uses: Service Role Key (bypasses RLS)                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ PostgreSQL Protocol
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                  SUPABASE POSTGRES DATABASE                  │
│                                                              │
│  Tables:                                                     │
│  ├── customers          (phone auth, profiles)              │
│  ├── barbers            (phone auth, profiles, subscriptions)│
│  ├── services           (barber services, pricing)          │
│  ├── barber_slots       (SINGLE SOURCE OF TRUTH)            │
│  ├── bookings           (booking records)                    │
│  ├── favorites          (customer favorites)                 │
│  └── sessions           (session management)                 │
│                                                              │
│  Views:                                                      │
│  ├── v_available_slots_by_barber                            │
│  ├── v_bookings_with_details                                │
│  ├── v_barber_services                                      │
│  ├── v_barber_stats                                         │
│  └── v_active_barbers                                       │
│                                                              │
│  Functions:                                                  │
│  ├── hash_password()                                        │
│  ├── verify_password()                                      │
│  ├── create_customer()                                      │
│  ├── authenticate_customer()                                │
│  ├── create_barber()                                        │
│  ├── authenticate_barber()                                  │
│  └── session management functions                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### Sign Up Flow

```
┌─────────┐
│ User    │
│ enters  │
│ phone + │
│password │
└────┬────┘
     │
     ▼
┌─────────────────────────────┐
│ Frontend sends:             │
│ POST /auth/signup           │
│ {phone, password,           │
│  fullName, role}            │
└────┬────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ Server (index.tsx):         │
│ 1. Call create_customer()  │
│    or create_barber()       │
│ 2. Hash password (bcrypt)   │
│ 3. Insert into database     │
│ 4. Create session token     │
│ 5. Return sessionToken      │
└────┬────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ Frontend:                   │
│ 1. Store sessionToken in    │
│    localStorage             │
│ 2. Set currentUser state    │
│ 3. Navigate to dashboard    │
└─────────────────────────────┘
```

### Login Flow

```
┌─────────┐
│ User    │
│ enters  │
│ phone + │
│password │
└────┬────┘
     │
     ▼
┌─────────────────────────────┐
│ Frontend sends:             │
│ POST /auth/login            │
│ {phone, password}           │
└────┬────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ Server:                     │
│ 1. Call authenticate_       │
│    customer() or            │
│    authenticate_barber()    │
│ 2. Verify password hash     │
│ 3. Create new session       │
│ 4. Return user + token      │
└────┬────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ Frontend:                   │
│ 1. Store sessionToken       │
│ 2. Fetch user profile       │
│ 3. Set currentUser          │
└─────────────────────────────┘
```

### Session Verification

```
┌─────────┐
│ Page    │
│ load    │
└────┬────┘
     │
     ▼
┌─────────────────────────────┐
│ Frontend:                   │
│ 1. Check localStorage for   │
│    sessionToken             │
│ 2. If exists, send:         │
│    POST /auth/verify-session│
└────┬────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ Server:                     │
│ 1. Call verify_session()    │
│ 2. Check token exists       │
│ 3. Check not expired        │
│ 4. Return valid + userId    │
└────┬────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ Frontend:                   │
│ If valid:                   │
│   - Fetch user profile      │
│   - Restore user state      │
│ If invalid:                 │
│   - Clear localStorage      │
│   - Show login              │
└─────────────────────────────┘
```

---

## 📅 Booking Flow

### Customer Booking Flow

```
1. Customer searches for barber
   ↓
2. Views barber profile
   ↓
3. Selects service
   ↓
4. Picks date
   ↓
5. Frontend fetches available slots from:
   v_available_slots_by_barber view
   WHERE barber_id = X AND slot_date = Y
   ↓
6. Customer selects time slot
   ↓
7. Booking details shown:
   - Service name, duration, price
   - Selected date & time
   - Barber details
   ↓
8. Customer confirms
   ↓
9. Frontend sends:
   POST /bookings
   {barber_id, customer_id, slot_id, service_id,
    date, start_time, end_time, duration, price}
   ↓
10. Server:
    a. Validate slot is still available
    b. Insert into bookings table
    c. Update barber_slots:
       - status = 'booked'
       - booked_by_customer_id = customer_id
       - booked_at = NOW()
    d. Generate unique booking_code
    e. Return booking with joined data
   ↓
11. Frontend:
    - Show success message
    - Add to bookings list
    - Navigate to bookings tab
```

### Barber Manual Booking Flow

```
1. Barber opens "Manual Booking" tab
   ↓
2. Selects service from their services
   ↓
3. Picks date
   ↓
4. Picks time slot (from their available slots)
   ↓
5. Enters walk-in customer info:
   - Name (required)
   - Phone (optional)
   ↓
6. Confirms booking
   ↓
7. Frontend sends:
   POST /bookings
   {barber_id, slot_id, service_id,
    date, start_time, end_time, duration, price,
    source: 'manual',
    manual_customer_name: 'Walk-in',
    manual_customer_phone: '+123...'}
   ↓
8. Server:
   - Same as customer booking
   - customer_id is NULL (manual booking)
   - Stores manual customer info
   ↓
9. Booking appears in barber's dashboard
```

---

## 🎰 Slot Management (Single Source of Truth)

The `barber_slots` table is the **ONLY** source for availability:

### Slot States

```
┌──────────────────────────────────────────────┐
│           barber_slots Table                 │
├──────────────────────────────────────────────┤
│                                              │
│  status = 'available'                        │
│  ├─ is_available = true                      │
│  ├─ booked_by_customer_id = NULL             │
│  └─ bookingsid = NULL                        │
│                                              │
│  status = 'booked'                           │
│  ├─ is_available = false                     │
│  ├─ booked_by_customer_id = <customer_id>    │
│  ├─ booked_at = <timestamp>                  │
│  └─ booking_id = <booking_id>                │
│                                              │
│  status = 'unavailable'                      │
│  ├─ is_available = false                     │
│  ├─ booked_by_customer_id = NULL             │
│  └─ Set by barber (break, lunch, etc.)       │
│                                              │
└──────────────────────────────────────────────┘
```

### Slot Lifecycle

```
CREATE (Barber creates availability)
   ↓
┌─────────────────┐
│   AVAILABLE     │ ← Status when created
│  is_available=T │
└────────┬────────┘
         │
         │ Customer books
         ▼
┌─────────────────┐
│     BOOKED      │ ← Customer confirmed
│  is_available=F │
│  booked_by_...  │
└────────┬────────┘
         │
         │ Booking cancelled OR
         │ Barber marks unavailable
         ▼
┌─────────────────┐
│   AVAILABLE     │ ← Back to available
│   (returned)    │   OR
└─────────────────┘
         OR
┌─────────────────┐
│  UNAVAILABLE    │ ← Marked by barber
│ (barber break)  │
└─────────────────┘
```

---

## 🔄 Data Synchronization

### Profile Updates

```
Barber updates profile in dashboard
   ↓
Frontend sends PUT /barber-profile
   ↓
Server updates barbers table
   ↓
Frontend refetches barbers
   ↓
Customer homepage shows updated info
```

### Service Updates

```
Barber adds/edits services
   ↓
Frontend sends POST /barbers/:id/services
   ↓
Server:
  1. Deletes old services
  2. Inserts new services
  3. Calculates price_range_min/max
  4. Updates barbers table
   ↓
Frontend refetches barbers & services
   ↓
Booking flow shows updated services
```

---

## 🛡️ Security Model

### No RLS - Server-Side Authorization

```
┌─────────────────────────────────────┐
│  Traditional Approach (RLS):        │
│  ❌ Frontend → Database (RLS blocks)│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Trimly Approach:                   │
│  ✅ Frontend → Server → Database    │
│                ↑                     │
│           Service Role Key           │
│           (bypasses RLS)             │
└─────────────────────────────────────┘
```

**Why?**
- RLS policies were too complex for this use case
- Server validates permissions explicitly
- Service role key gives full database access
- Server code is trusted environment

### Authentication Layers

1. **Session Token** - Stored in localStorage, verified on each request
2. **Password Hashing** - Bcrypt with 10 rounds (one-way hash)
3. **Session Expiry** - 30-day automatic expiry
4. **HTTPS Only** - All communication encrypted
5. **CORS** - Restricted to specific origins

---

## 📊 Database Optimization

### Indexes

All critical queries are indexed:

```sql
-- Fast barber lookups
idx_barbers_phone
idx_barbers_subscription_status

-- Fast slot queries
idx_slots_barber_date  (barber_id, slot_date)
idx_slots_status
idx_slots_available

-- Fast booking queries
idx_bookings_barber_id
idx_bookings_customer_id
idx_bookings_date

-- Fast session lookups
idx_sessions_token
idx_sessions_user
```

### Views for Performance

Instead of complex JOINs in frontend:

```sql
-- Get bookings with all details (1 query instead of 3)
SELECT * FROM v_bookings_with_details 
WHERE customer_id = $1;

-- Get available slots (pre-filtered)
SELECT * FROM v_available_slots_by_barber
WHERE barber_id = $1 AND slot_date = $2;

-- Get barber stats (pre-calculated)
SELECT * FROM v_barber_stats
WHERE barber_id = $1;
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript |
| UI Framework | Tailwind CSS |
| State Management | React useState/useEffect |
| HTTP Client | Fetch API |
| Backend | Supabase Edge Functions (Deno) |
| Web Framework | Hono |
| Database | PostgreSQL (Supabase) |
| Auth | Custom (bcrypt + sessions) |
| Deployment | Figma Make |

---

## 📝 Key Design Decisions

### 1. Phone-Only Auth (No Email)
**Why:** Simpler for barber shops, faster signup, common in service industries

### 2. Single Slots Table
**Why:** Eliminates sync issues, single source of truth, simpler queries

### 3. Server Bypass RLS
**Why:** RLS was blocking operations, server gives explicit control, easier to debug

### 4. Manual Bookings Support
**Why:** Walk-in customers don't have accounts, barbers need to track all appointments

### 5. Subscription in Barber Table
**Why:** Quick visibility filter, no separate subscriptions table needed for MVP

### 6. Price in Cents
**Why:** Avoids floating-point errors, standard practice for currency

### 7. Session Tokens over JWT
**Why:** Simpler to invalidate, stored in database for audit, no expiry issues

---

This architecture supports high availability, fast queries, and secure data handling! 🎯
