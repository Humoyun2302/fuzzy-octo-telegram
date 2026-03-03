# 🚀 Infobip Setup Guide for Trimly

## Why Infobip?

✅ **Enterprise-grade reliability** - 99.9% uptime SLA  
✅ **Global coverage** - Supports 190+ countries including Uzbekistan  
✅ **Advanced features** - Delivery reports, analytics, fallback options  
✅ **Scalable** - From 100 to millions of SMS per month  
✅ **Simple REST API** - Easy integration (already implemented!)

---

## 📋 Step-by-Step Setup

### 1. Create Infobip Account

1. Go to: **https://www.infobip.com/**
2. Click **"Sign Up Free"** or **"Start Free Trial"**
3. Fill in your details:
   - Email address
   - Company name: "Trimly"
   - Country: Uzbekistan (or your location)
4. Verify your email address
5. Complete account setup

### 2. Get Your API Key

1. Log in to your Infobip dashboard
2. Navigate to: **Developer Tools** → **API Keys**
3. Click **"Create API Key"**
4. Give it a name: "Trimly Production"
5. Select permissions: **SMS** (read and write)
6. Copy your API key and save it securely

**Important**: Your API key will look like this:
```
abc123def456ghi789jkl012mno345pqr678stu901vwx234
```

### 3. Note Your Base URL

Your base URL depends on your account region. Common options:

- **Europe (default)**: `https://api.infobip.com`
- **US**: `https://api-us.infobip.com`
- **Other regions**: Check your dashboard

Most accounts use: `https://api.infobip.com`

### 4. Add Credits to Your Account

1. In Infobip dashboard, go to **Billing** → **Add Credits**
2. Choose an amount (start with $10-20 for testing)
3. Complete payment
4. SMS costs vary by country (~$0.02-0.05 per SMS to Uzbekistan)

---

## 🔧 Configure Supabase

### Add Environment Variables

1. Go to your **Supabase Dashboard**
2. Select your project
3. Navigate to: **Project Settings** → **Edge Functions** → **Secrets**
4. Add the following secrets:

#### Required Secrets:

| Secret Name | Value | Example |
|------------|-------|---------|
| `SMS_PROVIDER` | `infobip` | `infobip` |
| `INFOBIP_API_KEY` | Your Infobip API key | `abc123def456...` |

#### Optional Secrets:

| Secret Name | Value | Default | Description |
|------------|-------|---------|-------------|
| `INFOBIP_BASE_URL` | Your base URL | `https://api.infobip.com` | Leave blank to use default |
| `INFOBIP_SENDER` | Sender name | `Trimly` | The name shown to recipients |

### 5. Restart Edge Functions

After adding secrets:
1. Go to **Edge Functions** in Supabase
2. Find your function
3. Click **Deploy** or **Redeploy**

---

## ✅ Test Your Integration

### Using the Demo Mode First

Before testing with real SMS:

1. Keep `SMS_PROVIDER` set to `demo`
2. Test your app's OTP flow
3. Check server logs to see OTP codes
4. Or use the universal code: `123456`

### Switch to Infobip

1. Set `SMS_PROVIDER=infobip` in Supabase secrets
2. Add your `INFOBIP_API_KEY`
3. Restart edge functions
4. Test with a real phone number

### Expected Console Output

When SMS is sent successfully, you'll see:
```
✅ Infobip SMS sent successfully: { messageId: "...", status: {...} }
```

If there's an error:
```
❌ Infobip SMS send failed: [error details]
```

---

## 📊 Monitoring & Analytics

### Infobip Dashboard

Monitor your SMS delivery in real-time:
1. Go to **Analytics** in Infobip dashboard
2. View delivery rates, costs, and performance
3. Set up alerts for delivery issues

### Trimly Server Logs

Check your Supabase edge function logs for:
- `otp_sent` - Successfully sent
- `otp_verified` - Successfully verified
- `otp_failed` - Failed attempts
- `otp_lockout` - Rate limit triggered

---

## 💰 Pricing & Cost Management

### Typical SMS Costs

- **Uzbekistan**: ~$0.02 - 0.04 per SMS
- **Other countries**: Varies by destination

### Cost Calculation Example

For 1,000 users per month:
- Average 2 OTP requests per user = 2,000 SMS
- Cost: 2,000 × $0.03 = **$60/month**

### Cost Optimization Tips

1. **Use rate limiting** (already implemented) - 3 SMS/hour max
2. **Set SMS expiry** (already set to 10 minutes)
3. **Enable resend cooldown** (already set to 60 seconds)
4. **Monitor suspicious activity** in logs

---

## 🛠️ Troubleshooting

### "Infobip API key not configured"

**Solution**: Add `INFOBIP_API_KEY` to Supabase secrets

### "Infobip SMS send failed: 401 Unauthorized"

**Solution**: 
- Verify API key is correct
- Check API key has SMS permissions
- Regenerate API key if needed

### "Infobip SMS send failed: 403 Forbidden"

**Solution**: 
- Account may need verification
- Check account status in Infobip dashboard
- Ensure account has sufficient credits

### "Phone number invalid"

**Solution**: 
- Use international format: `+998901234567`
- Country code is required

### SMS not received

**Check**:
1. Phone number is correct
2. Account has credits
3. Check delivery report in Infobip dashboard
4. Some countries require sender registration

---

## 🔒 Security Best Practices

✅ **Never commit API keys** to your code repository  
✅ **Use Supabase secrets** for all credentials  
✅ **Rotate API keys** regularly (every 3-6 months)  
✅ **Monitor usage** for unusual activity  
✅ **Enable IP whitelisting** in Infobip (optional)  
✅ **Set spending limits** in billing settings  

---

## 📞 Support

### Infobip Support
- Email: support@infobip.com
- Chat: Available in dashboard
- Docs: https://www.infobip.com/docs

### Trimly Issues
- Check server logs in Supabase Edge Functions
- Review console output for error messages
- Verify environment variables are set correctly

---

## 🎯 Quick Reference

### Environment Variables Summary

```bash
# Required
SMS_PROVIDER=infobip
INFOBIP_API_KEY=your_api_key_here

# Optional (use defaults if not set)
INFOBIP_BASE_URL=https://api.infobip.com  # Optional
INFOBIP_SENDER=Trimly                     # Optional
```

### Phone Format

```
✅ +998901234567
✅ 998901234567
❌ 901234567 (missing country code)
```

### Testing Checklist

- [ ] Created Infobip account
- [ ] Generated API key
- [ ] Added credits to account
- [ ] Set `SMS_PROVIDER=infobip` in Supabase
- [ ] Set `INFOBIP_API_KEY` in Supabase
- [ ] Restarted edge functions
- [ ] Tested with real phone number
- [ ] Received SMS successfully
- [ ] Checked Infobip delivery report

---

**You're all set!** 🎉

Your Trimly app will now send real SMS via Infobip's enterprise infrastructure.
