# Manual Update Required for App.tsx

## Location
File: `/App.tsx`
Line: Around 1453-1454

## Current Code
```javascript
                  bio: updatedProfile.bio || '',
                  description: updatedProfile.description || '',
                  address: updatedProfile.location || updatedProfile.workplaceAddress || '',
```

## Updated Code (Add barbershopName line)
```javascript
                  bio: updatedProfile.bio || '',
                  description: updatedProfile.description || '',
                  barbershopName: updatedProfile.barbershopName || '',
                  address: updatedProfile.location || updatedProfile.workplaceAddress || '',
```

## What to Do
1. Open `/App.tsx`
2. Find line 1453 (search for: `description: updatedProfile.description`)
3. Add this line after it:
   ```
                  barbershopName: updatedProfile.barbershopName || '',
   ```
4. Make sure the indentation matches (18 spaces at the start)

## Why This is Needed
This ensures that when a barber updates their profile, the barbershopName field is sent to the backend API and saved to the database.

Without this line, the barbershop name won't be saved when updating the profile (though it will still work during signup).
