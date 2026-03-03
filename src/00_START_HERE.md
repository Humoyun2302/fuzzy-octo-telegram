# 🚀 Trimly Backend Setup - START HERE

Welcome! This is your complete guide to setting up the Trimly barber booking platform backend.

## ⚡ Quick Overview

Trimly uses:
- **Supabase** for database, authentication, and API
- **Custom KV auth** with session tokens stored in localStorage
- **Phone-number only** authentication (no email required)
- **Server endpoints** to bypass RLS (Row Level Security) restrictions

---

## 📋 Setup Checklist (5 Minutes)

Follow these steps **in order**:

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji
2. Click **SQL Editor** in left sidebar
3. Click **+ New query**

### Step 2: Run Database Migrations
Copy and paste each SQL file **in this exact order**:

```
1️⃣ /supabase/migrations/01_create_tables.sql
2️⃣ /supabase/migrations/02_auth_functions.sql  
3️⃣ /supabase/migrations/03_create_view.sql
4️⃣ /supabase/migrations/04_insert_sample_data.sql (optional - for testing)
```

**How to run:**
- Copy entire file content
- Paste into SQL Editor
- Click **Run** button (or press Ctrl/Cmd + Enter)
- Wait for "Success" message
- Move to next file

### Step 3: Verify Tables Created
In Supabase Dashboard:
1. Click **Table Editor** in left sidebar
2. You should see these tables:
   - ✅ `customers`
   - ✅ `barbers`
   - ✅ `services`
   - ✅ `barber_slots`
   - ✅ `bookings`
   - ✅ `favorites`
   - ✅ `sessions`
   - ✅ `kv_store_166b98fa` (pre-existing)

### Step 4: Deploy Server Function
The server is already in `/supabase/functions/server/index.tsx`

**No deployment needed** - Figma Make handles this automatically!

### Step 5: Test Your App
1. Open your Trimly app
2. Try signing up as a customer or barber
3. Check if you can see barbers list
4. Try creating a booking

---

## 🆘 Troubleshooting

### "Failed to fetch" error
- Check your Supabase project is **not paused**
- Verify tables exist in Table Editor
- Check SQL migrations ran without errors

### "Authentication failed" error
- Make sure `02_auth_functions.sql` ran successfully
- Check `pgcrypto` extension is enabled

### "Permission denied" error
- Server endpoints should bypass RLS
- Check `/supabase/functions/server/index.tsx` is deployed

---

## 📚 Next Steps

- Read `/BACKEND_API_ENDPOINTS.md` for API documentation
- Read `/DATABASE_SCHEMA.md` for table structure
- Read `/ARCHITECTURE.md` for system design

---

## 🎯 That's It!

You should now have a fully functioning backend. The app will:
- ✅ Store users in database
- ✅ Hash passwords securely
- ✅ Manage bookings and slots
- ✅ Handle real-time availability

**Need help?** Check the other documentation files in this directory.
