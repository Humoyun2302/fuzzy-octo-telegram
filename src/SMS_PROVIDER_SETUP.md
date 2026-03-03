# SMS Provider Setup Guide for Trimly

Your OTP authentication system now supports **4 SMS providers** including the global enterprise provider Infobip. The system currently runs in **demo mode** and can be activated with real credentials when ready.

## 🎯 Supported Providers

### 1. **Infobip** (Recommended - Global Enterprise Provider)
- **Website**: https://www.infobip.com/
- **Pricing**: Pay-as-you-go, volume discounts available
- **Features**: REST API, global reach, 99.9% uptime, advanced analytics
- **Best for**: Production apps, global reach, enterprise reliability
- **Coverage**: Worldwide including Uzbekistan

### 2. **Eskiz.uz** (Recommended - Most Popular in Uzbekistan)
- **Website**: https://eskiz.uz/
- **Pricing**: ~50 UZS per SMS
- **Features**: REST API, high delivery rate, good dashboard
- **Best for**: Most businesses in Uzbekistan

### 3. **Playmobile** 
- **Website**: https://playmobile.uz/
- **Pricing**: Competitive rates
- **Features**: JSON API, reliable service
- **Best for**: Medium to large businesses

### 4. **SMS.uz**
- **Website**: https://sms.uz/
- **Pricing**: Variable pricing
- **Features**: XML API
- **Best for**: Enterprise solutions

---

## 🚀 Quick Start - Activate SMS Provider

### Step 1: Choose Your Provider
Select one of the providers above and register for an account.

### Step 2: Get API Credentials

#### For Infobip:
1. Register at https://www.infobip.com/
2. Verify your account
3. Note your **API Key**

#### For Eskiz.uz:
1. Register at https://eskiz.uz/
2. Verify your account
3. Note your **email** and **password**

#### For Playmobile:
1. Register at https://playmobile.uz/
2. Get your **login** and **password** credentials
3. Configure sender name if needed

#### For SMS.uz:
1. Register at https://sms.uz/
2. Get your **login** and **password** credentials
3. Configure sender name

### Step 3: Add Environment Variables

In your Supabase project, add the appropriate environment variables:

#### For Infobip:
```bash
SMS_PROVIDER=infobip
INFOBIP_API_KEY=your-api-key
```

#### For Eskiz.uz:
```bash
SMS_PROVIDER=eskiz
ESKIZ_EMAIL=your-email@example.com
ESKIZ_PASSWORD=your-password
```

#### For Playmobile:
```bash
SMS_PROVIDER=playmobile
PLAYMOBILE_LOGIN=your-login
PLAYMOBILE_PASSWORD=your-password
```

#### For SMS.uz:
```bash
SMS_PROVIDER=smsuz
SMSUZ_LOGIN=your-login
SMSUZ_PASSWORD=your-password
```

### Step 4: Add Secrets via Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add the environment variables based on your chosen provider
4. Restart your edge functions

---

## 📝 Phone Number Format

Make sure phone numbers are formatted correctly:
- ✅ **Uzbek format**: `998901234567` (country code + number)
- ✅ **With plus**: `+998901234567`
- ❌ **Without country code**: `901234567` (won't work)

The system will work with both formats with and without the `+` prefix.

---

## 🧪 Demo Mode (Current Setup)

The system is currently in **demo mode**:
- ✅ Accepts any phone number
- ✅ Generates real OTP codes
- ✅ Logs codes to server console
- ✅ Accepts universal code `123456` for testing
- ❌ Does NOT send actual SMS

**To test**:
1. Enter any phone number on login
2. Check server console logs for the OTP code
3. OR use code `123456` (always works)

---

## 🔐 Security Features (Already Implemented)

Your OTP system includes:
- ✅ **Rate Limiting**: Max 3 SMS per hour per phone
- ✅ **IP-based Limiting**: Prevents spam from same IP
- ✅ **Attempt Limiting**: Max 3 wrong attempts per OTP
- ✅ **Secure Hashing**: OTPs stored as SHA-256 hashes
- ✅ **Auto Expiry**: OTPs expire after 10 minutes
- ✅ **Resend Cooldown**: 60-second wait between resends
- ✅ **Analytics Logging**: All events logged for monitoring

---

## 💰 Cost Estimates

### Infobip Pricing Example:
- **1,000 SMS**: Pay-as-you-go, volume discounts available
- **10,000 SMS**: Pay-as-you-go, volume discounts available
- **100,000 SMS**: Pay-as-you-go, volume discounts available

*Prices are approximate and may vary. Check provider websites for current rates.*

### Eskiz.uz Pricing Example:
- **1,000 SMS**: ~50,000 UZS (~$4.50 USD)
- **10,000 SMS**: ~500,000 UZS (~$45 USD)
- **100,000 SMS**: ~5,000,000 UZS (~$450 USD)

*Prices are approximate and may vary. Check provider websites for current rates.*

---

## 🛠️ Troubleshooting

### SMS Not Sending?
1. Check environment variables are set correctly
2. Verify credentials with provider dashboard
3. Check server logs for error messages
4. Ensure phone number format is correct
5. Verify account has sufficient balance

### Still in Demo Mode?
1. Confirm `SMS_PROVIDER` environment variable is set
2. Make sure credentials are added as secrets
3. Restart edge functions after adding secrets
4. Check console logs for "Demo mode" messages

### Provider-Specific Issues:

**Infobip**:
- Token expires after some time - system handles re-authentication automatically
- Sender name `4546` is default, can be customized in code

**Eskiz.uz**:
- Token expires after some time - system handles re-authentication automatically
- Sender name `4546` is default, can be customized in code

**Playmobile**:
- Message ID must be unique - system uses timestamp
- Sender `3700` is default

**SMS.uz**:
- Uses XML format (already implemented)
- Sender name can be customized

---

## 📊 Monitoring

Check your server logs for these events:
- `otp_sent` - OTP was sent successfully
- `otp_verified` - OTP verified successfully  
- `otp_failed` - Verification failed
- `otp_lockout` - User hit rate limit

---

## 🎓 Next Steps

1. **Register** with your preferred SMS provider
2. **Get credentials** from provider dashboard
3. **Add secrets** to Supabase environment variables
4. **Test** with real phone number
5. **Monitor** costs and delivery rates
6. **Scale** as your user base grows

---

## 📞 Support

- **Infobip**: support@infobip.com
- **Eskiz.uz**: support@eskiz.uz
- **Playmobile**: Contact via website
- **SMS.uz**: Contact via website

For Trimly system issues, check server logs and Supabase edge function console.

---

## ✅ Checklist Before Going Live

- [ ] Registered with SMS provider
- [ ] Got API credentials
- [ ] Added environment variables to Supabase
- [ ] Tested with real phone number
- [ ] Verified SMS delivery
- [ ] Checked account balance/credits
- [ ] Set up billing alerts
- [ ] Removed demo mode bypass (optional)
- [ ] Configured monitoring/analytics

---

**Current Status**: 🟡 Demo Mode Active

Once you add credentials, the status will automatically change to: 🟢 Live SMS Active