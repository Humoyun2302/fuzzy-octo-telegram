# Deployment Checklist: Barber Visibility Fix

## 🚀 Pre-Deployment

### 1. Backup Everything
```bash
# Database backup
pg_dump -h <host> -U <user> -d <database> -F c -b -v -f backup_$(date +%Y%m%d_%H%M%S).dump

# Code backup
git add -A
git commit -m "Pre-deployment backup: barber visibility fix"
git tag backup-$(date +%Y%m%d_%H%M%S)
git push --tags
```

### 2. Review Changes
- [ ] Read `/BUG_FIX_BARBER_VISIBILITY.md`
- [ ] Review migration file
- [ ] Check all modified files
- [ ] Understand rollback plan

### 3. Test Locally
```bash
# Run migration locally
supabase db reset
supabase migration up

# Start services
npm run dev

# Run E2E tests
# Follow /tests/e2e/barber_visibility.test.md

# Check console for errors
# Verify barbers display
```

---

## 📝 Deployment Steps

### Step 1: Deploy Database Migration

**Staging First:**
```bash
# Connect to staging
supabase link --project-ref <staging-project-id>

# Apply migration
supabase db push

# Verify
supabase db remote commit list
```

**Verification:**
```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'barbers'
  AND column_name IN ('visible_to_public', 'is_active');

-- Check barbers migrated correctly
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE visible_to_public = true) as visible,
  COUNT(*) FILTER (WHERE is_active = true) as active
FROM barbers;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'barbers';
```

**Expected Results:**
```
visible_to_public | boolean | YES | false
is_active | boolean | YES | true

total | visible | active
  10  |    8    |   10
```

### Step 2: Deploy Backend

**Staging:**
```bash
# Deploy Edge Function
supabase functions deploy make-server-166b98fa --project-ref <staging-project-id>

# Check logs
supabase functions logs make-server-166b98fa --project-ref <staging-project-id>
```

**Test Endpoint:**
```bash
# Health check
curl https://<staging-project-id>.supabase.co/functions/v1/make-server-166b98fa/health

# Expected: {"status":"ok"}

# Barbers endpoint
curl https://<staging-project-id>.supabase.co/functions/v1/make-server-166b98fa/barbers

# Expected: {"success":true,"barbers":[...],"count":8}
```

### Step 3: Deploy Frontend

**Staging:**
```bash
# Build
npm run build

# Deploy to staging
# (depends on your hosting provider)
vercel --prod # or
netlify deploy --prod # or
# upload to your hosting

# Get staging URL
echo "Staging: https://staging.trimly.app"
```

### Step 4: Test on Staging

**Manual Tests:**
- [ ] Navigate to staging URL
- [ ] Open browser console
- [ ] Check barbers load
- [ ] Look for logs: "✅ Visible barbers after filter: X/Y"
- [ ] No errors in console
- [ ] Create test barber account
- [ ] Activate trial
- [ ] Verify appears in search
- [ ] Test booking flow

**API Tests:**
```bash
# Test all endpoints
curl https://<staging-project-id>.supabase.co/functions/v1/make-server-166b98fa/health
curl https://<staging-project-id>.supabase.co/functions/v1/make-server-166b98fa/barbers
```

**Database Tests:**
```sql
-- Run test script
-- /supabase/migrations/20241208_test_barber_visibility.sql
```

### Step 5: Production Deployment

**⚠️ ONLY if staging tests pass!**

**Production Database:**
```bash
# Connect to production
supabase link --project-ref <production-project-id>

# Show migration plan
supabase db diff

# Apply migration
supabase db push

# Verify immediately
```

**Verification:**
```sql
-- Same checks as staging
SELECT column_name FROM information_schema.columns WHERE table_name = 'barbers';
SELECT COUNT(*) FROM barbers WHERE visible_to_public = true;
SELECT * FROM pg_policies WHERE tablename = 'barbers';
```

**Production Backend:**
```bash
# Deploy
supabase functions deploy make-server-166b98fa --project-ref <production-project-id>

# Watch logs
supabase functions logs make-server-166b98fa --project-ref <production-project-id> --follow
```

**Production Frontend:**
```bash
# Build
npm run build

# Deploy
# (your production deployment command)

# Verify
curl https://trimly.app
```

---

## ✅ Post-Deployment Verification

### Immediate Checks (5 minutes)

**1. Health Check**
```bash
curl https://<production-project-id>.supabase.co/functions/v1/make-server-166b98fa/health
# Expected: {"status":"ok"}
```

**2. Barbers API**
```bash
curl https://<production-project-id>.supabase.co/functions/v1/make-server-166b98fa/barbers
# Expected: {"success":true,"barbers":[...],"count":N}
```

**3. Frontend**
- [ ] Open https://trimly.app
- [ ] Barbers display correctly
- [ ] No console errors
- [ ] Services show for each barber
- [ ] Booking flow works

**4. Database**
```sql
-- Check visibility
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE visible_to_public = true) as visible,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as active
FROM barbers;
```

### Monitor (30 minutes)

**Error Logs:**
```bash
# Watch backend logs
supabase functions logs make-server-166b98fa --follow

# Look for:
# - "📊 Fetching barbers from database..."
# - "✅ Fetched X barbers, Y visible"
# - No error messages
```

**Analytics:**
- [ ] Check error rate (should be 0%)
- [ ] Check API latency (should be < 500ms)
- [ ] Check user activity (normal patterns)

### Full Test (1 hour)

**E2E Test:**
- [ ] Run `/tests/e2e/barber_visibility.test.md`
- [ ] All test cases pass
- [ ] Performance acceptable

---

## 🔄 Rollback Plan

### If Issues Detected

**1. Immediate Rollback (Frontend)**
```bash
# Revert frontend deployment
# (depends on hosting provider)
vercel rollback
# or
netlify rollback
```

**2. Rollback Backend**
```bash
# Redeploy previous version
git checkout <previous-commit>
supabase functions deploy make-server-166b98fa
git checkout main
```

**3. Rollback Database**
```bash
# Restore from backup
pg_restore -h <host> -U <user> -d <database> -v backup_<timestamp>.dump

# Or drop new columns if safe:
ALTER TABLE barbers DROP COLUMN IF EXISTS visible_to_public;
ALTER TABLE barbers DROP COLUMN IF EXISTS is_active;

# Drop trigger
DROP TRIGGER IF EXISTS trigger_update_barber_visibility ON barbers;
DROP FUNCTION IF EXISTS update_barber_visibility();

# Drop policies
DROP POLICY IF EXISTS "Allow public read of visible barbers" ON barbers;
```

**4. Verify Rollback**
- [ ] Check frontend works
- [ ] Check API responds
- [ ] Check database queries work
- [ ] No new errors

---

## 📊 Success Metrics

### Technical Metrics
- [ ] **Error Rate:** 0%
- [ ] **API Response Time:** < 500ms
- [ ] **Page Load Time:** < 2s
- [ ] **Database Query Time:** < 50ms

### Business Metrics
- [ ] **Visible Barbers:** Expected count
- [ ] **Bookings Created:** No decrease
- [ ] **User Activity:** Normal patterns
- [ ] **Support Tickets:** No increase

### User Experience
- [ ] **Barber Cards Display:** Yes
- [ ] **Services Show:** Yes
- [ ] **Booking Flow Works:** Yes
- [ ] **No Console Errors:** Yes

---

## 📞 Emergency Contacts

### If Critical Issues

**Priority 1 (System Down):**
1. Rollback immediately (see above)
2. Notify team
3. Check error logs
4. Call: [Emergency Contact]

**Priority 2 (Degraded Service):**
1. Monitor logs
2. Check metrics
3. Prepare rollback
4. Notify team
5. Email: [Team Email]

**Priority 3 (Minor Issues):**
1. Document issue
2. Create bug ticket
3. Schedule fix
4. Slack: [Team Channel]

---

## ✅ Deployment Complete Checklist

- [ ] Database migration applied
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Health checks pass
- [ ] Barbers API works
- [ ] Frontend displays barbers
- [ ] No console errors
- [ ] Database queries work
- [ ] RLS policies enforced
- [ ] E2E tests pass
- [ ] Monitoring active
- [ ] Team notified
- [ ] Documentation updated

---

## 📝 Deployment Log

```
Date: _______________
Deployed by: _______________
Environment: _______________

Migration Applied: [ ] Yes [ ] No
Backend Deployed: [ ] Yes [ ] No
Frontend Deployed: [ ] Yes [ ] No

Issues Encountered: _______________
___________________________________
___________________________________

Rollback Required: [ ] Yes [ ] No

Sign-off: _______________
```

---

**Status:** Ready for deployment
**Risk Level:** Medium (database schema change)
**Estimated Downtime:** None (zero-downtime migration)
**Rollback Time:** < 5 minutes
