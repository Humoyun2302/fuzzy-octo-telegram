# Supabase Authentication Setup Guide for Trimly

## Current Issue
The error "Email logins are disabled" occurs because Trimly uses a masked email approach for phone-based authentication, but email auth is disabled in your Supabase project.

## Solution: Enable Email Authentication

### Step 1: Enable Email Provider in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (lmsqlrcggjmvgnqyhsjl)
3. Navigate to **Authentication** → **Providers**
4. Find **Email** in the list of providers
5. Toggle it to **Enabled**
6. **Important Settings:**
   - ✅ Enable Email provider
   - ✅ **Confirm email:** Set to **DISABLED** (very important!)
     - Since we're using masked emails (`998901234567@trimly.user`), we cannot verify real emails
     - This allows users to sign up without email verification
   - ✅ **Secure email change:** Optional (can be disabled for simplicity)

### Step 2: Verify Settings

After enabling, your Email provider settings should look like:
```
Email Provider: Enabled ✓
Confirm email: Disabled ✓
Secure email change: Disabled (optional) ✓
```

### Step 3: Test the Authentication

1. Try to sign up a new user with phone + password
2. Try to login with the same phone + password
3. Test the forgot password flow

---

## Alternative: Phone Authentication (Not Recommended for Your Use Case)

If you prefer to use Supabase's native phone authentication instead of the masked email approach, you would need to:

1. Enable Phone provider in Supabase Dashboard
2. Configure an SMS provider (Twilio, MessageBird, etc.)
3. Rewrite authentication logic to use phone numbers directly

However, this approach has limitations:
- ❌ Supabase phone auth typically uses OTP only (no passwords)
- ❌ Requires more complex setup with SMS providers
- ❌ Your custom Uzbek SMS providers (Eskiz, Playmobile, SMS.uz) won't work directly with Supabase's phone auth

**Recommendation:** Stick with the masked email approach and enable email authentication as described above.

---

## How the Current System Works

### Sign Up Flow:
1. User enters: `+998 90 123 45 67` and password `mypassword123`
2. System creates masked email: `998901234567@trimly.user`
3. Supabase auth.signUp() is called with:
   ```javascript
   {
     email: "998901234567@trimly.user",
     password: "mypassword123"
   }
   ```
4. User profile is created in `users` table with real phone number

### Login Flow:
1. User enters: `+998 90 123 45 67` and password `mypassword123`
2. System converts to masked email: `998901234567@trimly.user`
3. Supabase auth.signInWithPassword() is called with masked email + password
4. User is authenticated and session is created

### Forgot Password Flow:
1. User enters phone number
2. System sends OTP via Supabase to the phone number
3. User verifies OTP and sets new password
4. System updates password in Supabase

---

## Troubleshooting

### Error: "Email logins are disabled"
**Fix:** Enable Email provider in Supabase Dashboard (see Step 1 above)

### Error: "Email confirmation required"
**Fix:** Disable "Confirm email" in Email provider settings

### Error: "Invalid email format"
**Fix:** The masked email format is valid. Check that email provider is enabled.

### Users can't login after signup
**Fix:** Ensure "Confirm email" is DISABLED, otherwise users need email verification

---

## Security Notes

- Masked emails are only used internally for Supabase auth
- Real phone numbers are stored in the `users` table
- Passwords are securely hashed by Supabase
- The masked email pattern `[phone]@trimly.user` ensures uniqueness
- Users never see or interact with the masked email

---

## Quick Checklist

- [ ] Email provider enabled in Supabase Dashboard
- [ ] "Confirm email" setting is DISABLED
- [ ] Tested signup with phone + password
- [ ] Tested login with phone + password
- [ ] Tested forgot password flow

Once these steps are complete, authentication will work correctly!
