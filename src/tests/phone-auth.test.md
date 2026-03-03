# 📱 Phone-Only Authentication Tests

## ✅ Test Cases

### 1. **Signup Flow** - No Emails Shown
- [ ] Enter phone number: `+998 90 123 45 67`
- [ ] Enter password
- [ ] Click "Sign Up"
- [ ] ✅ **PASS**: No email addresses shown anywhere
- [ ] ✅ **PASS**: Only phone number displayed
- [ ] ✅ **PASS**: Error messages reference "phone number" not "email"

### 2. **Login Flow** - Phone Only
- [ ] Enter phone number: `+998 90 123 45 67`
- [ ] Enter password
- [ ] Click "Login"
- [ ] ✅ **PASS**: No email addresses shown
- [ ] ✅ **PASS**: Login successful with phone number
- [ ] ✅ **PASS**: Welcome message shows phone number

### 3. **Forgot Password (OTP)** - SMS Only
- [ ] Click "Forgot Password"
- [ ] Enter phone number: `+998 90 123 45 67`
- [ ] Click "Send Code"
- [ ] ✅ **PASS**: SMS sent to phone number
- [ ] ✅ **PASS**: Enter 6-digit code
- [ ] ✅ **PASS**: Reset password successfully
- [ ] ✅ **PASS**: No email references anywhere

### 4. **Profile Display** - Phone Display Format
- [ ] Login successfully
- [ ] View profile
- [ ] ✅ **PASS**: Phone shown as: `+998 90 123 45 67`
- [ ] ✅ **PASS**: No masked email (`xxx@trimly.app`)
- [ ] ✅ **PASS**: `phone_display` used in UI

### 5. **Error Messages** - Phone Context Only
- [ ] Try login with wrong password
- [ ] ✅ **PASS**: Error says "Invalid phone number or password"
- [ ] ✅ **PASS**: No "email" mentioned in error
- [ ] Try signup with existing phone
- [ ] ✅ **PASS**: Error says "Phone number already registered"
- [ ] ✅ **PASS**: No email references

---

## 🔍 Manual Testing Checklist

### **Never Show:**
- ❌ Masked emails (`998901234567@trimly.app`)
- ❌ Error messages mentioning "email"
- ❌ "Email provider disabled" errors
- ❌ Any `@trimly.app` references in UI

### **Always Show:**
- ✅ Phone numbers in format: `+998 XX XXX XX XX`
- ✅ Error messages: "Invalid **phone number**"
- ✅ Success messages: "Welcome, **+998 90 123 45 67**"
- ✅ Profile: **Phone** field (not email)

---

## 🚀 Expected Behavior

### **Signup:**
```
Input: +998 90 123 45 67
Password: ********
Result: ✅ Account created for +998 90 123 45 67
```

### **Login:**
```
Input: +998 90 123 45 67
Password: ********
Result: ✅ Logged in as +998 90 123 45 67
```

### **Forgot Password:**
```
Input: +998 90 123 45 67
Result: ✅ SMS sent to +998 90 123 45 67
Enter Code: 123456
Result: ✅ Password reset for +998 90 123 45 67
```

---

## 📊 Database Validation

### **KV Store Keys:**
- `auth:user:+998901234567` → User credentials
- `user:profile:{userId}` → User profile (contains `phone` field)
- `session:{token}` → Session tokens

### **Profile Structure:**
```json
{
  "id": "uuid",
  "phone": "+998901234567",
  "phone_display": "+998 90 123 45 67",
  "fullName": "John Doe",
  "role": "customer",
  "email": undefined  // NEVER set
}
```

---

## ✅ **PASS Criteria:**
1. **No masked emails** anywhere in the UI
2. **Phone numbers** displayed in formatted style
3. **Error messages** reference "phone number"
4. **OTP flow** works via SMS
5. **GET /api/auth/me** returns `phone_display`

---

## 🧪 Test Phone Numbers

Use these for testing:
- `+998 90 123 45 67`
- `+998 91 234 56 78`
- `+998 93 345 67 89`

---

**Last Updated:** December 6, 2025
**Status:** ✅ Ready for Testing
