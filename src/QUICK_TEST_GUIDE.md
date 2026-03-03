# ⚡ Quick Test Guide - Service Management

## 🚀 **Test in 3 Minutes:**

### **Step 1: Login as Barber**
```
Phone: +998 90 123 45 67
Password: [your password]
```

### **Step 2: Add a Service**
1. Click **"Services"** tab
2. Click **"Add New Service"** button
3. Fill in:
   - **Name:** `Haircut`
   - **Duration:** `30` (minutes)
   - **Price:** `50000` (UZS)
   - **Description:** `Professional haircut` (optional)
4. Click **"Save"**

### **Step 3: Verify Success**
✅ You should see:
- **Toast notification:** "1 service(s) saved successfully"
- **Service card** appears in list
- **Browser console:** `✅ Successfully saved 1 services for barber {id}`

---

## 🔍 **If It Fails:**

### **Check Browser Console:**
1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for:
   - ❌ `Service save error:` → Shows the exact error
   - ❌ `Failed to insert services:` → Database error

### **Check Network Tab:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Find request to `/barbers/.../services`
4. Check **Response** tab → Should show error details

### **Common Fixes:**
- **"Unauthorized"** → Re-login
- **"Barber profile not found"** → Re-login to sync profile
- **"Invalid duration"** → Enter numbers only (e.g., `30` not `30min`)
- **"Invalid price"** → Enter numbers only (e.g., `50000` not `50,000`)

---

## ✅ **Expected Behavior:**

### **Adding Service:**
```
User clicks "Save"
  ↓
Frontend validates
  ↓
POST /barbers/{id}/services
  ↓
Backend validates & saves
  ↓
Success response
  ↓
Toast: "1 service(s) saved successfully"
  ↓
Service appears in list
```

### **Console Output (Success):**
```
📝 Updating profile... { services: [{ name: "Haircut", ... }] }
🔧 Saving services via API...
✅ Services saved successfully: { success: true, services: [...], message: "1 service(s) saved successfully" }
```

### **Console Output (Error):**
```
📝 Updating profile... { services: [...] }
🔧 Saving services via API...
❌ Service save error: { error: "Barber profile not found. Please re-login to sync your profile." }
```

---

## 🎯 **Quick Checklist:**

- [ ] Can add service ✅
- [ ] Service appears in list ✅
- [ ] Success toast shows ✅
- [ ] Page refresh keeps service ✅
- [ ] Can edit service ✅
- [ ] Can delete service ✅
- [ ] Errors show helpful messages ✅

---

**Need help?** Check `/SERVICE_MANAGEMENT_FIX.md` for detailed documentation.
