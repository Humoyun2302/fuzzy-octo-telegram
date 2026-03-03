# 🔧 Netlify Deployment Troubleshooting for Soniya

Common issues and solutions when deploying to Netlify.

---

## 🚨 Build Errors

### ❌ Error: "Invalid package name 'node:path'"

**Full Error**:
```
npm error Invalid package name "node:path" of package "node:path@*": name can only contain URL-friendly characters.
```

**Cause**: Using `node:` prefix in import statements (like `import path from 'node:path'`). npm tries to install this as a package, which fails.

**Solution**:
✅ The code has been fixed! Use regular imports without `node:` prefix:
```typescript
// ✅ Correct
import path from 'path'

// ❌ Wrong (causes Netlify error)
import path from 'node:path'
import { fileURLToPath } from 'node:url'
```

If you see this error, verify `vite.config.ts` uses `import path from 'path'` (no `node:` prefix).

---

### ❌ Error: "npm ERR! Missing script: build"

**Cause**: `package.json` doesn't have a build script.

**Solution**:
1. Verify `package.json` has this in the `"scripts"` section:
   ```json
   "scripts": {
     "build": "tsc && vite build"
   }
   ```
2. Push changes to GitHub
3. Netlify will auto-redeploy

---

### ❌ Error: "Cannot find module 'vite'"

**Cause**: Dependencies not installed properly.

**Solution**:
1. In Netlify build settings, ensure build command is: `npm install && npm run build`
2. Or use default: `npm run build` (Netlify installs deps automatically)
3. Clear Netlify cache: **Site settings** → **Build & deploy** → **Clear cache and retry**

---

### ❌ TypeScript Errors During Build

**Example**:
```
error TS2307: Cannot find module '@/components/...'
```

**Solution**:
1. Test build locally first:
   ```bash
   npm install
   npm run build
   ```
2. Fix all TypeScript errors in your code
3. Ensure `tsconfig.json` has correct paths:
   ```json
   "baseUrl": ".",
   "paths": {
     "@/*": ["./*"]
   }
   ```
4. Push fixes to GitHub

---

### ❌ Error: "Cannot resolve module 'path'"

**Cause**: Missing Node.js type definitions.

**Solution**:
Add to `package.json` devDependencies:
```json
"@types/node": "^20.10.0"
```

Then in `vite.config.ts`, add at top:
```typescript
import path from 'path'
```

**Note**: Do NOT use `node:path` or `node:url` imports - they will cause Netlify build errors!

---

## 🌐 Deployment Issues

### ❌ Site Shows "Page Not Found"

**Cause**: Missing SPA redirect configuration.

**Solution**:
Verify `netlify.toml` exists and contains:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

✅ This file already exists in your project!

---

### ❌ Assets Return 404 Errors

**Cause**: Incorrect publish directory.

**Solution**:
1. Go to Netlify: **Site settings** → **Build & deploy** → **Build settings**
2. Verify **Publish directory** is: `dist`
3. Redeploy if changed

---

### ❌ Blank White Page

**Cause 1**: JavaScript errors preventing app from loading.

**Solution**:
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Common issues:
   - Missing environment variables
   - Import path errors
   - Supabase connection errors

**Cause 2**: Wrong entry point.

**Solution**:
Verify `index.html` has:
```html
<div id="root"></div>
<script type="module" src="/main.tsx"></script>
```

---

## 🔐 Supabase Connection Issues

### ❌ Error: "Invalid API key"

**Symptoms**:
- Login doesn't work
- Data doesn't load
- Console shows Supabase errors

**Solution**:
1. Go to Netlify: **Site settings** → **Environment variables**
2. Verify these exist and are correct:
   ```
   VITE_SUPABASE_URL = https://gxethvdtqpqtfibpznub.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJ... (your anon key)
   ```
3. Get anon key from: https://supabase.com/dashboard → Your Project → Settings → API
4. **Important**: Use the `anon` `public` key, NOT `service_role`
5. Click "Save" then **trigger a new deploy**

---

### ❌ Error: "Auth session missing"

**Cause**: Netlify URL not whitelisted in Supabase.

**Solution**:
1. Copy your Netlify URL (e.g., `https://your-site.netlify.app`)
2. Go to Supabase Dashboard: https://supabase.com/dashboard
3. Select project: `gxethvdtqpqtfibpznub`
4. Go to: **Authentication** → **URL Configuration**
5. Add to **Site URL**: `https://your-site.netlify.app`
6. Add to **Redirect URLs**: `https://your-site.netlify.app/**`
7. Click **Save**
8. Test login again

---

### ❌ CORS Errors with Supabase

**Example**:
```
Access to fetch at 'https://...supabase.co' has been blocked by CORS policy
```

**Solution**:
1. This usually means Netlify URL is not whitelisted (see above)
2. Verify in Supabase: **Authentication** → **URL Configuration**
3. Ensure your Netlify URL is in both Site URL and Redirect URLs
4. Wait 1-2 minutes for changes to propagate

---

## 🎨 UI/Display Issues

### ❌ Styles Not Loading / Everything Looks Broken

**Cause 1**: Tailwind CSS not configured.

**Solution**:
1. Verify `vite.config.ts` includes:
   ```typescript
   import tailwindcss from '@tailwindcss/vite'
   
   export default defineConfig({
     plugins: [react(), tailwindcss()],
   })
   ```

2. Verify `package.json` has:
   ```json
   "devDependencies": {
     "tailwindcss": "^4.0.0",
     "@tailwindcss/vite": "^4.0.0"
   }
   ```

**Cause 2**: CSS not imported.

**Solution**:
Verify `main.tsx` has:
```typescript
import './styles/globals.css'
```

---

### ❌ Images Not Loading (404 errors)

**Cause**: Incorrect image paths.

**Solution**:

For static images in `/public` folder:
```tsx
// ✅ Correct
<img src="/images/logo.png" alt="Logo" />

// ❌ Wrong
<img src="./images/logo.png" alt="Logo" />
```

For imported images:
```tsx
// ✅ Correct
import logo from './assets/logo.png'
<img src={logo} alt="Logo" />
```

For Supabase Storage images:
```tsx
// ✅ Use signed URLs from Supabase
const { data } = supabase.storage
  .from('bucket')
  .createSignedUrl('path/to/image.jpg', 3600)
```

---

### ❌ Fonts Not Loading

**Solution**:
1. Put fonts in `/public/fonts/`
2. Reference in `globals.css`:
   ```css
   @font-face {
     font-family: 'YourFont';
     src: url('/fonts/YourFont.woff2') format('woff2');
   }
   ```

---

## 🌍 Language/Localization Issues

### ❌ Translations Not Working

**Cause**: Language context not wrapping app.

**Solution**:
Verify `main.tsx` or `App.tsx` wraps with LanguageProvider:
```tsx
import { LanguageProvider } from './contexts/LanguageContext'

<LanguageProvider>
  <App />
</LanguageProvider>
```

---

### ❌ Language Doesn't Persist on Reload

**Cause**: LocalStorage not working.

**Solution**:
Check browser console for errors. Ensure LanguageContext uses localStorage:
```typescript
localStorage.setItem('language', newLanguage)
```

In production, ensure privacy settings allow localStorage.

---

## 📱 Mobile/Responsive Issues

### ❌ Site Doesn't Work on Mobile

**Cause**: Missing viewport meta tag.

**Solution**:
Verify `index.html` has:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

---

### ❌ Touch Events Not Working

**Solution**:
Use both `onClick` and `onTouchEnd`:
```tsx
<button 
  onClick={handleClick}
  onTouchEnd={handleClick}
>
  Click me
</button>
```

Or use CSS:
```css
button {
  touch-action: manipulation;
}
```

---

## ⚡ Performance Issues

### ❌ Slow Initial Load

**Solution 1**: Enable code splitting (already configured in `vite.config.ts`)

**Solution 2**: Optimize images
```tsx
// Use lazy loading
<img src="..." loading="lazy" alt="..." />

// Use Netlify Image CDN
<img src="/.netlify/images?url=/image.jpg&w=800" alt="..." />
```

**Solution 3**: Enable Netlify optimizations
1. Go to: **Site settings** → **Build & deploy** → **Post processing**
2. Enable: "Bundle CSS", "Minify JS", "Pretty URLs"

---

### ❌ Slow API Calls to Supabase

**Solution**:
1. Add indexes to frequently queried columns in Supabase
2. Use `.select('specific, fields')` instead of `.select('*')`
3. Implement pagination for large datasets
4. Use Supabase's built-in caching

---

## 🔄 Environment Variable Issues

### ❌ Variables Not Available in Code

**Symptoms**:
```typescript
console.log(import.meta.env.VITE_SUPABASE_URL) // undefined
```

**Solution**:
1. Variables MUST start with `VITE_` to be accessible in frontend
2. Set in Netlify: **Site settings** → **Environment variables**
3. After adding variables, **trigger new deploy** (they don't apply to existing builds)
4. Access in code:
   ```typescript
   const url = import.meta.env.VITE_SUPABASE_URL
   ```

---

### ❌ Environment Variables Work Locally But Not on Netlify

**Cause**: Local `.env` file not synced to Netlify.

**Solution**:
1. Never commit `.env` files to Git
2. Manually add each variable in Netlify UI
3. Ensure variable names match exactly (including `VITE_` prefix)

---

## 🔒 Authentication Issues

### ❌ Login Redirects to Wrong URL

**Solution**:
1. Check Supabase redirect URLs include your Netlify domain
2. Update auth callback in your code:
   ```typescript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: 'https://your-site.netlify.app/dashboard'
     }
   })
   ```

---

### ❌ Session Not Persisting

**Solution**:
Verify Supabase client config:
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'soniya-auth-token',
  }
})
```

---

## 📊 Debugging Tools

### View Build Logs
1. Go to Netlify Dashboard
2. Click on your site
3. Click **Deploys** tab
4. Click on a deploy
5. Scroll down to see full build log

### View Function Logs
1. Go to **Functions** tab in Netlify
2. Click on a function
3. See real-time logs

### Test Locally with Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Link to your site
netlify link

# Test functions locally
netlify dev

# Test build
netlify build
```

---

## 🆘 Still Having Issues?

### Check These Resources:

1. **Netlify Status Page**
   - https://www.netlifystatus.com
   - Check if there's an outage

2. **Netlify Support Docs**
   - https://docs.netlify.com
   - Search for specific error messages

3. **Netlify Community Forum**
   - https://answers.netlify.com
   - Ask questions, get help from community

4. **Supabase Status**
   - https://status.supabase.com
   - Check if Supabase is having issues

5. **Supabase Discord**
   - https://discord.supabase.com
   - Real-time help from community

---

## 📝 Debug Checklist

When something's not working, check:

- [ ] Build succeeded in Netlify?
- [ ] Environment variables set correctly?
- [ ] Browser console shows errors?
- [ ] Network tab shows failed requests?
- [ ] Supabase URL in allowed URLs?
- [ ] Using correct API keys (anon, not service_role)?
- [ ] `netlify.toml` redirects configured?
- [ ] Publish directory is `dist`?
- [ ] Latest code pushed to GitHub?
- [ ] Tried clearing Netlify cache?

---

## 🎯 Quick Fixes

### Force New Deploy
```bash
git commit --allow-empty -m "Trigger deploy"
git push origin main
```

### Clear Cache and Redeploy
1. Go to **Deploys** tab
2. Click **Trigger deploy** dropdown
3. Select **Clear cache and deploy site**

### Rollback to Previous Deploy
1. Go to **Deploys** tab
2. Find last working deploy
3. Click **...** → **Publish deploy**

---

**Still stuck? Check the build logs first - they usually tell you exactly what's wrong!** 🔍