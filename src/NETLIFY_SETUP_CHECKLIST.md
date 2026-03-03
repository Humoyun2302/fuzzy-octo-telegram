# ✅ Netlify Setup Checklist for Soniya

Quick reference checklist for deploying to Netlify.

---

## 📦 Files Created

- [x] `/netlify.toml` - Netlify configuration
- [x] `/.nvmrc` - Node version specification (18)
- [x] `/utils/supabase/client.production.ts` - Production-ready Supabase client
- [x] `/NETLIFY_DEPLOYMENT_GUIDE.md` - Complete deployment guide

---

## 🚀 Quick Start (5 Steps to Deploy)

### 1️⃣ Export Your Code
Copy all files from Figma Make to your local computer.

### 2️⃣ Create Git Repository
```bash
cd soniya-barber
git init
git add .
git commit -m "Initial commit"
```

### 3️⃣ Push to GitHub
```bash
# Create repo at https://github.com/new
git remote add origin https://github.com/YOUR-USERNAME/soniya-barber.git
git branch -M main
git push -u origin main
```

### 4️⃣ Deploy to Netlify
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Select GitHub → Select your repository
4. Build settings (already configured in netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Add environment variables**:
   ```
   VITE_SUPABASE_URL = https://gxethvdtqpqtfibpznub.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZXRodmR0cXBxdGZpYnB6bnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMzExMzUsImV4cCI6MjA4MTgwNzEzNX0.4iPnwMUwCzPR-0FdnjyEIn6FsmDJxIYbX_5BcAfiSZY
   ```
6. Click "Deploy site"

### 5️⃣ Update Supabase Settings
1. Go to https://supabase.com/dashboard
2. Select your project
3. Authentication → URL Configuration
4. Add your Netlify URL:
   ```
   Site URL: https://your-site-name.netlify.app
   Redirect URLs: https://your-site-name.netlify.app/**
   ```

---

## 📋 Pre-Deployment Checklist

### Code Preparation
- [ ] All features tested locally
- [ ] No console errors
- [ ] All translations complete (EN, UZ, RU)
- [ ] Skeleton loaders working
- [ ] Brand updated to "Soniya" everywhere
- [ ] Blue/Indigo colors applied consistently

### Configuration Files
- [ ] `netlify.toml` exists
- [ ] `.nvmrc` exists (Node 18)
- [ ] `package.json` exists with correct scripts
- [ ] `vite.config.ts` configured
- [ ] `index.html` at root
- [ ] `src/main.tsx` entry point

### Environment Setup
- [ ] GitHub account ready
- [ ] Netlify account created
- [ ] Supabase credentials available:
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY (for functions)
  - [ ] SUPABASE_DB_URL (optional)

---

## 🔧 Required Files for Deployment

### 1. package.json
```json
{
  "name": "soniya-barber-booking",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "lucide-react": "latest",
    "recharts": "^2.10.3",
    "sonner": "^2.0.3",
    "react-hook-form": "^7.55.0",
    "motion": "latest"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.0.8",
    "tailwindcss": "^4.0.0"
  }
}
```

### 2. vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
})
```

### 3. index.html (at project root)
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Soniya - Barber Booking Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 4. src/main.tsx
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 5. tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 🌍 Environment Variables

### In Netlify Dashboard:
Set these under **Site settings** → **Environment variables**:

```
VITE_SUPABASE_URL=https://gxethvdtqpqtfibpznub.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZXRodmR0cXBxdGZpYnB6bnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMzExMzUsImV4cCI6MjA4MTgwNzEzNX0.4iPnwMUwCzPR-0FdnjyEIn6FsmDJxIYbX_5BcAfiSZY
```

⚠️ **Important**: 
- Prefix with `VITE_` for Vite to expose them to frontend
- Never commit these to Git
- Don't expose `SUPABASE_SERVICE_ROLE_KEY` in frontend

---

## 🧪 Testing After Deployment

### Immediate Tests
- [ ] Site loads without errors
- [ ] Login/Signup works
- [ ] Language switching works (EN/UZ/RU)
- [ ] Barber listing displays
- [ ] Booking flow works
- [ ] Subscription page loads with skeleton
- [ ] Mobile responsive
- [ ] All images load

### Browser Console
- [ ] No 404 errors
- [ ] No CORS errors
- [ ] Supabase connected
- [ ] No TypeScript errors

### Multi-Browser
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (desktop)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## 🚨 Common Issues & Solutions

### ❌ "Page Not Found" on Refresh
**Fix**: Already handled by `netlify.toml` redirect rule.

### ❌ Build Fails
**Check**:
```bash
# Test locally first
npm install
npm run build
```
**Fix**: Resolve TypeScript errors, missing deps

### ❌ Environment Variables Not Working
**Fix**:
1. Ensure prefixed with `VITE_`
2. Redeploy after adding variables
3. Clear browser cache

### ❌ Supabase Connection Failed
**Fix**:
1. Check environment variables in Netlify
2. Verify Supabase project not paused
3. Add Netlify URL to Supabase allowed URLs

### ❌ Images Not Loading
**Fix**:
- Place images in `public/` folder
- Use absolute paths: `/images/logo.png`

---

## 📞 Support & Resources

- **Netlify Docs**: https://docs.netlify.com
- **Supabase Docs**: https://supabase.com/docs
- **Vite Docs**: https://vitejs.dev
- **React Docs**: https://react.dev

---

## 🎯 Next Steps After Deployment

1. **Custom Domain** (Optional)
   - Buy domain (e.g., soniya.uz)
   - Configure DNS in Netlify
   - Enable HTTPS (automatic)

2. **Analytics**
   - Google Analytics
   - Netlify Analytics
   - Plausible

3. **Monitoring**
   - Set up error tracking (Sentry)
   - Configure uptime monitoring
   - Set up Supabase alerts

4. **Performance**
   - Enable Netlify image optimization
   - Configure CDN caching
   - Add service worker for PWA

5. **Marketing**
   - Share on social media
   - Submit to directories
   - SEO optimization

---

## 🎉 You're Ready!

Everything is configured for Netlify deployment. Follow the **Quick Start** section above to deploy in minutes!

**Questions?** Check the full guide: `/NETLIFY_DEPLOYMENT_GUIDE.md`

---

**Last Updated**: February 2, 2026  
**Platform**: Soniya Barber Booking  
**Hosting**: Netlify  
**Backend**: Supabase
