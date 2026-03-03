# 🚀 Deploy Soniya to Netlify - Quick Guide

**Time required**: 15-20 minutes  
**Difficulty**: Beginner-friendly

---

## ⚡ Super Quick Deploy (5 Steps)

### Step 1: Get Your Code Ready
Since you're in Figma Make, you need to export your code:

1. **Download/copy all your project files** to your computer
2. Create a folder called `soniya-barber`
3. Paste all files there

**Important files to include**:
- All `/components/` folder
- All `/contexts/` folder
- All `/utils/` folder
- All `/supabase/` folder
- `/App.tsx`
- `/styles/globals.css`
- `/netlify.toml` (already created ✅)
- `/.nvmrc` (already created ✅)

---

### Step 2: Create Missing Files Locally

You'll need to create these files in your local folder:

**📄 package.json** (at root)
```json
{
  "name": "soniya-barber-booking",
  "private": true,
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
    "react-router-dom": "^6.20.0",
    "lucide-react": "latest",
    "recharts": "^2.10.3",
    "sonner": "^2.0.3",
    "react-hook-form": "^7.55.0",
    "date-fns": "^3.0.0",
    "clsx": "^2.0.0",
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

**📄 vite.config.ts** (at root)
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
  },
})
```

**📄 tsconfig.json** (at root)
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

**📄 tsconfig.node.json** (at root)
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**📄 index.html** (at root)
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Soniya - Book your barber appointment easily" />
    <title>Soniya - Barber Booking Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**📄 src/main.tsx** (create `src` folder first)
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../App'
import '../styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Organize your folders**:
```
soniya-barber/
├── src/
│   ├── main.tsx (create this ↑)
│   └── (empty for now)
├── components/ (move from root)
├── contexts/ (move from root)
├── utils/ (move from root)
├── supabase/ (move from root)
├── styles/ (move from root)
├── App.tsx (keep at root for now)
├── index.html (create this ↑)
├── package.json (create this ↑)
├── vite.config.ts (create this ↑)
├── tsconfig.json (create this ↑)
├── tsconfig.node.json (create this ↑)
├── netlify.toml (already exists ✅)
└── .nvmrc (already exists ✅)
```

---

### Step 3: Initialize Git & Push to GitHub

Open Terminal/Command Prompt in your `soniya-barber` folder:

```bash
# Initialize Git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - Soniya barber booking platform"

# Create repository on GitHub
# Go to: https://github.com/new
# Name: soniya-barber-booking
# Leave everything else unchecked
# Click "Create repository"

# Connect to GitHub (replace YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/soniya-barber-booking.git
git branch -M main
git push -u origin main
```

---

### Step 4: Deploy on Netlify

1. **Go to Netlify**: https://app.netlify.com

2. **Click "Add new site"** → **"Import an existing project"**

3. **Connect to GitHub**:
   - Click "GitHub"
   - Authorize Netlify
   - Select `soniya-barber-booking` repository

4. **Configure build** (should auto-detect from `netlify.toml`):
   - Branch: `main`
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Click "Show advanced"

5. **Add Environment Variables**:
   Click "New variable" and add these two:
   
   **Variable 1:**
   ```
   Key: VITE_SUPABASE_URL
   Value: https://gxethvdtqpqtfibpznub.supabase.co
   ```
   
   **Variable 2:**
   ```
   Key: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZXRodmR0cXBxdGZpYnB6bnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMzExMzUsImV4cCI6MjA4MTgwNzEzNX0.4iPnwMUwCzPR-0FdnjyEIn6FsmDJxIYbX_5BcAfiSZY
   ```

6. **Click "Deploy site"**

7. **Wait 3-5 minutes** for build to complete

8. **Your site is live!** 🎉
   - You'll get a URL like: `https://fantastic-platypus-123abc.netlify.app`

---

### Step 5: Configure Supabase

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard

2. **Select your project** (gxethvdtqpqtfibpznub)

3. **Go to Authentication** → **URL Configuration**

4. **Add your Netlify URL**:
   - **Site URL**: Paste your Netlify URL (e.g., `https://fantastic-platypus-123abc.netlify.app`)
   - **Redirect URLs**: Add `https://fantastic-platypus-123abc.netlify.app/**`

5. **Click "Save"**

---

## ✅ Test Your Deployment

Visit your Netlify URL and test:

- [ ] Homepage loads
- [ ] Login page works
- [ ] Language switcher works (EN/UZ/RU)
- [ ] No console errors (press F12)
- [ ] Images load
- [ ] Mobile view works

---

## 🎨 Customize Your Site

### Change Site Name
1. In Netlify dashboard, go to **Site settings**
2. Click **Change site name**
3. Enter: `soniya-barber` (if available)
4. Your new URL: `https://soniya-barber.netlify.app`

### Add Custom Domain
1. In Netlify, go to **Domain settings**
2. Click **Add custom domain**
3. Enter your domain (e.g., `soniya.uz`)
4. Follow DNS setup instructions

---

## 🔄 Deploy Updates

After deployment, any time you want to update your site:

```bash
# Make changes to your code
# Then:

git add .
git commit -m "Updated subscription skeleton"
git push origin main

# Netlify automatically deploys! 🚀
```

---

## 🚨 Troubleshooting

### "Build failed" error
**Solution**: 
```bash
# Test build locally first:
cd soniya-barber
npm install
npm run build

# Fix any errors that appear
# Then push again
```

### "Page Not Found" when refreshing
**Solution**: Already fixed by `netlify.toml` redirect rules ✅

### Supabase connection error
**Solution**:
1. Check environment variables in Netlify (Step 4.5)
2. Verify Netlify URL is added to Supabase (Step 5)
3. Make sure variables start with `VITE_`

### White screen / blank page
**Solution**:
1. Open browser console (F12)
2. Check for errors
3. Verify Supabase environment variables are set
4. Redeploy site in Netlify

---

## 📱 Mobile Testing

Test on your phone:
1. Open your Netlify URL on mobile browser
2. Test booking flow
3. Check all features work
4. Verify language switching

---

## 💡 Pro Tips

1. **Preview Deploys**: Every push to a branch creates a preview URL
2. **Rollback**: Can rollback to any previous deploy in Netlify
3. **Build Logs**: Check detailed logs in Netlify dashboard
4. **Analytics**: Enable Netlify Analytics (optional, paid)
5. **Forms**: Netlify Forms work automatically (optional feature)

---

## 🎯 Next Steps After Deploy

- [ ] Test all features thoroughly
- [ ] Set up custom domain
- [ ] Configure analytics (Google Analytics, etc.)
- [ ] Add monitoring (UptimeRobot, etc.)
- [ ] Share with beta testers
- [ ] Gather feedback
- [ ] Iterate and improve

---

## 📞 Need Help?

- **Full Guide**: See `/NETLIFY_DEPLOYMENT_GUIDE.md`
- **Checklist**: See `/NETLIFY_SETUP_CHECKLIST.md`
- **Netlify Support**: https://answers.netlify.com
- **Supabase Support**: https://supabase.com/docs

---

## ✨ You're Done!

Congratulations! Your Soniya platform is now live on the internet! 🎉

**Your Live Site**: `https://your-site-name.netlify.app`

Share it with the world! 🌍

---

**Created**: February 2, 2026  
**Platform**: Soniya Barber Booking  
**Stack**: React + Supabase + Netlify
