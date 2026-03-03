# 🎨 Trimly Backend - Visual Setup Guide

**A visual, step-by-step guide with diagrams and screenshots descriptions.**

---

## 📍 Where You Are Now

```
┌─────────────────────────────────────┐
│  YOU ARE HERE                       │
│  ↓                                  │
│  Need to set up backend             │
│                                     │
│  What you have:                     │
│  ✅ Supabase account                │
│  ✅ Project created                 │
│  ✅ SQL files ready                 │
│                                     │
│  What you need:                     │
│  ❌ Database tables                 │
│  ❌ Auth functions                  │
│  ❌ Test data                       │
└─────────────────────────────────────┘
```

---

## 🗺️ Setup Journey Map

```
START
  │
  ├─→ [1] Open Supabase Dashboard
  │     │
  │     └─→ Navigate to SQL Editor
  │           │
  ├─→ [2] Run Migration 1 (Tables)
  │     │
  │     ├─→ Copy 01_create_tables.sql
  │     ├─→ Paste in editor
  │     └─→ Click RUN
  │           │
  │           ✓ Tables created
  │           │
  ├─→ [3] Run Migration 2 (Auth)
  │     │
  │     ├─→ Copy 02_auth_functions.sql
  │     ├─→ Paste in editor
  │     └─→ Click RUN
  │           │
  │           ✓ Auth functions created
  │           │
  ├─→ [4] Run Migration 3 (Views)
  │     │
  │     ├─→ Copy 03_create_view.sql
  │     ├─→ Paste in editor
  │     └─→ Click RUN
  │           │
  │           ✓ Views created
  │           │
  ├─→ [5] OPTIONAL: Run Migration 4 (Sample Data)
  │     │
  │     ├─→ Copy 04_insert_sample_data.sql
  │     ├─→ Paste in editor
  │     └─→ Click RUN
  │           │
  │           ✓ Test accounts created
  │           │
  └─→ [6] Verify Setup
        │
        ├─→ Check Table Editor
        ├─→ Test signup/login
        └─→ View barbers
              │
              ✓ SUCCESS!
                │
              END
```

---

## 📊 Database Architecture Visual

```
┌─────────────────────────────────────────────────────┐
│                  TRIMLY DATABASE                    │
└────────────────���────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  CUSTOMERS   │  │   BARBERS    │  │   SERVICES   │
│              │  │              │  │              │
│ - id (PK)    │  │ - id (PK)    │  │ - id (PK)    │
│ - phone ✱    │  │ - phone ✱    │  │ - barber_id  │
│ - password   │  │ - password   │  │ - name       │
│ - full_name  │  │ - full_name  │  │ - duration   │
│              │  │ - bio        │  │ - price      │
│              │  │ - avatar     │  └──────────────┘
│              │  │ - districts  │         │
│              │  │ - languages  │         │
│              │  │ - subscription│        │
└──────┬───────┘  └──────┬───────┘         │
       │                 │                 │
       │                 │         ┌───────┘
       │                 │         │
       ▼                 ▼         ▼
┌──────────────────────────────────────────┐
│           BARBER_SLOTS                   │
│    (SINGLE SOURCE OF TRUTH)              │
│                                          │
│  - id (PK)                               │
│  - barber_id (FK)                        │
│  - slot_date                             │
│  - start_time, end_time                  │
│  - status ◄──────────┐                   │
│    ('available',     │                   │
│     'booked',        │                   │
│     'unavailable')   │                   │
│  - booked_by (FK) ───┼───────────────┐   │
│  - booking_id (FK) ──┼──────┐        │   │
└──────────────────────┼──────┼────────┼───┘
                       │      │        │
       ┌───────────────┘      │        │
       │                      │        │
       ▼                      ▼        │
┌──────────────┐      ┌────────────────▼──┐
│   BOOKINGS   │      │    FAVORITES      │
│              │      │                   │
│ - id (PK)    │      │ - customer_id (FK)│
│ - code ✱     │      │ - barber_id (FK)  │
│ - barber_id  │      └───────────────────┘
│ - customer_id│
│ - slot_id    │
│ - service_id │
│ - date, time │
│ - price      │
│ - status     │
│ - source     │
└──────────────┘

✱ = Unique constraint
PK = Primary Key
FK = Foreign Key
```

---

## 🔐 Authentication Flow Diagram

```
┌─────────────┐
│   USER      │
│ (Customer   │
│  or Barber) │
└──────┬──────┘
       │
       │ 1. Enters phone + password
       │
       ▼
┌─────────────────────────────────┐
│  FRONTEND (React)               │
│                                 │
│  POST /auth/signup              │
│  {                              │
│    phone: "+1234567890",        │
│    password: "secret",          │
│    fullName: "John Doe",        │
│    role: "customer"             │
│  }                              │
└──────┬──────────────────────────┘
       │
       │ 2. HTTP Request
       │
       ▼
┌─────────────────────────────────┐
│  SERVER (Hono on Edge Function) │
│                                 │
│  1. Validate input              │
│  2. Hash password (bcrypt)      │
│  3. Call create_customer() or   │
│     create_barber() function    │
│  4. Generate session token      │
│  5. Return user + token         │
└──────┬──────────────────────────┘
       │
       │ 3. SQL Function Call
       │
       ▼
┌─────────────────────────────────┐
│  POSTGRES DATABASE              │
│                                 │
│  Function: create_customer()    │
│  1. Check phone not exists      │
│  2. Hash password (pgcrypto)    │
│  3. INSERT into customers       │
│  4. Return user data            │
└──────┬──────────────────────────┘
       │
       │ 4. User created
       │
       ▼
┌─────────────────────────────────┐
│  SESSION TABLE                  │
│                                 │
│  INSERT:                        │
│  - session_token: "abc123..."   │
│  - user_id: "uuid"              │
│  - role: "customer"             │
│  - expires_at: NOW() + 30 days  │
└──────┬──────────────────────────┘
       │
       │ 5. Session token returned
       │
       ▼
┌─────────────────────────────────┐
│  FRONTEND                       │
│                                 │
│  localStorage.setItem(          │
│    'trimly_session_token',      │
│    sessionToken                 │
│  )                              │
│                                 │
│  User is now logged in! ✅      │
└─────────────────────────────────┘
```

---

## 📅 Booking Flow Visualization

```
CUSTOMER BOOKING FLOW
═════════════════════

┌──────────┐
│ Customer │
└────┬─────┘
     │
     ▼
┌─────────────────────┐
│ 1. Browse barbers   │
│    (Search page)    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 2. Select barber    │
│    (Profile page)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 3. Pick service     │
│    "Haircut - $35"  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 4. Choose date      │
│    "Tomorrow"       │
└─────────┬───────────┘
          │
          │ Query: SELECT * FROM v_available_slots_by_barber
          │        WHERE barber_id = X AND slot_date = Y
          │
          ▼
┌─────────────────────┐
│ 5. Pick time slot   │
│    "2:00 PM"        │
│                     │
│  Available slots:   │
│  ○ 1:00 PM         │
│  ● 2:00 PM ✓       │
│  ○ 3:00 PM         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 6. Review booking   │
��                     │
│  Alex Martinez      │
│  Haircut (45 min)   │
│  Tomorrow, 2:00 PM  │
│  Price: $35.00      │
│                     │
│  [Confirm] [Cancel] │
└─────────┬───────────┘
          │
          │ POST /bookings
          │
          ▼
┌─────────────────────────────┐
│ SERVER PROCESSING           │
│                             │
│ 1. Validate slot available  │
│ 2. Create booking:          │
│    - Generate code          │
│    - Set status='confirmed' │
│ 3. Update slot:             │
│    - status='booked'        │
│    - booked_by=customer_id  │
│ 4. Return booking           │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────┐
│ 7. Success!         │
│                     │
│  ✅ Booking confirmed│
│  Code: BK-ABC123    │
│                     │
│  View in bookings→  │
└─────────────────────┘
```

---

## 🎯 Slot States Diagram

```
BARBER_SLOTS STATE MACHINE
═══════════════════════════

Initial State:
┌────────────────────┐
│    AVAILABLE       │
│                    │
│  status: available │
│  is_available: T   │
│  booked_by: null   │
└──────┬─────────────┘
       │
       │ Customer creates booking
       │ ↓
       ▼
┌────────────────────┐
│      BOOKED        │
│                    │
│  status: booked    │
│  is_available: F   │
│  booked_by: cust_id│
│  booking_id: xxx   │
│  booked_at: NOW()  │
└──────┬─────────────┘
       │
       ├──→ Booking cancelled
       │    ↓
       │    Back to AVAILABLE
       │
       └──→ Appointment completed
            ↓
            Stays BOOKED (historical record)

Alternative Path from AVAILABLE:
       │
       │ Barber marks unavailable
       │ ↓
       ▼
┌────────────────────┐
│   UNAVAILABLE      │
│                    │
│  status: unavailable│
│  is_available: F   │
│  booked_by: null   │
│                    │
│  (Break, lunch, etc)│
└──────┬─────────────┘
       │
       │ Barber removes unavailability
       │ ↓
       │ Back to AVAILABLE
```

---

## 📂 File Locations Map

```
PROJECT ROOT
│
├── 📁 /supabase/migrations/
│   ├── 01_create_tables.sql       ← Run 1st
│   ├── 02_auth_functions.sql      ← Run 2nd
│   ├── 03_create_view.sql         ← Run 3rd
│   └── 04_insert_sample_data.sql  ← Run 4th (optional)
│
├── 📁 /supabase/functions/server/
│   ├── index.tsx                  ← Main server (auto-deployed)
│   ├── auth-service.tsx           ← Auth logic
│   ├── otp-service.tsx            ← OTP service
│   └── kv_store.tsx               ← KV utilities (protected)
│
├── 📄 00_START_HERE.md            ← Main guide (read first)
├── 📄 QUICK_START.md              ← 5-min setup
├── 📄 DATABASE_SCHEMA.md          ← Tables reference
├── 📄 BACKEND_API_ENDPOINTS.md    ← API docs
├── 📄 ARCHITECTURE.md             ← System design
├── 📄 BACKEND_COMPLETE_GUIDE.md   ← Everything in one
├── 📄 SETUP_CHECKLIST.md          ← Printable checklist
└── 📄 VISUAL_SETUP_GUIDE.md       ← This file
```

---

## 🖥️ Supabase Dashboard Navigation

```
https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji
                                          │
                ┌──────────���──────────────┼─────────────────────────┐
                │                         │                         │
                ▼                         ▼                         ▼
        ┌──────────────┐          ┌──────────────┐         ┌──────────────┐
        │ SQL EDITOR   │          │ TABLE EDITOR │         │   SETTINGS   │
        │              │          │              │         │              │
        │ Run SQL      │          │ View tables  │         │ Get API keys │
        │ migrations   │          │ Browse data  │         │ Project URL  │
        │              │          │ Add/edit rows│         │              │
        └──────────────┘          └──────────────┘         └──────────────┘
             │                           │                         │
             │                           │                         │
     Use this to:              Use this to:             Use this to:
     • Run migrations          • Verify tables          • Get credentials
     • Create functions        • Check data             • Monitor usage
     • Test queries            • Debug issues           • Manage project
```

---

## ✅ Visual Success Checklist

```
SETUP PROGRESS
══════════════

[ ] Prerequisites
    ├─ [ ] Supabase account created
    ├─ [ ] Project exists
    └─ [ ] Project is active (not paused)

[ ] Migration 1 - Tables
    ├─ [ ] File opened: 01_create_tables.sql
    ├─ [ ] Content copied
    ├─ [ ] Pasted in SQL Editor
    ├─ [ ] Clicked RUN
    └─ [ ] ✅ Success message appeared

[ ] Migration 2 - Auth Functions
    ├─ [ ] File opened: 02_auth_functions.sql
    ├─ [ ] Content copied
    ├─ [ ] Pasted in SQL Editor
    ├─ [ ] Clicked RUN
    └─ [ ] ✅ Success message appeared

[ ] Migration 3 - Views
    ├─ [ ] File opened: 03_create_view.sql
    ├─ [ ] Content copied
    ├─ [ ] Pasted in SQL Editor
    ├─ [ ] Clicked RUN
    └─ [ ] ✅ Success message appeared

[ ] Migration 4 - Sample Data (OPTIONAL)
    ├─ [ ] File opened: 04_insert_sample_data.sql
    ├─ [ ] Content copied
    ├─ [ ] Pasted in SQL Editor
    ├─ [ ] Clicked RUN
    └─ [ ] ✅ Success message appeared

[ ] Verification
    ├─ [ ] Tables visible in Table Editor
    ├─ [ ] Functions visible in Database → Functions
    ├─ [ ] Views visible in Table Editor → Views
    └─ [ ] Sample data in tables (if ran migration 4)

[ ] Testing
    ├─ [ ] Can sign up new account
    ├─ [ ] Can login with test account
    ├─ [ ] Barbers list appears
    ├─ [ ] Can create booking
    └─ [ ] No errors in console

┌────────────────────────────────────────┐
│  ALL CHECKED? → SETUP COMPLETE! 🎉     │
└────────────────────────────────────────┘
```

---

## 🎓 Learning Path

```
BEGINNER                 INTERMEDIATE              ADVANCED
═══════════             ═════════════             ═════════

1. Read                 1. Understand             1. Customize
   START_HERE.md           DATABASE_SCHEMA.md        database schema
   ↓                       ↓                         ↓
2. Run                  2. Learn                  2. Extend
   migrations              API endpoints             API endpoints
   ↓                       ↓                         ↓
3. Test                 3. Explore                3. Optimize
   sample data             server code               queries
   ↓                       ↓                         ↓
4. Use                  4. Build                  4. Scale
   the app                 features                  system

Time: 10 mins           Time: 1 hour              Time: Ongoing
```

---

## 🎯 Quick Reference Card

```
╔═══════════════════════════════════════════════════════╗
║  TRIMLY BACKEND - QUICK REFERENCE                     ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  📍 Project URL:                                      ║
║     https://qxobvbukuxlccqbcbiji.supabase.co          ║
║                                                       ║
║  🔑 API Base:                                         ║
║     {projectUrl}/functions/v1/make-server-166b98fa    ║
║                                                       ║
║  📊 Tables (7):                                       ║
║     ✓ customers, barbers, services                   ║
║     ✓ barber_slots (★ single source of truth)        ║
║     ✓ bookings, favorites, sessions                  ║
║                                                       ║
║  🔐 Auth:                                             ║
║     ✓ Phone-only (no email)                          ║
║     ✓ bcrypt password hashing                        ║
║     ✓ 30-day session tokens                          ║
║                                                       ║
║  🧪 Test Accounts (if sample data run):               ║
║     Customer: +1234567890 / password123              ║
║     Barber:   +9876543210 / barber123                ║
║                                                       ║
║  📚 Docs:                                             ║
║     • 00_START_HERE.md - Main guide                  ║
║     • QUICK_START.md - 5-min setup                   ║
║     • DATABASE_SCHEMA.md - Tables                    ║
║     • BACKEND_API_ENDPOINTS.md - API                 ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

---

## 🔍 Troubleshooting Flowchart

```
                START
                  │
                  ▼
         ┌────────────────┐
         │  Have error?   │
         └───┬────────┬───┘
             │        │
         YES │        │ NO
             │        └──→ SUCCESS! 🎉
             ▼
    ┌─────────────────┐
    │ "Failed to      │
    │  fetch"?        │
    └────┬────────────┘
         │ YES
         ▼
    ┌──────────────────────┐
    │ Check:               │
    │ 1. Project paused?   │
    │ 2. Migrations ran?   │
    │ 3. Network OK?       │
    └────┬─────────────────┘
         │ Fixed?
         ▼
    ┌─────────────────┐
    │ "Auth failed"?  │
    └────┬────────────┘
         │ YES
         ▼
    ┌──────────────────────┐
    │ Check:               │
    │ 1. 02_auth ran?      │
    │ 2. Phone format OK?  │
    │ 3. Password correct? │
    └────┬─────────────────┘
         │ Fixed?
         ▼
    ┌─────────────────┐
    │ "No barbers"?   │
    └────┬────────────┘
         │ YES
         ▼
    ┌──────────────────────┐
    │ Run:                 │
    │ 04_insert_sample_    │
    │ data.sql             │
    └────┬─────────────────┘
         │
         ▼
    ┌──────────────┐
    │ Still stuck? │
    │ Check docs → │
    └──────────────┘
```

---

**This visual guide provides diagrams and flowcharts to help you understand and set up the Trimly backend!** 🎨

Need more details? See [BACKEND_COMPLETE_GUIDE.md](./BACKEND_COMPLETE_GUIDE.md)
