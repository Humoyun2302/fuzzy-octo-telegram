# 📊 Subscription Data Flow - Complete Guide

## 🗄️ Database Table: `barbers`

The subscription information is stored in the **`barbers`** table in your Supabase PostgreSQL database.

### Database Columns:

```sql
-- In the barbers table:
subscription_status        VARCHAR    -- Values: 'active', 'expired', 'free_trial', 'pending', NULL
subscription_expiry_date   TIMESTAMP  -- When the subscription expires
subscription_plan          VARCHAR    -- Values: '1-month', '6-months', '1-year', 'trial-3-months', 'free_trial', NULL
trial_used                 BOOLEAN    -- Whether the free trial has been used
```

---

## 🔄 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                            │
│                                                                 │
│  Table: barbers                                                 │
│  ├── subscription_status        ('active' | 'expired' | NULL)  │
│  ├── subscription_expiry_date   (timestamp)                    │
│  ├── subscription_plan          ('1-month' | '6-months' etc)  │
│  └── trial_used                 (boolean)                      │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ 1. SQL SELECT Query
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      App.tsx                                    │
│                                                                 │
│  Lines 125-194: fetchBarbers()                                 │
│                                                                 │
│  const { data: barbers } = await supabase                      │
│    .from('barbers')                                            │
│    .select('*, subscription_status, subscription_expiry_date') │
│                                                                 │
│  Maps to JavaScript object:                                    │
│  ├── subscriptionStatus: b.subscription_status                 │
│  ├── subscriptionExpiryDate: b.subscription_expiry_date        │
│  ├── currentPlan: b.subscription_plan                          │
│  ├── trialUsed: b.trial_used                                   │
│  └── isSubscriptionActive: (calculated from status & date)     │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ 2. Passes as props
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  BarberDashboard.tsx                            │
│                                                                 │
│  Lines 123-133: Receives barberProfile prop                    │
│                                                                 │
│  <SubscriptionManagement                                       │
│    currentPlan={barberProfile.currentPlan}                     │
│    subscriptionStatus={barberProfile.subscriptionStatus}       │
│    expiryDate={barberProfile.subscriptionExpiryDate}           │
│    isSubscriptionActive={barberProfile.isSubscriptionActive}   │
│  />                                                            │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ 3. Props passed to component
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              SubscriptionManagement.tsx                         │
│                                                                 │
│  Lines 42-49: Receives props                                   │
│                                                                 │
│  export function SubscriptionManagement({                      │
│    currentPlan,          // '1-month' | '6-months' | 'free_trial' │
│    subscriptionStatus,   // 'active' | 'expired' | 'pending'   │
│    expiryDate,          // '2025-01-15T10:00:00Z'             │
│    isSubscriptionActive // true | false                        │
│  })                                                            │
│                                                                 │
│  Lines 53-72: VALIDATION LOGIC                                 │
│  ────────────────────────────────────────────                  │
│  const isPlanActive =                                          │
│    isSubscriptionActive === true &&                            │
│    subscriptionStatus !== null &&                              │
│    expiryDate !== null                                         │
│                                                                 │
│  Lines 280-310: DISPLAY LOGIC                                  │
│  ────────────────────────────────────────────                  │
│  if (!isPlanActive) {                                          │
│    → Show RED warning box                                      │
│    → Show "Expired" badge                                      │
│    → Show "Renew" button                                       │
│  } else {                                                      │
│    → NO warning box                                            │
│    → NO expired badge                                          │
│    → Show current plan name                                    │
│  }                                                             │
│                                                                 │
│  Lines 75-95: PLAN NAME LOGIC                                  │
│  ────────────────────────────────────────────                  │
│  const getCurrentPlanDisplayName = () => {                     │
│    if (currentPlan includes 'trial' or 'free')                │
│      → return "Bepul sinov faol"                              │
│    else if (currentPlan === '1-month')                        │
│      → return "1 oy"                                           │
│    else if (currentPlan === '6-months')                       │
│      → return "6 oy"                                           │
│    else if (currentPlan === '1-year')                         │
│      → return "1 yil"                                          │
│  }                                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Example Data Scenarios

### Scenario 1: Active Subscription

**Database (`barbers` table):**
```sql
subscription_status: 'active'
subscription_expiry_date: '2025-06-15 23:59:59'
subscription_plan: '1-month'
trial_used: false
```

**What User Sees:**
- ✅ NO red badge
- ✅ NO warning box
- ✅ NO renew button
- ✅ Current Plan: "1 oy" (1 Month)

---

### Scenario 2: Expired Subscription

**Database (`barbers` table):**
```sql
subscription_status: 'expired'
subscription_expiry_date: '2024-12-20 23:59:59'
subscription_plan: NULL
trial_used: true
```

**What User Sees:**
- ❌ Red "× Muddati tugagan" badge
- ⚠️ Red warning box: "Obuna muddati tugagan"
- 🔄 Green "Obunani hozir yangilash" button
- 📋 Current Plan: "Yo'q" (None)

---

### Scenario 3: Active Free Trial

**Database (`barbers` table):**
```sql
subscription_status: 'free_trial'
subscription_expiry_date: '2025-03-15 23:59:59'
subscription_plan: 'trial-3-months'
trial_used: false
```

**What User Sees:**
- ✅ NO red badge
- ✅ NO warning box
- ✅ NO renew button
- ✅ Current Plan: "3-oy Bepul sinov faol" (3-month Free Trial Active)

---

### Scenario 4: NULL/Missing Data (Treated as Expired)

**Database (`barbers` table):**
```sql
subscription_status: NULL
subscription_expiry_date: NULL
subscription_plan: NULL
trial_used: NULL
```

**What User Sees:**
- ❌ Red "× Muddati tugagan" badge
- ⚠️ Red warning box: "Obuna muddati tugagan"
- 🔄 Green "Obunani hozir yangilash" button
- 📋 Current Plan: "Yo'q" (None)

---

## 🔍 How to Check Database Values

### Method 1: Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your Trimly project
3. Click **"Table Editor"** in sidebar
4. Select **"barbers"** table
5. Look at columns:
   - `subscription_status`
   - `subscription_expiry_date`
   - `subscription_plan`
   - `trial_used`

### Method 2: SQL Query

```sql
-- Check subscription for a specific barber
SELECT 
  id,
  full_name,
  phone,
  subscription_status,
  subscription_expiry_date,
  subscription_plan,
  trial_used,
  CASE 
    WHEN subscription_status = 'active' 
      AND subscription_expiry_date > NOW() 
    THEN true 
    ELSE false 
  END as is_active
FROM barbers
WHERE id = 'your-barber-id-here';
```

### Method 3: Browser Console Logs

The app logs subscription data to browser console:

```javascript
// Look for these console logs:
[BARBER DASHBOARD] 📋 Subscription props for SubscriptionManagement: {
  currentPlan: "1-month",
  subscriptionStatus: "active",
  expiryDate: "2025-06-15T23:59:59.000Z",
  isSubscriptionActive: true
}

[SUBSCRIPTION VALIDATION] 🔍 Validation result: {
  isSubscriptionActive: true,
  hasValidStatus: true,
  hasValidExpiryDate: true,
  isPlanActive: true
}
```

---

## 🎯 Validation Rules (Critical Logic)

The component uses **strict validation** to ensure data integrity:

```typescript
// Subscription is ONLY active if ALL three conditions are true:

1. isSubscriptionActive === true
   ↓
2. subscriptionStatus is NOT NULL/empty
   ↓
3. expiryDate is NOT NULL/empty
   ↓
= ACTIVE ✅

// If ANY condition is false → Subscription is EXPIRED ❌
```

---

## 🌍 Translation Keys Used

All text is translated into 3 languages using these keys:

```javascript
// From /contexts/LanguageContext.tsx

t('subscription.title')              // "Obuna" / "Подписка" / "Subscription"
t('subscription.expired')            // "Muddati tugagan" / "Истекла" / "Expired"
t('subscription.expiredWarning')     // "Obuna muddati tugagan"
t('subscription.renewNowMessage')    // "Yana ko'rinish uchun obunani yangilang"
t('subscription.renewNow')           // "Obunani hozir yangilash"
t('subscription.currentPlan')        // "Joriy reja"
t('subscription.none')               // "Yo'q"
t('subscription.freeTrialActive')    // "Bepul sinov faol"
t('subscription.oneMonth')           // "1 oy"
t('subscription.sixMonths')          // "6 oy"
t('subscription.oneYear')            // "1 yil"
```

---

## 📝 Summary

**Single Source of Truth:**
- ✅ Database: `barbers` table
- ✅ Columns: `subscription_status`, `subscription_expiry_date`, `subscription_plan`, `trial_used`

**Data Flow:**
1. Supabase Database → 2. App.tsx (fetch) → 3. BarberDashboard → 4. SubscriptionManagement

**Display Logic:**
- If `isSubscriptionActive === true` AND data valid → Show active state (no warnings)
- If `isSubscriptionActive === false` OR data NULL → Show expired state (red warnings)
- Trial plans detected by checking if `currentPlan` includes "trial" or "free"

**No Hardcoded Values:**
- Everything comes from database
- UI adapts automatically based on database state
- Fully translated into 3 languages
