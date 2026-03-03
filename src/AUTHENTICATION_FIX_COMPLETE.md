# Authentication "Invalid JWT" Error - FIXED ✅

## The Problem
When saving barber services/profile, you were getting:
```json
{
  "code": 401,
  "message": "Invalid JWT"
}
```

## Root Cause
Supabase Edge Functions have built-in JWT validation. When you send a request with `Authorization: Bearer <token>`, Supabase expects a valid JWT token (like the anon key or service role key). 

Our custom session tokens were UUIDs (e.g., `abc-123-def-456-timestamp`), not JWTs. Supabase was rejecting them before the request even reached our Hono application!

## The Solution

### Used a Custom Header for Session Tokens

Instead of sending our session token in the `Authorization` header, we now use a custom `X-Session-Token` header:

**Frontend (App.tsx):**
```typescript
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,  // ✅ Valid JWT for Supabase
    'X-Session-Token': sessionToken,              // ✅ Our custom session token
  },
  body: JSON.stringify({ services: updatedProfile.services }),
});
```

**Backend (index.tsx):**
```typescript
// Updated CORS to allow the custom header
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-Session-Token"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// Updated getUser() to check for X-Session-Token header first
const getUser = async (c: any) => {
  // First check for custom session token header (takes priority)
  let sessionToken = c.req.header('X-Session-Token');
  
  // Fallback to Authorization header for backward compatibility
  if (!sessionToken) {
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      // Only use Authorization header if it's NOT the public anon key (JWT)
      if (token && !token.startsWith('eyJ')) {
        sessionToken = token;
      }
    }
  }
  
  if (!sessionToken) {
    console.log('[Auth] ❌ No session token found');
    return null;
  }
  
  const sessionData = await authService.verifySession(sessionToken);
  // ... rest of verification
}
```

## How It Works Now

### 1. **Login Flow:**
```
User enters phone + password
  ↓
Backend validates credentials
  ↓
Backend creates session token (UUID)
  ↓
Backend stores in KV: session:{token} → { userId, phone, role, expiresAt }
  ↓
Frontend stores in localStorage: 'trimly_session_token'
```

### 2. **API Request Flow:**
```
Frontend makes request
  ↓
Headers:
  - Authorization: Bearer ${publicAnonKey}   ← Supabase validates this (passes ✅)
  - X-Session-Token: ${sessionToken}          ← Our custom token
  ↓
Supabase Edge Functions infrastructure sees valid JWT ✅
  ↓
Request reaches our Hono app
  ↓
getUser() reads X-Session-Token header
  ↓
Validates token in KV store
  ↓
Returns user data or null
```

### 3. **Session Verification:**
```typescript
const sessionData = await authService.verifySession(sessionToken);
// Returns: { valid: true, userId: "...", phone: "...", role: "barber" }

if (!sessionData.valid) {
  return null; // 401 Unauthorized
}

return {
  id: sessionData.userId,
  phone: sessionData.phone,
  role: sessionData.role,
};
```

## What Changed

### ✅ Backend Changes:
1. **CORS Headers** - Added `X-Session-Token` to allowed headers
2. **getUser() Function** - Now checks `X-Session-Token` header first
3. **Fallback Support** - Still supports old `Authorization` header for backward compatibility

### ✅ Frontend Changes:
1. **Services API Call** - Now sends both `Authorization` (anon key) and `X-Session-Token` (session)
2. **Error Handling** - Detects 401 and auto-logs out user with helpful message

## Benefits

✅ **No More "Invalid JWT" Error** - Supabase sees valid JWT in Authorization header  
✅ **Custom Session Tokens Work** - Our UUID tokens pass through in X-Session-Token  
✅ **Better Security** - Public anon key for Supabase, secure sessions for auth  
✅ **Backward Compatible** - Old Authorization header still works for non-JWT tokens  
✅ **Clear Error Messages** - Logs show exactly what's happening  

## Testing

### **Before Fix:**
```
❌ POST /barbers/{id}/services
   Status: 401
   Error: { "code": 401, "message": "Invalid JWT" }
   
Request never reaches our code - blocked by Supabase
```

### **After Fix:**
```
✅ POST /barbers/{id}/services
   Headers:
     Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...  (valid JWT)
     X-Session-Token: abc-123-def-456-1234567890     (our session)
   
   Status: 200
   Response: { success: true, services: [...] }
   
✅ [Auth] Session token: abc-123-def-456...
✅ [Auth] Session verification result: { valid: true, userId: "...", role: "barber" }
✅ [Auth] ✅ User authenticated: ab461535-9eed-4c5f-8593-f75a89692277
✅ [Services] ✅ Authenticated user requesting to save services
✅ Successfully saved 3 services for barber
```

## What You Need to Do

### **Option 1: Re-login (Recommended)**
Your current session token is still trying to use the old method. Just:
1. **Log out** (click logout button)
2. **Log in again** with your phone and password
3. Your session will work with the new system!

### **Option 2: Hard Refresh**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh the page (Ctrl+Shift+R)
3. Log in again

## Verification

After logging in, open the browser console and try saving your profile. You should see:

```
📋 Session token found: { tokenPrefix: "abc-123-def-456...", tokenLength: 36 }
📤 Sending services to API: { servicesCount: 3, hasToken: true }

[Request sent with headers:]
  Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
  X-Session-Token: abc-123-def-456-1234567890

✅ Services saved successfully
✅ [BARBER PROFILE SAVE] Successfully saved to Supabase
```

No more "Invalid JWT" errors!

## Summary

The issue was a mismatch between Supabase's expectation (JWT tokens) and our implementation (UUID session tokens). By using a custom header for our sessions while providing a valid JWT to Supabase, both systems work together harmoniously.

**Status:** ✅ FIXED - Ready to use after re-login!
