# 🎯 Trimly Backend - Complete Setup Guide

**Welcome to Trimly!** This guide contains everything you need to set up the backend for your barber booking platform.

---

## 📚 Documentation Index

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[00_START_HERE.md](./00_START_HERE.md)** | Main setup guide | **READ THIS FIRST** |
| **[QUICK_START.md](./QUICK_START.md)** | 5-minute quick setup | When you want to get started fast |
| **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** | Complete database reference | When you need to understand tables |
| **[BACKEND_API_ENDPOINTS.md](./BACKEND_API_ENDPOINTS.md)** | API documentation | When building features |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | System design & flows | When you need to understand how it works |

---

## 🚀 Quick Setup (5 Minutes)

### What You Need

1. **Supabase Account** - Free tier is fine
2. **Your Project URL**: `https://qxobvbukuxlccqbcbiji.supabase.co`
3. **SQL Editor Access** - In Supabase Dashboard

### Setup Steps

```
1. Open Supabase SQL Editor
   ↓
2. Run 01_create_tables.sql
   ↓
3. Run 02_auth_functions.sql
   ↓
4. Run 03_create_view.sql
   ↓
5. (Optional) Run 04_insert_sample_data.sql
   ↓
6. ✅ Done! Start using the app
```

**Detailed instructions:** See [QUICK_START.md](./QUICK_START.md)

---

## 📁 File Structure

```
/
├── 00_START_HERE.md              ← Main setup guide
├── QUICK_START.md                ← Fast 5-minute setup
├── DATABASE_SCHEMA.md            ← Database tables & columns
├── BACKEND_API_ENDPOINTS.md      ← API reference
├── ARCHITECTURE.md               ← System design
│
├── /supabase/migrations/
│   ├── 01_create_tables.sql      ← Create all tables
│   ├── 02_auth_functions.sql     ← Auth & password hashing
│   ├── 03_create_view.sql        ← Database views
│   └── 04_insert_sample_data.sql ← Test data (optional)
│
└── /supabase/functions/server/
    ├── index.tsx                 ← Main server (auto-deployed)
    ├── auth-service.tsx          ← Auth logic
    ├── otp-service.tsx           ← OTP logic (if needed)
    └── kv_store.tsx              ← KV utilities (protected)
```

---

## 🎯 What This Backend Provides

### ✅ Features

- **Phone-only authentication** - No email required
- **Password hashing** - Bcrypt encryption
- **Session management** - 30-day expiring tokens
- **Booking system** - Online + manual (walk-in) bookings
- **Slot management** - Single source of truth for availability
- **Profile management** - Customer & barber profiles
- **Service management** - Barber services with pricing
- **Subscription tracking** - Free trial + paid plans
- **Favorites** - Customer favorite barbers

### 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `customers` | Customer accounts & profiles |
| `barbers` | Barber accounts, profiles & subscriptions |
| `services` | Services with pricing & duration |
| `barber_slots` | **Time slot availability (single source of truth)** |
| `bookings` | Booking records (online & manual) |
| `favorites` | Customer favorite barbers |
| `sessions` | Authentication session tokens |

### 🌐 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/signup` | POST | Create account |
| `/auth/login` | POST | Login |
| `/auth/logout` | POST | Logout |
| `/auth/verify-session` | POST | Verify session |
| `/bookings` | GET | Get bookings |
| `/bookings` | POST | Create booking |
| `/bookings/:id` | DELETE | Cancel booking |
| `/bookings/:id/reschedule` | PUT | Reschedule |
| `/barber-profile` | PUT | Update profile |
| `/barbers/:id/services` | POST | Save services |

**Full API docs:** See [BACKEND_API_ENDPOINTS.md](./BACKEND_API_ENDPOINTS.md)

---

## 🔐 Authentication System

### How It Works

1. **Sign Up:**
   - User enters phone + password
   - Server hashes password with bcrypt
   - User account created in database
   - Session token generated & returned
   - Token stored in `localStorage`

2. **Login:**
   - User enters phone + password
   - Server verifies password hash
   - New session token generated
   - Token returned & stored

3. **Authenticated Requests:**
   - Every request includes session token
   - Server verifies token is valid
   - Returns user data if valid

4. **Logout:**
   - Session token deleted from database
   - Token removed from `localStorage`

**No email required!** Everything is phone-based.

---

## 📅 Booking System

### How Slots Work

```
barber_slots table = SINGLE SOURCE OF TRUTH

┌─────────────────────────────────┐
│  Slot States:                   │
│                                 │
│  ✅ available                   │
│  - Free for booking             │
│  - Visible to customers         │
│                                 │
│  📅 booked                      │
│  - Customer has reserved        │
│  - Hidden from search           │
│  - Linked to booking record     │
│                                 │
│  🚫 unavailable                 │
│  - Barber marked as unavailable │
│  - Break, lunch, etc.           │
└─────────────────────────────────┘
```

### Booking Flow

1. Customer selects barber & service
2. Picks date & time from available slots
3. Confirms booking
4. Server:
   - Creates booking record
   - Updates slot status to 'booked'
   - Returns booking confirmation
5. Customer sees booking in dashboard

**For manual bookings:** Same flow, but barber initiates and enters walk-in customer info.

---

## 💰 Subscription System

Barbers have subscription status tracked in `barbers` table:

```
free_trial → active (paid) → inactive/expired
```

**Free Trial:**
- 14 days from signup
- Automatically activated on barber signup
- `trial_used = false` initially

**Active:**
- Paid monthly or annual plan
- Visible to customers
- Can receive bookings

**Inactive/Expired:**
- Subscription ended
- Hidden from customer search
- Cannot receive new bookings

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Database | PostgreSQL (Supabase) |
| Backend | Deno + Hono (Supabase Edge Functions) |
| Auth | Custom (bcrypt + sessions) |
| Password Hashing | bcrypt (10 rounds) |
| Session Storage | PostgreSQL `sessions` table |
| API Style | REST |
| Deployment | Figma Make (auto-deployed) |

---

## 🔧 Configuration

### Environment Variables

These are automatically set by Figma Make / Supabase:

```
SUPABASE_URL              - Your project URL
SUPABASE_ANON_KEY         - Public anon key (for frontend)
SUPABASE_SERVICE_ROLE_KEY - Admin key (for backend)
SUPABASE_DB_URL           - Direct database connection
```

**You don't need to set these manually!** They're auto-configured.

---

## 📊 Database Views

Pre-built views for common queries:

```sql
-- Get available slots with barber details
v_available_slots_by_barber

-- Get bookings with all joined data
v_bookings_with_details

-- Get barber services
v_barber_services

-- Get barber statistics (earnings, bookings)
v_barber_stats

-- Get only active barbers
v_active_barbers
```

Use these instead of complex JOINs in your code!

---

## 🆘 Troubleshooting

### Issue: "Failed to fetch"

**Causes:**
- Supabase project is paused
- Migrations didn't run
- Network/CORS issue

**Solutions:**
1. Check project status in Supabase dashboard
2. Verify all SQL migrations ran successfully
3. Check browser console for specific error

---

### Issue: "Authentication failed"

**Causes:**
- Password hash functions not created
- Wrong phone/password

**Solutions:**
1. Re-run `02_auth_functions.sql`
2. Verify phone number format (include +)
3. Check password is correct

---

### Issue: "No barbers showing"

**Causes:**
- No barbers in database
- All barbers have expired subscriptions

**Solutions:**
1. Run `04_insert_sample_data.sql` for test data
2. Sign up as a barber to test
3. Check barber `subscription_status` and `subscription_expiry_date`

---

### Issue: "Slot not available"

**Causes:**
- Slot was already booked by someone else
- Slot status is 'unavailable'

**Solutions:**
1. Refresh available slots
2. Pick a different time
3. Check `barber_slots` table for slot status

---

## 🎓 Learning Resources

### For Beginners

1. **Start Here:** [00_START_HERE.md](./00_START_HERE.md)
2. **Quick Setup:** [QUICK_START.md](./QUICK_START.md)
3. **Test the app** with sample data
4. **Explore** the database in Supabase Table Editor

### For Developers

1. **Database Schema:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
2. **API Docs:** [BACKEND_API_ENDPOINTS.md](./BACKEND_API_ENDPOINTS.md)
3. **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
4. **Server Code:** `/supabase/functions/server/index.tsx`

---

## 📞 Support

### Before Asking for Help

1. ✅ Read [QUICK_START.md](./QUICK_START.md)
2. ✅ Check Troubleshooting section above
3. ✅ Verify all migrations ran successfully
4. ✅ Check browser console for errors

### Common Questions

**Q: Do I need to deploy the server?**
A: No! Figma Make auto-deploys it for you.

**Q: Can I use email instead of phone?**
A: Not currently. The system is phone-only by design.

**Q: How do I add more barbers?**
A: Sign up through the app with role="barber", or run sample data SQL.

**Q: Where is RLS configured?**
A: We don't use RLS. Server uses service role key to bypass it.

**Q: How do I reset the database?**
A: Delete all rows from tables in Supabase Table Editor, then re-run migrations.

---

## ✅ Success Checklist

Before you start building, verify:

- [ ] All 4 SQL migrations ran successfully
- [ ] You can see 8 tables in Supabase Table Editor
- [ ] You can sign up a new account
- [ ] You can log in with test account (if sample data was run)
- [ ] Barbers list appears on customer homepage
- [ ] No "Failed to fetch" errors in console

**All checked?** 🎉 Your backend is ready!

---

## 🎯 Next Steps

1. **Test the app** - Create bookings, update profiles
2. **Customize** - Add your own barbers and services
3. **Build features** - Use the API to add new functionality
4. **Deploy** - Share your app with users

---

## 📝 License & Credits

This backend was built for the Trimly barber booking platform.

**Key Technologies:**
- Supabase (PostgreSQL, Edge Functions)
- Deno (Server runtime)
- Hono (Web framework)
- bcrypt (Password hashing)

---

**Happy coding!** 🚀💈

Need help? Start with [QUICK_START.md](./QUICK_START.md)
