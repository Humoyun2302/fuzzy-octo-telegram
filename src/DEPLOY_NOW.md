# 🚀 Deploy Soniya to Netlify - Quick Start Guide

**Follow these steps in order to deploy your Soniya platform to Netlify hosting.**

---

## ⚡ Quick Deployment (5 Steps)

### Step 1: Export Your Code from Figma Make

Since you're working in Figma Make, you need to download all your code:

1. **Download/Export all files** from Figma Make to a local folder on your computer
2. Name the folder: `soniya-barber-booking`

---

### Step 2: Set Up Project Structure

In your local `soniya-barber-booking` folder, create these essential files:

#### A. Create `package.json` in the root:

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
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.45.4",
    "lucide-react": "^0.460.0",
    "recharts": "^2.12.7",
    "sonner": "^2.0.3",
    "react-hook-form": "^7.55.0",
    "motion": "^11.11.17",
    "react-router-dom": "^6.26.2",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "tailwindcss": "^4.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "@tailwindcss/vite": "^4.0.0"
  }
}
```

#### B. Create `vite.config.ts` in the root:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
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

#### C. Create `tsconfig.json` in the root:

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
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### D. Create `tsconfig.node.json` in the root:

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

#### E. Create `index.html` in the root:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Soniya - Modern multilingual barber booking platform for Uzbekistan" />
    <title>Soniya - Barber Booking Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

#### F. Create `main.tsx` in the root:

```tsx
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

#### G. Create `.gitignore` in the root:

```
# Dependencies
node_modules

# Build output
dist
*.local

# Environment variables
.env
.env.local
.env.production.local
.env.development.local

# Logs
logs
*.log
npm-debug.log*

# Editor
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.swp
*.swo

# Netlify
.netlify
```

---

### Step 3: Update Supabase Client for Production

**Replace the contents** of `/utils/supabase/client.production.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

// Production environment - use environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fail-fast validation
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  throw new Error('Missing Supabase configuration');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'soniya-auth-token',
  }
});

// Export for server usage
export const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
export const publicAnonKey = supabaseAnonKey;

console.log('✅ Supabase client initialized for production');
```

**Update** `/utils/supabase/client.ts` to use production config conditionally:

```typescript
import { createClient } from '@supabase/supabase-js';

// Check if running in production (Netlify) or development (Figma Make)
const isProduction = import.meta.env.PROD || typeof import.meta.env.VITE_SUPABASE_URL !== 'undefined';

let supabase;
let projectId;
let publicAnonKey;

if (isProduction) {
  // Production: Use environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables in production');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'soniya-auth-token',
    }
  });

  projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
  publicAnonKey = supabaseAnonKey;

  console.log('✅ Supabase (Production Mode)');
} else {
  // Development: Use Figma Make integration
  const { projectId: devProjectId, publicAnonKey: devPublicAnonKey } = await import('./info.tsx');
  
  if (!devProjectId || !devPublicAnonKey) {
    throw new Error('Missing Supabase credentials from Figma Make');
  }

  const supabaseUrl = `https://${devProjectId}.supabase.co`;
  
  supabase = createClient(supabaseUrl, devPublicAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'soniya-auth-token',
    }
  });

  projectId = devProjectId;
  publicAnonKey = devPublicAnonKey;

  console.log('🔧 Supabase (Development Mode)');
}

export { supabase, projectId, publicAnonKey };

export const supabaseConfig = {
  url: `https://${projectId}.supabase.co`,
  projectId,
};
```

---

### Step 4: Initialize Git & Push to GitHub

Open Terminal/Command Prompt in your project folder:

```bash
# Initialize Git repository
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - Soniya barber booking platform"

# Create repository on GitHub at: https://github.com/new
# Name it: soniya-barber-booking
# Keep it Private or Public (your choice)

# Connect to GitHub (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/soniya-barber-booking.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

### Step 5: Deploy to Netlify

#### A. Sign Up / Log In to Netlify

1. Go to: https://app.netlify.com
2. Sign up with GitHub (recommended) or email

#### B. Create New Site

1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **GitHub**
3. Authorize Netlify to access your repositories
4. Select **`soniya-barber-booking`** repository

#### C. Configure Build Settings

Netlify should auto-detect settings, but verify:

- **Branch to deploy**: `main`
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Base directory**: (leave empty)

#### D. Add Environment Variables

Click **"Add environment variables"** and add these 2 variables:

```
Name: VITE_SUPABASE_URL
Value: https://gxethvdtqpqtfibpznub.supabase.co

Name: VITE_SUPABASE_ANON_KEY
Value: [Your Supabase Anon Key - get from Supabase Dashboard]
```

**To find your Supabase Anon Key:**
1. Go to: https://supabase.com/dashboard
2. Select your project: `gxethvdtqpqtfibpznub`
3. Go to: **Settings** → **API**
4. Copy the **`anon` `public`** key (NOT the service_role key!)

#### E. Deploy!

Click **"Deploy site"** and wait 2-5 minutes.

---

## ✅ Post-Deployment Steps

### 1. Get Your Netlify URL

After deployment completes, you'll get a URL like:
```
https://brilliant-unicorn-a1b2c3.netlify.app
```

### 2. Configure Supabase Allowed URLs

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to: **Authentication** → **URL Configuration**
4. Add your Netlify URL to:
   - **Site URL**: `https://your-site-name.netlify.app`
   - **Redirect URLs**: `https://your-site-name.netlify.app/**`

### 3. Test Your Deployment

Visit your Netlify URL and test:

- ✅ Homepage loads
- ✅ Login/Signup works
- ✅ Language switching (EN/UZ/RU)
- ✅ Barber listings load
- ✅ Booking flow works
- ✅ Subscription page loads with skeleton
- ✅ No console errors

---

## 🔄 Making Updates

After initial deployment, updates are automatic:

```bash
# Make changes to your code
git add .
git commit -m "Update subscription skeleton animation"
git push origin main

# Netlify automatically rebuilds and deploys! 🎉
```

---

## 🎨 Add Custom Domain (Optional)

1. In Netlify Dashboard, go to **Domain management**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `soniya.uz`)
4. Follow DNS configuration instructions
5. HTTPS is automatic and free!

---

## 🚨 Troubleshooting

### Build Fails
```bash
# Test build locally first
npm install
npm run build
```
Fix any TypeScript errors, then push again.

### Page Not Found on Refresh
The `netlify.toml` file already handles this with redirects.

### Supabase Connection Fails
1. Verify environment variables in Netlify are correct
2. Check Supabase URL is added to allowed URLs
3. Make sure you're using the **anon** key, not service_role

### Images Not Loading
- Put images in `/public` folder
- Use absolute paths: `/images/logo.png`

---

## 🎉 You're Live!

Your Soniya platform is now live on Netlify!

**Next steps:**
- Share your URL with team/users
- Set up custom domain
- Monitor analytics
- Gather feedback
- Plan next features

---

## 📞 Need Help?

- **Netlify Docs**: https://docs.netlify.com
- **Netlify Support**: https://answers.netlify.com
- **Supabase Docs**: https://supabase.com/docs

Good luck! 🚀
