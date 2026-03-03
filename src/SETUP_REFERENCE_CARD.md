# 🎯 Trimly Setup - Quick Reference Card

**Print this or keep it open while setting up!**

---

## 📍 Your Supabase Project

```
Project URL:  https://qxobvbukuxlccqbcbiji.supabase.co
Project ID:   qxobvbukuxlccqbcbiji
Dashboard:    https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji
SQL Editor:   https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji/sql
```

---

## 📚 Guide Selection Matrix

| Your Goal | Read This Guide | Time |
|-----------|----------------|------|
| **Get it working ASAP** | [QUICK_SETUP_CHECKLIST.md](/QUICK_SETUP_CHECKLIST.md) | 15 min |
| **Understand architecture** | [START_HERE.md](/START_HERE.md) | 20 min |
| **Learn all details** | [BACKEND_SETUP_COMPLETE_GUIDE.md](/BACKEND_SETUP_COMPLETE_GUIDE.md) | 30 min |
| **Need API docs** | [BACKEND_API_ENDPOINTS.md](/BACKEND_API_ENDPOINTS.md) | Reference |
| **Quick overview** | [BACKEND_SUMMARY.md](/BACKEND_SUMMARY.md) | 5 min |

---

## ✅ Setup Checklist (Ultra Quick)

```
□ 1. Open Supabase SQL Editor
     → https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji/sql

□ 2. Run these SQL scripts from BACKEND_SETUP_COMPLETE_GUIDE.md:
     □ Section 1.1 → customers table
     □ Section 1.2 → barbers table
     □ Section 1.3 → services table
     □ Section 1.4 → barber_slots table
     □ Section 1.5 → bookings table
     □ Section 1.6 → favorites table
     □ Section 1.7 → password functions
     □ Section 2.1 → sessions table
     □ Section 1.8 → available slots view

□ 3. Create test barber (Section 4.3)
     → Copy barber UUID for next step

□ 4. Create test service (Section 4.4)
     → Use barber UUID from step 3

□ 5. Test app
     □ Open app in browser
     □ Check debug banner shows "Connected"
     □ Try login: +998901234567 / password123

□ 6. Done! 🎉
```

---

## 🗄️ Database Tables You'll Create (8)

| # | Table Name | Purpose | Section |
|---|------------|---------|---------|
| 1 | `customers` | Customer accounts | 1.1 |
| 2 | `barbers` | Barber accounts | 1.2 |
| 3 | `services` | Barber services | 1.3 |
| 4 | `barber_slots` | Availability | 1.4 |
| 5 | `bookings` | Appointments | 1.5 |
| 6 | `favorites` | Favorites | 1.6 |
| 7 | `sessions` | Auth sessions | 2.1 |
| 8 | `v_available_slots_by_barber` | View | 1.8 |

**Plus 2 functions:**
- `hash_password()` - Section 1.7
- `verify_password()` - Section 1.7

---

## 🔧 SQL Scripts Location

All SQL scripts are in: **`/BACKEND_SETUP_COMPLETE_GUIDE.md`**

**Table creation:** Sections 1.1 - 1.6
**Functions:** Section 1.7
**Sessions:** Section 2.1
**View:** Section 1.8
**Test data:** Sections 4.3 - 4.4

---

## 📡 API Endpoints (15 Total)

### Authentication
```
POST   /signup                      Create account
POST   /auth/login                  Login
POST   /auth/verify-session         Verify session
POST   /auth/logout                 Logout
```

### Profile
```
GET    /profile                     Get customer profile
PUT    /profile                     Update customer profile
PUT    /barber-profile              Update barber profile
```

### Services
```
POST   /barbers/:id/services        Save services
```

### Slots
```
POST   /barber/slots                Create slot
DELETE /barber/slots/:id            Delete slot
```

### Bookings
```
POST   /bookings                    Create booking
GET    /bookings                    Get bookings
PUT    /bookings/:id/reschedule     Reschedule
DELETE /bookings/:id                Cancel
```

### Health
```
GET    /health                      Health check
```

**Base URL:** `https://qxobvbukuxlccqbcbiji.supabase.co/functions/v1/make-server-166b98fa`

Full docs: **[BACKEND_API_ENDPOINTS.md](/BACKEND_API_ENDPOINTS.md)**

---

## 🧪 Test Credentials

After setup, you can login with:

**Barber Account:**
```
Phone:    +998901234567
Password: password123
Role:     barber
```

Create customer account via app signup.

---

## 🚨 Troubleshooting Quick Fixes

| Error | Fix |
|-------|-----|
| "Table does not exist" | Run SQL scripts in Supabase SQL Editor |
| "Failed to fetch" | Check Supabase project not paused |
| "Function hash_password does not exist" | Run Section 1.7 SQL script |
| "Permission denied" | RLS policies included in table scripts |
| "Barber not visible" | Check subscription_expiry_date is future |
| "No session token" | User needs to login first |

---

## ⏱️ Time Breakdown

| Task | Time |
|------|------|
| Open Supabase SQL Editor | 1 min |
| Run 9 SQL scripts | 8 min |
| Create test barber | 2 min |
| Create test service | 2 min |
| Test app | 2 min |
| **TOTAL** | **15 min** |

---

## 📊 What's Done vs What You Need to Do

### ✅ Already Done (No Work)
- Frontend code (React app)
- Backend server (Hono API)
- 15 API endpoints
- Authentication logic
- Booking system
- UI components
- Documentation

### ⚠️ You Need to Do (15 min)
- Create database tables (SQL provided)
- Create test barber (SQL provided)
- Create test service (SQL provided)

---

## 🎯 Verification Commands

Run these in SQL Editor to verify setup:

### Check tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Check functions exist:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%password%';
```

### Check test barber:
```sql
SELECT id, full_name, phone, subscription_status 
FROM barbers 
LIMIT 1;
```

### Test password function:
```sql
SELECT verify_password(
  'password123',
  hash_password('password123')
) AS works; -- Should return TRUE
```

---

## 🔗 Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji
- **SQL Editor:** https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji/sql
- **API Settings:** Dashboard → Settings → API
- **Table Editor:** Dashboard → Table Editor

---

## 📞 Help Resources

| Need | Read |
|------|------|
| Quick setup | [QUICK_SETUP_CHECKLIST.md](/QUICK_SETUP_CHECKLIST.md) |
| Understand architecture | [START_HERE.md](/START_HERE.md) |
| SQL scripts | [BACKEND_SETUP_COMPLETE_GUIDE.md](/BACKEND_SETUP_COMPLETE_GUIDE.md) |
| API docs | [BACKEND_API_ENDPOINTS.md](/BACKEND_API_ENDPOINTS.md) |
| Overview | [BACKEND_SUMMARY.md](/BACKEND_SUMMARY.md) |

---

## 🎯 Your Next Action

**👉 Open [QUICK_SETUP_CHECKLIST.md](/QUICK_SETUP_CHECKLIST.md) and start!**

---

**Keep this card open as reference while setting up!** 📌

**Estimated setup time: 15 minutes** ⚡

**Good luck!** 🚀
