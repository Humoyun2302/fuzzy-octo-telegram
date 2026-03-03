# 🚀 Netlify Deployment Guide for Soniya

Complete step-by-step guide to deploy your Soniya barber booking platform to Netlify.

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ A GitHub/GitLab/Bitbucket account (to connect your repository)
- ✅ A Netlify account (sign up at https://netlify.com)
- ✅ Your Supabase project credentials:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_DB_URL`
- ✅ All code tested and working locally

---

## 🎯 Step 1: Prepare Your Code for Deployment

### 1.1 Export Your Code from Figma Make

Since you're working in Figma Make, you'll need to export your code:

1. **Copy all your project files** to a local directory on your computer
2. Create the following structure:
   ```
   soniya-barber/
   ├── src/
   │   ├── App.tsx
   │   ├── components/
   │   ├── contexts/
   │   ├── services/
   │   ├── utils/
   │   └── styles/
   ├── supabase/
   ├── public/
   ├── index.html
   ├── package.json
   ├── vite.config.ts
   ├── tsconfig.json
   ├── netlify.toml (created for you)
   └── .nvmrc (created for you)
   ```

### 1.2 Create Required Configuration Files

I've already created `netlify.toml` and `.nvmrc` for you. You'll need to create a few more files locally:

**package.json** (if not exists):
```json
{
  "name": "soniya-barber-booking",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
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
    "tailwindcss": "^4.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
```

**index.html** (at root):
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Soniya - Barber Booking Platform</title>
    <meta name="description" content="Book your barber appointment easily with Soniya" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**src/main.tsx**:
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

---

## 🔧 Step 2: Initialize Git Repository

1. **Open Terminal** in your project directory
2. **Initialize Git**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Soniya barber booking platform"
   ```

3. **Create a new repository** on GitHub:
   - Go to https://github.com/new
   - Name it `soniya-barber-booking`
   - Keep it private or public (your choice)
   - Don't initialize with README (you already have code)

4. **Push your code to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/soniya-barber-booking.git
   git branch -M main
   git push -u origin main
   ```

---

## 🌐 Step 3: Deploy to Netlify

### Method A: Deploy via Netlify UI (Recommended)

1. **Log in to Netlify**: https://app.netlify.com

2. **Click "Add new site"** → **"Import an existing project"**

3. **Connect to Git provider**:
   - Select GitHub
   - Authorize Netlify to access your repositories
   - Select `soniya-barber-booking` repository

4. **Configure build settings**:
   - **Branch to deploy**: `main`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - Click "Show advanced" to confirm these match your netlify.toml

5. **Add environment variables**:
   Click "Add environment variables" and add:
   ```
   VITE_SUPABASE_URL = your-supabase-url
   VITE_SUPABASE_ANON_KEY = your-anon-key
   ```
   
   ⚠️ **Important**: In Vite, environment variables must be prefixed with `VITE_` to be accessible in the frontend.

6. **Click "Deploy site"**

7. **Wait for deployment** (usually 2-5 minutes)

### Method B: Deploy via Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Initialize Netlify site**:
   ```bash
   netlify init
   ```
   Follow the prompts to create a new site or link to existing.

4. **Set environment variables**:
   ```bash
   netlify env:set VITE_SUPABASE_URL "your-supabase-url"
   netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
   ```

5. **Deploy**:
   ```bash
   # Deploy to draft URL for testing
   netlify deploy
   
   # Deploy to production
   netlify deploy --prod
   ```

---

## 🔐 Step 4: Configure Supabase for Production

### 4.1 Update Supabase Client Code

Update `/utils/supabase/client.ts` to use environment variables:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 4.2 Add Netlify URL to Supabase

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Go to Authentication** → **URL Configuration**
4. **Add your Netlify URL** to "Site URL":
   ```
   https://your-site-name.netlify.app
   ```
5. **Add to "Redirect URLs"**:
   ```
   https://your-site-name.netlify.app/**
   ```

---

## 🎨 Step 5: Configure Custom Domain (Optional)

1. **In Netlify Dashboard**, go to **Domain settings**

2. **Click "Add custom domain"**

3. **Enter your domain** (e.g., `soniya.uz`)

4. **Follow DNS configuration instructions**:
   - If domain is registered elsewhere, add these DNS records:
     ```
     Type: A
     Name: @
     Value: 75.2.60.5
     
     Type: CNAME
     Name: www
     Value: your-site-name.netlify.app
     ```

5. **Enable HTTPS** (Netlify provides free SSL via Let's Encrypt)

---

## 🧪 Step 6: Test Your Deployment

### 6.1 Smoke Tests

Visit your deployed site and test:

- [ ] Homepage loads correctly
- [ ] Login/signup works
- [ ] Language switching works (English, Uzbek, Russian)
- [ ] Barber listing loads
- [ ] Booking flow works
- [ ] Subscription page loads (with skeleton)
- [ ] Dashboard loads for barbers and customers
- [ ] Images load properly
- [ ] Mobile responsive design works

### 6.2 Check Browser Console

- [ ] No CORS errors
- [ ] No 404 errors for assets
- [ ] Supabase connection successful
- [ ] No environment variable warnings

### 6.3 Test on Multiple Devices

- [ ] Desktop (Chrome, Firefox, Safari)
- [ ] Mobile (iOS Safari, Android Chrome)
- [ ] Tablet

---

## 🔄 Step 7: Set Up Continuous Deployment

Netlify automatically deploys when you push to your repository!

```bash
# Make changes to your code
git add .
git commit -m "Update subscription skeleton styling"
git push origin main

# Netlify automatically deploys! 🎉
```

### View Deploy Status

1. **In Netlify Dashboard**, click on your site
2. Go to **Deploys** tab
3. See real-time build logs
4. Each commit creates a unique deploy preview

---

## 📊 Step 8: Monitor Your Application

### 8.1 Netlify Analytics (Optional - Paid)

- Real-time traffic monitoring
- Page performance metrics
- Bandwidth usage

### 8.2 Supabase Logs

1. **Go to Supabase Dashboard**
2. **Select your project**
3. **Go to Logs** section
4. Monitor:
   - API requests
   - Database queries
   - Authentication events
   - Errors

---

## 🚨 Troubleshooting Common Issues

### Issue 1: "Page Not Found" on Refresh

**Solution**: Netlify.toml already includes the redirect rule:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Issue 2: Environment Variables Not Working

**Symptoms**: Supabase connection fails, blank screens

**Solutions**:
1. Ensure variables are prefixed with `VITE_` in Netlify
2. Redeploy after adding environment variables
3. Check variable names match exactly

### Issue 3: Build Fails

**Common causes**:
- TypeScript errors
- Missing dependencies
- Incorrect build command

**Solution**:
```bash
# Test build locally first
npm run build

# Check build logs in Netlify Dashboard
# Fix any TypeScript/ESLint errors
```

### Issue 4: Images Not Loading

**Solution**:
- Ensure images are in `public/` folder
- Use absolute paths: `/images/logo.png`
- Or import properly: `import logo from './assets/logo.png'`

### Issue 5: CORS Errors with Supabase

**Solution**:
1. Add Netlify domain to Supabase allowed URLs
2. Check Supabase project is not paused
3. Verify API keys are correct

---

## 🔐 Security Checklist

Before going live, ensure:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is **NEVER** exposed in frontend code
- [ ] Environment variables set in Netlify (not hardcoded)
- [ ] RLS (Row Level Security) enabled on all Supabase tables
- [ ] Authentication flows tested thoroughly
- [ ] API rate limiting configured in Supabase
- [ ] HTTPS enabled (automatic with Netlify)
- [ ] Security headers configured (already in netlify.toml)

---

## 📈 Performance Optimization

### Already Configured:

✅ Asset caching (31536000 seconds for /assets/*)  
✅ Code splitting (React vendor, Supabase chunks)  
✅ Minification enabled  
✅ Security headers  

### Additional Recommendations:

1. **Enable Netlify's Asset Optimization**:
   - Go to Site Settings → Build & Deploy → Post Processing
   - Enable "Bundle CSS" and "Minify JS"

2. **Use Netlify Image CDN**:
   ```html
   <!-- Instead of: -->
   <img src="/images/barber.jpg" />
   
   <!-- Use: -->
   <img src="/.netlify/images?url=/images/barber.jpg&w=400&h=300" />
   ```

3. **Lazy Load Images**:
   ```tsx
   <img src="..." loading="lazy" />
   ```

---

## 🎯 Production Deployment Checklist

Final checks before announcing to users:

- [ ] All environment variables configured
- [ ] Custom domain set up (if applicable)
- [ ] HTTPS working
- [ ] All tests passing
- [ ] Supabase URL whitelist updated
- [ ] Database migrations run on production
- [ ] Error tracking set up (Sentry, LogRocket, etc.)
- [ ] Analytics configured (Google Analytics, Plausible, etc.)
- [ ] Backup strategy in place for Supabase
- [ ] Terms of Service and Privacy Policy updated
- [ ] Contact information correct
- [ ] Social media links working
- [ ] Email notifications tested
- [ ] SMS notifications tested (if using Infobip)
- [ ] Payment processing tested (if enabled)
- [ ] Multi-language content verified
- [ ] Mobile app tested on real devices

---

## 🔄 Rollback Procedure

If something goes wrong:

### Method 1: Netlify UI
1. Go to **Deploys** tab
2. Find the last working deployment
3. Click **"..."** → **"Publish deploy"**

### Method 2: Git
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push origin main --force
```

---

## 📞 Support Resources

- **Netlify Status**: https://www.netlifystatus.com
- **Netlify Docs**: https://docs.netlify.com
- **Netlify Community**: https://answers.netlify.com
- **Supabase Status**: https://status.supabase.com
- **Supabase Docs**: https://supabase.com/docs

---

## 🎉 Post-Deployment

Congratulations! Your Soniya platform is live! 🚀

### Share Your Site:
- Tweet about it
- Share on social media
- Submit to directory sites
- Tell your barber community

### Next Steps:
1. Monitor analytics
2. Gather user feedback
3. Plan feature updates
4. Set up automated backups
5. Configure monitoring/alerting

---

## 📝 Quick Reference

**Your Netlify site**: `https://[your-site-name].netlify.app`

**Deploy command**:
```bash
git push origin main
```

**View logs**:
```bash
netlify logs
```

**Open site**:
```bash
netlify open:site
```

**Open admin**:
```bash
netlify open:admin
```

---

**Need help?** Check the troubleshooting section or reach out to Netlify support!

Good luck with your deployment! 🎊
