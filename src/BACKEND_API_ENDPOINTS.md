# 🌐 Trimly Backend API Endpoints

Complete API documentation for all server endpoints.

**Base URL:** `https://{projectId}.supabase.co/functions/v1/make-server-166b98fa`

---

## 🔐 Authentication

All protected endpoints require one of:
- `Authorization: Bearer {sessionToken}` - For authenticated requests
- `X-Session-Token: {sessionToken}` - Alternative header for session token

**Public endpoints** (no auth required):
- `POST /auth/login`
- `POST /auth/signup`
- `GET /barbers` (read-only)

---

## 📚 Endpoint List

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | ❌ | Create new account |
| POST | `/auth/login` | ❌ | Login with phone/password |
| POST | `/auth/logout` | ✅ | Invalidate session |
| POST | `/auth/verify-session` | ✅ | Check if session is valid |
| GET | `/bookings` | ✅ | Get user's bookings |
| POST | `/bookings` | ✅ | Create new booking |
| DELETE | `/bookings/:id` | ✅ | Cancel booking |
| PUT | `/bookings/:id/reschedule` | ✅ | Reschedule booking |
| PUT | `/barber-profile` | ✅ | Update barber profile |
| POST | `/barbers/:id/services` | ✅ | Save barber services |

---

## 🔑 Authentication Endpoints

### POST `/auth/signup`

Create a new customer or barber account.

**Request Body:**
```json
{
  "phone": "+1234567890",
  "password": "securepassword123",
  "fullName": "John Doe",
  "role": "customer"  // or "barber"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "phone": "+1234567890",
    "fullName": "John Doe",
    "role": "customer"
  },
  "sessionToken": "session-token-uuid",
  "profile": {
    "id": "uuid",
    "full_name": "John Doe",
    "phone": "+1234567890"
  }
}
```

**Error Response (400/500):**
```json
{
  "error": "Phone number already registered"
}
```

**Notes:**
- Phone is cleaned (spaces removed) before storage
- Password is hashed with bcrypt
- Barbers get 14-day free trial automatically
- Session token is returned for immediate login

---

### POST `/auth/login`

Login with phone number and password.

**Request Body:**
```json
{
  "phone": "+1234567890",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "phone": "+1234567890",
    "fullName": "John Doe",
    "name": "John",
    "role": "customer"
  },
  "sessionToken": "session-token-uuid",
  "profile": {
    "id": "uuid",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "bio": "...",
    "avatar": "..."
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid phone number or password"
}
```

**Notes:**
- Session token expires in 30 days
- Store session token in `localStorage` as `trimly_session_token`

---

### POST `/auth/logout`

Invalidate current session.

**Headers:**
```
Authorization: Bearer {sessionToken}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST `/auth/verify-session`

Check if a session token is valid.

**Headers:**
```
Authorization: Bearer {sessionToken}
```

**Success Response (200):**
```json
{
  "valid": true,
  "userId": "uuid",
  "role": "customer"
}
```

**Invalid Session (200):**
```json
{
  "valid": false
}
```

---

## 📅 Booking Endpoints

### GET `/bookings`

Get all bookings for the authenticated user.

**Headers:**
```
Authorization: Bearer {publicAnonKey}
X-Session-Token: {sessionToken}
```

**Success Response (200):**
```json
{
  "bookings": [
    {
      "id": "uuid",
      "booking_code": "BK-ABC123",
      "barber_id": "uuid",
      "customer_id": "uuid",
      "service_type": "Haircut",
      "date": "2024-01-15",
      "start_time": "14:00:00",
      "end_time": "14:45:00",
      "duration": 45,
      "price": 3500,
      "status": "confirmed",
      "source": "online",
      "notes": "Please use scissors only",
      "barber": {
        "id": "uuid",
        "full_name": "Alex Martinez",
        "avatar": "url",
        "phone": "+9876543210"
      },
      "customer": {
        "id": "uuid",
        "full_name": "John Doe",
        "phone": "+1234567890"
      }
    }
  ]
}
```

**Notes:**
- Returns bookings for the authenticated user (customer or barber)
- Includes joined barber and customer data
- For manual bookings, customer data may be null

---

### POST `/bookings`

Create a new booking.

**Headers:**
```
Authorization: Bearer {publicAnonKey}
X-Session-Token: {sessionToken}
```

**Request Body:**
```json
{
  "barber_id": "uuid",
  "customer_id": "uuid",
  "slot_id": "uuid",
  "service_id": "uuid",
  "service_type": "Haircut",
  "date": "2024-01-15",
  "start_time": "14:00:00",
  "end_time": "14:45:00",
  "duration": 45,
  "price": 3500,
  "customer_phone": "+1234567890",
  "source": "online",
  "notes": "Optional notes"
}
```

**Manual Booking (Walk-in) Request:**
```json
{
  "barber_id": "uuid",
  "slot_id": "uuid",
  "service_id": "uuid",
  "service_type": "Haircut",
  "date": "2024-01-15",
  "start_time": "14:00:00",
  "end_time": "14:45:00",
  "duration": 45,
  "price": 3500,
  "source": "manual",
  "manual_customer_name": "Walk-in Customer",
  "manual_customer_phone": "+1111111111"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "booking_code": "BK-XYZ789",
    "barber_id": "uuid",
    "customer_id": "uuid",
    "service_type": "Haircut",
    "date": "2024-01-15",
    "start_time": "14:00:00",
    "end_time": "14:45:00",
    "duration": 45,
    "price": 3500,
    "status": "confirmed",
    "source": "online",
    "barber": { ... },
    "customer": { ... }
  }
}
```

**Error Response (400/409):**
```json
{
  "error": "Slot not available",
  "details": "This time slot has already been booked"
}
```

**Notes:**
- Automatically updates slot status to 'booked'
- Generates unique booking code
- For manual bookings, `customer_id` can be null
- Validates slot availability before booking

---

### DELETE `/bookings/:id`

Cancel a booking.

**Headers:**
```
Authorization: Bearer {publicAnonKey}
X-Session-Token: {sessionToken}
```

**URL Parameters:**
- `id` - Booking UUID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully"
}
```

**Error Response (404/403):**
```json
{
  "error": "Booking not found or unauthorized"
}
```

**Notes:**
- Sets booking status to 'cancelled'
- Frees up the associated slot (status → 'available')
- Only booking owner (customer/barber) can cancel

---

### PUT `/bookings/:id/reschedule`

Reschedule an existing booking to a new time slot.

**Headers:**
```
Authorization: Bearer {publicAnonKey}
X-Session-Token: {sessionToken}
```

**URL Parameters:**
- `id` - Booking UUID

**Request Body:**
```json
{
  "new_slot_id": "uuid",
  "new_date": "2024-01-16",
  "new_start_time": "15:00:00",
  "new_end_time": "15:45:00"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "booking_code": "BK-ABC123",
    "date": "2024-01-16",
    "start_time": "15:00:00",
    "end_time": "15:45:00",
    "status": "confirmed"
  }
}
```

**Error Response (400/404):**
```json
{
  "error": "New slot not available"
}
```

**Notes:**
- Frees old slot (status → 'available')
- Books new slot (status → 'booked')
- Validates new slot availability
- Maintains same service and price

---

## 👤 Profile Endpoints

### PUT `/barber-profile`

Update barber profile information.

**Headers:**
```
Authorization: Bearer {publicAnonKey}
X-Session-Token: {sessionToken}
```

**Request Body:**
```json
{
  "name": "Alex Martinez",
  "fullName": "Alexander Martinez",
  "phone": "+9876543210",
  "bio": "Expert barber with 10+ years experience",
  "address": "123 Main St, Downtown",
  "location": "123 Main St, Downtown",
  "avatar": "https://example.com/avatar.jpg",
  "languages": ["English", "Spanish"],
  "districts": ["Downtown", "Midtown"],
  "specialties": ["Modern Cuts", "Beard Styling"],
  "servicesForKids": true,
  "gallery": ["url1", "url2"],
  "priceRangeMin": 2000,
  "priceRangeMax": 8000
}
```

**Success Response (200):**
```json
{
  "success": true,
  "barber": {
    "id": "uuid",
    "full_name": "Alexander Martinez",
    "bio": "Expert barber with 10+ years experience",
    ...
  }
}
```

**Error Response (401/500):**
```json
{
  "error": "Unauthorized or update failed"
}
```

**Notes:**
- Only authenticated barber can update their own profile
- `subscription_status`, `trial_used`, etc. are NOT updated here
- Price range should match services offered

---

### POST `/barbers/:id/services`

Save/update services for a barber.

**Headers:**
```
Authorization: Bearer {publicAnonKey}
X-Session-Token: {sessionToken}
```

**URL Parameters:**
- `id` - Barber UUID

**Request Body:**
```json
{
  "services": [
    {
      "name": "Modern Haircut",
      "duration": 45,
      "price": 3500,
      "description": "Contemporary style haircut"
    },
    {
      "name": "Beard Trim",
      "duration": 20,
      "price": 1500
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "services": [
    {
      "id": "uuid",
      "barber_id": "uuid",
      "name": "Modern Haircut",
      "duration": 45,
      "price": 3500,
      "description": "Contemporary style haircut",
      "is_active": true,
      "created_at": "...",
      "updated_at": "..."
    },
    ...
  ]
}
```

**Error Response (400/401):**
```json
{
  "error": "Invalid service data or unauthorized"
}
```

**Notes:**
- Replaces ALL existing services (delete + insert)
- Automatically updates barber's `price_range_min` and `price_range_max`
- Duration in minutes, price in cents
- Services must have: name, duration > 0, price > 0

---

## ⚠️ Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (invalid data) |
| 401 | Unauthorized (invalid/missing session) |
| 403 | Forbidden (not allowed to access resource) |
| 404 | Not Found (resource doesn't exist) |
| 409 | Conflict (duplicate/unavailable) |
| 500 | Internal Server Error |

---

## 🔒 Authentication Flow

1. **Sign Up:**
   ```
   POST /auth/signup → Store sessionToken in localStorage
   ```

2. **Login:**
   ```
   POST /auth/login → Store sessionToken in localStorage
   ```

3. **Authenticated Request:**
   ```
   GET /bookings with X-Session-Token: {sessionToken}
   ```

4. **Logout:**
   ```
   POST /auth/logout → Remove sessionToken from localStorage
   ```

5. **Auto-login (on page load):**
   ```
   POST /auth/verify-session → If valid, restore user state
   ```

---

## 📝 Common Usage Examples

### Create a Booking
```javascript
const response = await fetch(
  `${baseUrl}/bookings`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      'X-Session-Token': sessionToken,
    },
    body: JSON.stringify({
      barber_id: barberId,
      customer_id: customerId,
      slot_id: slotId,
      service_id: serviceId,
      service_type: 'Haircut',
      date: '2024-01-15',
      start_time: '14:00:00',
      end_time: '14:45:00',
      duration: 45,
      price: 3500,
      source: 'online',
    }),
  }
);
```

### Get User's Bookings
```javascript
const response = await fetch(
  `${baseUrl}/bookings`,
  {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'X-Session-Token': sessionToken,
    },
  }
);
const data = await response.json();
console.log(data.bookings);
```

### Update Barber Services
```javascript
const response = await fetch(
  `${baseUrl}/barbers/${barberId}/services`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      'X-Session-Token': sessionToken,
    },
    body: JSON.stringify({
      services: [
        { name: 'Haircut', duration: 45, price: 3500 },
        { name: 'Beard Trim', duration: 20, price: 1500 },
      ],
    }),
  }
);
```

---

All endpoints use JSON for request/response bodies and require proper CORS headers! 🎯
