# Services Architecture & Implementation Guide

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          TRIMLY SERVICES                        │
│                     Service Management System                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│    Backend   │────▶│   Database   │
│   (React)    │     │    (Hono)    │     │  (Supabase)  │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 📊 Database Tables

### services Table
```
┌─────────────────────────────────────────────────┐
│                  services                        │
├────────────────┬──────────────┬─────────────────┤
│ Column         │ Type         │ Constraints     │
├────────────────┼──────────────┼─────────────────┤
│ id             │ UUID         │ PRIMARY KEY     │
│ barber_id      │ TEXT         │ FK → barbers.id │
│ name           │ TEXT         │ NOT NULL        │
│ duration       │ INTEGER      │ > 0             │
│ price          │ DECIMAL(10,2)│ > 0             │
│ description    │ TEXT         │ NULLABLE        │
│ created_at     │ TIMESTAMPTZ  │ AUTO            │
│ updated_at     │ TIMESTAMPTZ  │ AUTO            │
└────────────────┴──────────────┴─────────────────┘
```

### barbers Table (Related)
```
┌─────────────────────────────────────────────────┐
│                   barbers                        │
├────────────────┬──────────────┬─────────────────┤
│ id             │ TEXT         │ PRIMARY KEY     │
│ full_name      │ TEXT         │                 │
│ phone          │ TEXT         │                 │
│ subscription   │ TEXT         │                 │
│ ... other fields ...                            │
└─────────────────────────────────────────────────┘
```

### Relationship
```
barbers (1) ────< (many) services
   │
   └─ ON DELETE CASCADE
      (deleting barber removes all their services)
```

---

## 🔐 Row Level Security (RLS)

```
┌───────────────────────────────────────────────────────┐
│              services Table Policies                  │
└───────────────────────────────────────────────────────┘

📖 READ (SELECT)
   WHO: Everyone (public)
   WHY: Customers need to see services when browsing
   
✏️ INSERT
   WHO: Authenticated barbers (own services only)
   CHECK: auth.uid() = barber_id
   
📝 UPDATE
   WHO: Service owner only
   CHECK: auth.uid() = barber_id
   
🗑️ DELETE
   WHO: Service owner only
   CHECK: auth.uid() = barber_id
```

---

## 🖥️ Frontend Components

### Component Hierarchy

```
App.tsx
 └─ BarberDashboard
     └─ BarberProfileEditor
         └─ ServicesManager ⭐ (Main UI)
             ├─ Service Cards (display)
             ├─ Add/Edit Form
             └─ Delete Buttons
```

### ServicesManager Component
**File:** `/components/ServicesManager.tsx`

**Features:**
- ✅ Add new service (form with validation)
- ✅ Edit existing service (inline editing)
- ✅ Delete service (with confirmation)
- ✅ Show more/less (pagination for 6+ services)
- ✅ Price formatting (Uzbekistan format)
- ✅ Duration display (minutes)
- ✅ Character counter (description)
- ✅ Responsive design (mobile-friendly)

**State Management:**
```javascript
const [services, setServices] = useState<Service[]>([]);
const [isAddingService, setIsAddingService] = useState(false);
const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
const [formData, setFormData] = useState({
  name: '',
  duration: 30,
  price: 50000,
  description: ''
});
```

---

## 🔄 Data Flow

### Adding a Service

```
┌──────────────────────────────────────────────────────┐
│ 1. User Action                                       │
│    Click "Add Service" button                        │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│ 2. UI State                                          │
│    setIsAddingService(true) → Form expands           │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│ 3. User Input                                        │
│    Fill: Name, Duration, Price, Description          │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│ 4. Frontend Validation (ServicesManager.tsx)        │
│    ✓ Name not empty                                  │
│    ✓ Duration > 0                                    │
│    ✓ Price > 0                                       │
│    ✓ Description ≤ 150 chars                         │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│ 5. Local State Update                                │
│    onServicesChange([...services, newService])       │
│    (Optimistic UI update)                            │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│ 6. User Saves Profile                                │
│    Click "Save Profile" in BarberProfileEditor       │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│ 7. API Call (App.tsx handleUpdateProfile)           │
│    POST /barbers/:id/services                        │
│    Body: { services: [...] }                         │
│    Headers: Authorization: Bearer {token}            │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│ 8. Backend Processing (server/index.tsx)            │
│    ✓ Authenticate user                               │
│    ✓ Verify barberId matches user.id                 │
│    ✓ Check barber exists in database                 │
│    ✓ Delete old services (batch)                     │
│    ✓ Validate new services                           │
│    ✓ Insert new services                             │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│ 9. Database Operation                                │
│    BEGIN TRANSACTION;                                │
│    DELETE FROM services WHERE barber_id = ?;         │
│    INSERT INTO services VALUES (...);                │
│    COMMIT;                                           │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│ 10. Response                                         │
│     { success: true, services: [...] }               │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│ 11. Frontend Update                                  │
│     Toast: "Services saved successfully"             │
│     Update currentUser state                         │
└──────────────────────────────────────────────────────┘
```

---

## 🛡️ Validation Layers

### Layer 1: Frontend (UI)
**Location:** `ServicesManager.tsx` lines 40-59

```javascript
// Name validation
if (!formData.name.trim()) {
  toast.error('Service name is required');
  return;
}

// Duration validation
if (isNaN(formData.duration) || formData.duration <= 0) {
  toast.error('Duration must be positive');
  return;
}

// Price validation
if (isNaN(formData.price) || formData.price <= 0) {
  toast.error('Price must be positive');
  return;
}

// Description length
if (formData.description && formData.description.length > 150) {
  toast.error('Description too long');
  return;
}
```

### Layer 2: Backend (API)
**Location:** `server/index.tsx` lines 284-300

```javascript
// Required fields check
if (!s.name || s.duration === undefined || s.price === undefined) {
  throw new Error(`Missing required fields`);
}

// Type conversion & validation
const duration = parseInt(String(s.duration));
const price = parseFloat(String(s.price));

if (isNaN(duration) || duration <= 0) {
  throw new Error(`Invalid duration`);
}

if (isNaN(price) || price <= 0) {
  throw new Error(`Invalid price`);
}
```

### Layer 3: Database (Constraints)
**Location:** Migration SQL

```sql
CREATE TABLE services (
  ...
  duration INTEGER NOT NULL CHECK (duration > 0),
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  ...
);
```

---

## 🔌 API Endpoints

### 1. Get Services
```
GET /make-server-166b98fa/barbers/:barberId/services
```

**Authentication:** Optional (public endpoint)  
**Returns:** All services for specified barber

**Example:**
```bash
curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-166b98fa/barbers/user-123/services
```

**Response:**
```json
{
  "services": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "barber_id": "user-123",
      "name": "Classic Haircut",
      "duration": 30,
      "price": "50000.00",
      "description": "Standard men's haircut",
      "created_at": "2024-12-10T10:00:00Z",
      "updated_at": "2024-12-10T10:00:00Z"
    }
  ]
}
```

---

### 2. Save Services (Batch)
```
POST /make-server-166b98fa/barbers/:barberId/services
```

**Authentication:** Required  
**Authorization:** Must be the barber whose services are being updated

**Request Body:**
```json
{
  "services": [
    {
      "name": "Classic Haircut",
      "duration": 30,
      "price": 50000,
      "description": "Standard men's haircut"
    },
    {
      "name": "Fade",
      "duration": 45,
      "price": 70000,
      "description": null
    }
  ]
}
```

**Response (Success):**
```json
{
  "success": true,
  "services": [
    {
      "id": "...",
      "barber_id": "user-123",
      "name": "Classic Haircut",
      ...
    },
    ...
  ],
  "message": "2 service(s) saved successfully"
}
```

**Response (Error):**
```json
{
  "error": "Barber profile not found. Please re-login."
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (trying to edit another barber's services)
- `404` - Barber not found
- `500` - Server error

---

### 3. Delete Single Service
```
DELETE /make-server-166b98fa/services/:serviceId
```

**Authentication:** Required  
**Authorization:** Must own the service

**Response:**
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

---

## 🔧 Implementation Details

### Price Range Calculation

**Location:** `BarberProfileEditor.tsx` lines 129-138

```javascript
const computedPriceRange = useMemo(() => {
  if (services.length === 0) {
    return { min: 0, max: 0 };
  }
  const prices = services.map(s => s.price);
  return {
    min: Math.min(...prices),      // Cheapest service
    max: prices.reduce((sum, p) => sum + p, 0) // All services combined
  };
}, [services]);
```

**Example:**
- Services: [50000, 70000, 30000]
- Min: 30,000 UZS (cheapest single service)
- Max: 150,000 UZS (sum of all services)

---

### Service ID Generation

**Frontend (temporary):**
```javascript
id: `service-${Date.now()}-${Math.floor(Math.random() * 1000)}`
```

**Database (permanent):**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

---

### Show More/Less Logic

**Location:** `ServicesManager.tsx` lines 26-27

```javascript
const displayedServices = showAll ? services : services.slice(0, 6);
const hasMore = services.length > 6;
```

- Shows first 6 services by default
- "Show More" button appears if > 6 services
- Clicking reveals all services

---

## 🧪 Testing Strategy

### Unit Tests (Component Level)
```javascript
// Test validation
✓ Empty name shows error
✓ Zero duration shows error
✓ Negative price shows error
✓ Description > 150 chars shows error

// Test CRUD operations
✓ Add service updates state
✓ Edit service updates existing
✓ Delete service removes from list
✓ Cancel edit reverts changes
```

### Integration Tests (API Level)
```bash
# Test with real database
✓ POST /services creates record
✓ GET /services returns data
✓ DELETE /services removes record
✓ RLS prevents unauthorized access
```

### E2E Tests (User Journey)
```
1. Barber logs in
2. Goes to Edit Profile
3. Adds 3 services
4. Saves profile
5. Logs out
6. Logs back in
7. Services still there ✓
```

---

## 📈 Performance Considerations

### Database Indexes
```sql
CREATE INDEX idx_services_barber_id ON services (barber_id);
CREATE INDEX idx_services_created_at ON services (created_at);
```

**Why:**
- Fast lookup: "Get all services for barber X"
- Fast sort: "Show newest services first"

### Batch Operations
Backend deletes and inserts all services in one transaction:
```javascript
// Instead of:
for (service in services) {
  DELETE service;
  INSERT service;
}

// We do:
BEGIN TRANSACTION;
DELETE all services WHERE barber_id = ?;
INSERT all new services;
COMMIT;
```

**Benefits:**
- Fewer database round trips
- Atomic operation (all or nothing)
- Faster response time

---

## 🚀 Deployment Checklist

- [ ] Run migration: `20241210_create_services_table.sql`
- [ ] Verify table exists in Supabase
- [ ] Test RLS policies
- [ ] Test API endpoints with Postman/curl
- [ ] Test UI flows (add/edit/delete)
- [ ] Verify cascade delete works
- [ ] Check mobile responsive design
- [ ] Test with multiple barbers
- [ ] Verify services display to customers
- [ ] Monitor logs for errors

---

## 🐛 Common Pitfalls

### 1. Forgetting to Run Migration
**Symptom:** "relation 'services' does not exist"  
**Fix:** Run the SQL migration

### 2. Barber Not in Database
**Symptom:** "Barber profile not found"  
**Fix:** Ensure barber exists in `barbers` table (created on signup/login)

### 3. RLS Blocking Operations
**Symptom:** Services save but don't persist  
**Fix:** Check RLS policies allow operation

### 4. Price as String
**Symptom:** Math operations fail  
**Fix:** Always parse to number: `parseFloat(price)`

### 5. No Session Token
**Symptom:** 401 Unauthorized  
**Fix:** Ensure user is logged in, token in localStorage

---

## 📚 Related Documentation

- **Quick Fix:** `/SERVICE_FIX_SUMMARY.md`
- **Test Guide:** `/tests/service-management.test.md`
- **Schedule Management:** `/SCHEDULE_FILE_MAP.md`
- **Backend API:** `/supabase/functions/server/index.tsx`

---

## 🎯 Future Enhancements

### Phase 1 (Current)
- ✅ Basic CRUD operations
- ✅ Validation
- ✅ RLS security

### Phase 2 (Planned)
- [ ] Service categories (Haircut, Beard, Styling)
- [ ] Service images
- [ ] Popular services badge
- [ ] Service availability by day

### Phase 3 (Advanced)
- [ ] Package deals (multiple services discounted)
- [ ] Service reviews
- [ ] Dynamic pricing (peak hours)
- [ ] Online service catalog sharing

---

**Document Version:** 1.0  
**Last Updated:** December 10, 2024  
**Status:** ✅ Ready for Production
