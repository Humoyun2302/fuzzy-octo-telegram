# 🚀 Deployment Guide - Manual Booking Feature

Step-by-step guide to deploy the unified booking workflow to production.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All code changes are committed to version control
- [ ] Code review completed and approved
- [ ] Local testing completed successfully
- [ ] Database migration script ready
- [ ] Backup of production database created
- [ ] Rollback plan prepared
- [ ] Supabase project credentials available
- [ ] Deployment window scheduled (low traffic time recommended)

---

## 🗄️ Step 1: Database Migration

### 1.1 Create Database Backup

```bash
# Using Supabase CLI
supabase db dump --db-url "<your-production-db-url>" > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using pg_dump directly
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 1.2 Run Migration Script

**Connect to Supabase Dashboard:**
1. Navigate to https://supabase.com/dashboard
2. Select your Trimly project
3. Go to SQL Editor
4. Copy contents of `/database-migration.sql`
5. Paste into SQL Editor
6. Click "Run"

**Or using Supabase CLI:**

```bash
# Navigate to project directory
cd /path/to/trimly

# Run migration
supabase db push

# Or apply specific migration
psql "<your-production-db-url>" -f database-migration.sql
```

### 1.3 Verify Migration

```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('manual_customer_name', 'manual_customer_phone', 'source');

-- Expected output:
-- manual_customer_name | text | YES
-- manual_customer_phone | text | YES
-- source | text | YES

-- Check customer_id is nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name = 'customer_id';

-- Expected output:
-- customer_id | YES
```

### 1.4 Test Migration with Sample Data

```sql
-- Insert test manual booking
INSERT INTO bookings (
  booking_code, barber_id, customer_id, service_type,
  date, start_time, end_time, duration, price, status,
  source, manual_customer_name, manual_customer_phone
) VALUES (
  'TEST-DEPLOY-001',
  (SELECT id FROM barbers LIMIT 1),
  NULL,
  'Test Service',
  CURRENT_DATE + INTERVAL '1 day',
  '14:00:00',
  '14:45:00',
  45,
  50000,
  'booked',
  'manual',
  'Test Customer',
  '+998 90 123 45 67'
);

-- Verify insertion succeeded
SELECT * FROM bookings WHERE booking_code = 'TEST-DEPLOY-001';

-- Clean up test data
DELETE FROM bookings WHERE booking_code = 'TEST-DEPLOY-001';
```

---

## 🔒 Step 2: Update RLS Policies

### 2.1 Review Current Policies

```sql
-- List all policies on bookings table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'bookings';
```

### 2.2 Update or Create Barber Insert Policy

```sql
-- Drop old policy if it restricts barbers
DROP POLICY IF EXISTS "Users can insert their own bookings" ON bookings;

-- Create new policy allowing both customers and barbers
CREATE POLICY "Authenticated users can create bookings"
ON bookings
FOR INSERT
TO authenticated
WITH CHECK (
  -- Customers can insert for themselves
  (auth.uid() = customer_id)
  OR
  -- Barbers can insert with any customer_id (including NULL for manual bookings)
  (auth.uid() IN (SELECT id FROM barbers WHERE id = auth.uid()))
);
```

### 2.3 Verify RLS Policies

```sql
-- Test as barber
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "<barber_uuid>", "role": "barber"}';

-- This should succeed
INSERT INTO bookings (
  booking_code, barber_id, customer_id, service_type,
  date, start_time, end_time, duration, price, status, source
) VALUES (
  'RLS-TEST-001', '<barber_uuid>', NULL, 'Test',
  CURRENT_DATE, '10:00', '10:45', 45, 50000, 'booked', 'manual'
);

-- Clean up
DELETE FROM bookings WHERE booking_code = 'RLS-TEST-001';
```

---

## 🔄 Step 3: Deploy Backend Code

### 3.1 Deploy Supabase Edge Functions

```bash
# Navigate to project directory
cd /path/to/trimly

# Deploy edge functions
supabase functions deploy make-server-166b98fa

# Or deploy all functions
supabase functions deploy
```

### 3.2 Verify Deployment

```bash
# Test edge function endpoint
curl -X POST \
  https://<project-id>.supabase.co/functions/v1/make-server-166b98fa/bookings \
  -H "Authorization: Bearer <anon-key>" \
  -H "X-Session-Token: <test-session-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_code": "TEST-API-001",
    "barber_id": "<barber_uuid>",
    "slot_id": "<slot_uuid>",
    "service_type": "Test Service",
    "date": "2024-12-20",
    "start_time": "14:00",
    "end_time": "14:45",
    "duration": 45,
    "price": 50000,
    "source": "manual",
    "manual_customer_name": "API Test",
    "manual_customer_phone": "+998 90 111 11 11"
  }'

# Should return 200 with booking data
```

### 3.3 Monitor Edge Function Logs

```bash
# Stream logs in real-time
supabase functions logs make-server-166b98fa --follow

# Check for errors
supabase functions logs make-server-166b98fa --filter error
```

---

## 🎨 Step 4: Deploy Frontend Code

### 4.1 Build Production Bundle

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Verify build succeeded
ls -lh dist/
```

### 4.2 Deploy to Hosting Platform

**For Vercel:**
```bash
vercel --prod
```

**For Netlify:**
```bash
netlify deploy --prod
```

**For Custom Server:**
```bash
# Upload dist/ folder to server
scp -r dist/ user@server:/var/www/trimly/

# Restart web server
ssh user@server 'sudo systemctl restart nginx'
```

### 4.3 Verify Frontend Deployment

1. Open production URL in browser
2. Check browser console for errors
3. Verify all assets loaded correctly
4. Check network tab - all API calls successful

---

## ✅ Step 5: Post-Deployment Verification

### 5.1 Smoke Tests

**Test Customer Booking:**
1. Log in as test customer
2. Create a booking for tomorrow
3. Verify booking appears in "My Bookings"
4. Check database - booking has `source: 'online'`

**Test Manual Booking:**
1. Log in as test barber
2. Click "+ Manual Booking"
3. Create a manual booking
4. Verify booking appears with "Manual" badge
5. Check database - booking has `source: 'manual'`, `customer_id: NULL`

### 5.2 Database Verification

```sql
-- Check recent bookings
SELECT 
  id, 
  booking_code, 
  source, 
  customer_id IS NULL as is_manual,
  manual_customer_name,
  manual_customer_phone,
  created_at
FROM bookings 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Verify slot updates are working
SELECT 
  bs.id,
  bs.start_time,
  bs.status,
  b.booking_code,
  b.source
FROM barber_slots bs
LEFT JOIN bookings b ON b.slot_id = bs.id
WHERE bs.slot_date = CURRENT_DATE
AND bs.status = 'booked'
ORDER BY bs.start_time;
```

### 5.3 Monitor Application Logs

```bash
# Monitor edge function logs
supabase functions logs make-server-166b98fa --follow

# Look for these log patterns:
# [BOOKINGS] Manual booking by barber
# [BOOKINGS] Online booking by customer
# ✅ Slot marked as booked
```

### 5.4 User Acceptance Testing

- [ ] Test customer creates booking successfully
- [ ] Test barber creates manual booking successfully
- [ ] Slot shifting works correctly for both
- [ ] Manual badge displays correctly
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## 🔄 Step 6: Gradual Rollout (Recommended)

### 6.1 Feature Flag Setup (Optional)

If using feature flags:

```typescript
// In App.tsx or feature config
const MANUAL_BOOKING_ENABLED = import.meta.env.VITE_MANUAL_BOOKING_ENABLED === 'true';

// In BarberDashboard.tsx
{MANUAL_BOOKING_ENABLED && (
  <Button onClick={() => setShowManualBookingForm(true)}>
    + Manual Booking
  </Button>
)}
```

### 6.2 Rollout Plan

**Phase 1: Internal Testing (Day 1)**
- Enable for internal test accounts only
- Monitor closely for issues

**Phase 2: Beta Users (Day 2-3)**
- Enable for 10% of barbers
- Collect feedback
- Fix any issues

**Phase 3: Full Rollout (Day 4+)**
- Enable for all users
- Continue monitoring

---

## 🚨 Step 7: Monitoring & Alerts

### 7.1 Set Up Monitoring

**Supabase Dashboard:**
- Monitor database performance
- Check API request rates
- Watch for error spikes

**Application Monitoring:**
- Set up error tracking (e.g., Sentry)
- Monitor booking creation rates
- Track manual vs online booking ratio

### 7.2 Key Metrics to Watch

```sql
-- Booking success rate
SELECT 
  COUNT(*) FILTER (WHERE status = 'booked') * 100.0 / COUNT(*) as success_rate
FROM bookings
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Manual vs Online bookings
SELECT 
  source,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM bookings
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source;

-- Slot update failures (should be 0)
SELECT COUNT(*) 
FROM bookings b
LEFT JOIN barber_slots s ON s.id = b.slot_id
WHERE b.status = 'booked'
AND s.status != 'booked'
AND b.created_at > NOW() - INTERVAL '24 hours';
```

### 7.3 Alert Thresholds

Set up alerts for:
- [ ] Booking creation failure rate > 5%
- [ ] API response time > 3 seconds
- [ ] Database connection errors
- [ ] Edge function errors
- [ ] Slot status mismatch detected

---

## 🔙 Step 8: Rollback Plan

If critical issues are found:

### 8.1 Quick Rollback (Frontend Only)

```bash
# Revert to previous deployment
vercel rollback

# Or for Netlify
netlify rollback
```

### 8.2 Full Rollback (Backend + Database)

```bash
# Restore database backup
psql "<your-production-db-url>" -f backup_YYYYMMDD_HHMMSS.sql

# Revert edge functions
git checkout <previous-commit>
supabase functions deploy

# Revert frontend
git checkout <previous-commit>
npm run build
vercel --prod
```

### 8.3 Partial Rollback (Disable Feature)

```sql
-- Temporarily prevent manual bookings via policy
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON bookings;

CREATE POLICY "Only customers can create bookings"
ON bookings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id);
```

---

## 📊 Step 9: Success Criteria

Deployment is successful when:

- [x] Database migration completed without errors
- [x] RLS policies updated correctly
- [x] Edge functions deployed successfully
- [x] Frontend deployed successfully
- [x] Customer booking still works
- [x] Manual booking works
- [x] Slot shifting is correct
- [x] UI displays correctly
- [x] No increase in error rates
- [x] Performance is acceptable
- [x] No database integrity issues
- [x] Monitoring is in place
- [x] Team is trained on new feature

---

## 📚 Step 10: Documentation & Training

### 10.1 Update Documentation

- [ ] Update API documentation with manual booking fields
- [ ] Update barber onboarding guide
- [ ] Create video tutorial for manual booking feature
- [ ] Update FAQ with manual booking questions

### 10.2 Team Training

**For Customer Support:**
- How to explain manual bookings to barbers
- How to troubleshoot booking issues
- Difference between online and manual bookings

**For Barbers:**
- When to use manual booking
- How to use manual booking form
- How to identify manual vs online bookings

### 10.3 Communication

**To Barbers:**
```
Subject: New Feature: Manual Booking for Walk-in Customers 🎉

Hi [Barber Name],

We've added a new feature to help you manage walk-in customers!

What's New:
- "+" button in your dashboard to book walk-ins
- Enter customer name and phone
- Bookings marked with "Manual" badge
- Same easy booking process you know

How to Use:
1. Click "+ Manual Booking"
2. Enter customer details
3. Select service and time
4. Done! Booking appears in your schedule

Benefits:
- Keep track of all appointments in one place
- No separate notebook needed
- See your full schedule at a glance

Need Help? Contact support@trimly.com

Happy booking! 💈
The Trimly Team
```

---

## 🎯 Deployment Timeline

### Recommended Schedule

**Day 1 - Preparation:**
- 09:00 - Final code review
- 10:00 - Create database backup
- 11:00 - Test in staging environment
- 14:00 - Get stakeholder approval

**Day 2 - Deployment:**
- 09:00 - Run database migration
- 09:30 - Deploy edge functions
- 10:00 - Deploy frontend
- 10:30 - Run smoke tests
- 11:00 - Enable for beta users
- Throughout day - Monitor closely

**Day 3 - Monitoring:**
- All day - Watch metrics and logs
- Collect user feedback
- Fix minor issues if any

**Day 4 - Full Rollout:**
- 09:00 - Enable for all users
- Send announcement to all barbers
- Continue monitoring

---

## ✅ Post-Deployment Checklist

After 24 hours:

- [ ] No critical bugs reported
- [ ] Booking success rate > 95%
- [ ] Manual bookings being used by barbers
- [ ] Customer bookings still working perfectly
- [ ] Database performance is normal
- [ ] No slot integrity issues
- [ ] Positive user feedback
- [ ] All monitoring alerts working
- [ ] Team trained and confident
- [ ] Documentation updated

---

## 🎉 Deployment Complete!

Congratulations! The unified booking workflow is now live in production.

**Next Steps:**
1. Continue monitoring for 1 week
2. Collect user feedback
3. Iterate on improvements
4. Plan next features

---

## 📞 Support Contacts

**Technical Issues:**
- Backend: [backend-team@trimly.com]
- Frontend: [frontend-team@trimly.com]
- Database: [dba@trimly.com]

**Business Issues:**
- Product Owner: [product@trimly.com]
- Customer Support: [support@trimly.com]

**Emergency:**
- On-call Engineer: [oncall@trimly.com]
- Escalation: [escalation@trimly.com]

---

## End of Deployment Guide
