# ✅ Soniya → Netlify Deployment Checklist

**Print this page or keep it open while deploying!**

---

## Before You Start

- [ ] Netlify account created → https://app.netlify.com
- [ ] GitHub account ready → https://github.com
- [ ] All code tested in Figma Make
- [ ] 20 minutes of free time

---

## Phase 1: Export Code (5 min)

- [ ] Copy all files from Figma Make to computer
- [ ] Create folder: `soniya-barber`
- [ ] Paste all files there
- [ ] Create `package.json` (see DEPLOY_TO_NETLIFY.md)
- [ ] Create `vite.config.ts`
- [ ] Create `tsconfig.json`
- [ ] Create `index.html` at root
- [ ] Create `src/main.tsx`
- [ ] Verify `netlify.toml` exists ✓
- [ ] Verify `.nvmrc` exists ✓

**Folder structure check:**
```
soniya-barber/
  ├── src/
  │   └── main.tsx
  ├── components/
  ├── contexts/
  ├── utils/
  ├── supabase/
  ├── styles/
  ├── App.tsx
  ├── index.html
  ├── package.json
  ├── vite.config.ts
  ├── netlify.toml
  └── .nvmrc
```

---

## Phase 2: Push to GitHub (3 min)

Open Terminal in `soniya-barber` folder:

- [ ] `git init`
- [ ] `git add .`
- [ ] `git commit -m "Initial commit"`
- [ ] Create repo on GitHub: https://github.com/new
      - Name: `soniya-barber-booking`
      - Private or Public: Your choice
      - Don't initialize with anything
- [ ] Copy commands from GitHub and run them:
      ```bash
      git remote add origin https://github.com/USERNAME/soniya-barber-booking.git
      git branch -M main
      git push -u origin main
      ```
- [ ] Verify code appears on GitHub

---

## Phase 3: Deploy on Netlify (5 min)

### Connect Repository
- [ ] Go to https://app.netlify.com
- [ ] Click "Add new site"
- [ ] Click "Import an existing project"
- [ ] Select "GitHub"
- [ ] Authorize Netlify
- [ ] Select `soniya-barber-booking` repository

### Configure Build
- [ ] Branch to deploy: `main`
- [ ] Build command: `npm run build` (should auto-fill)
- [ ] Publish directory: `dist` (should auto-fill)

### Add Environment Variables
Click "New variable" and add:

**Variable 1:**
- [ ] Key: `VITE_SUPABASE_URL`
- [ ] Value: `https://gxethvdtqpqtfibpznub.supabase.co`

**Variable 2:**
- [ ] Key: `VITE_SUPABASE_ANON_KEY`
- [ ] Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZXRodmR0cXBxdGZpYnB6bnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMzExMzUsImV4cCI6MjA4MTgwNzEzNX0.4iPnwMUwCzPR-0FdnjyEIn6FsmDJxIYbX_5BcAfiSZY`

### Deploy!
- [ ] Click "Deploy site"
- [ ] Wait 3-5 minutes
- [ ] Build succeeds ✅
- [ ] Copy your site URL (e.g., `https://fantastic-platypus-123abc.netlify.app`)

---

## Phase 4: Configure Supabase (2 min)

- [ ] Go to https://supabase.com/dashboard
- [ ] Select project: `gxethvdtqpqtfibpznub`
- [ ] Go to: Authentication → URL Configuration
- [ ] Site URL: Paste your Netlify URL
- [ ] Redirect URLs: Add `YOUR_NETLIFY_URL/**`
      (e.g., `https://fantastic-platypus-123abc.netlify.app/**`)
- [ ] Click "Save"

---

## Phase 5: Test Deployment (5 min)

Visit your Netlify URL and check:

### Basic Functionality
- [ ] Homepage loads
- [ ] No white screen
- [ ] Images display
- [ ] Styles applied (blue/indigo colors)

### Authentication
- [ ] Login page loads
- [ ] Signup page loads
- [ ] Can create account
- [ ] Can login

### Features
- [ ] Language switcher works (EN/UZ/RU)
- [ ] Barber listing displays
- [ ] Can click on barber
- [ ] Booking modal opens
- [ ] Subscription page loads
- [ ] Skeleton loader appears ✨

### Browser Console (F12)
- [ ] No red errors
- [ ] No 404s for files
- [ ] Supabase connected

### Mobile Test
- [ ] Open site on phone
- [ ] Test basic navigation
- [ ] Responsive design works

---

## ✨ Optional: Customize (2 min)

### Change Site Name
- [ ] Netlify Dashboard → Site settings
- [ ] Click "Change site name"
- [ ] Enter: `soniya-barber`
- [ ] New URL: `https://soniya-barber.netlify.app`

### Add Custom Domain
- [ ] Netlify Dashboard → Domain settings
- [ ] Click "Add custom domain"
- [ ] Enter your domain
- [ ] Follow DNS instructions

---

## 🎉 Success Checklist

You're live when:
- [✓] Site URL works
- [✓] No build errors
- [✓] Users can login
- [✓] Bookings work
- [✓] Mobile responsive
- [✓] All languages work
- [✓] Supabase connected

---

## 🚨 Quick Troubleshooting

### Build Failed
```bash
# Test locally:
cd soniya-barber
npm install
npm run build
# Fix errors, then push again
```

### White Screen
- Check browser console (F12)
- Verify environment variables in Netlify
- Redeploy site

### Supabase Errors
- Check environment variables have `VITE_` prefix
- Verify Netlify URL added to Supabase
- Check Supabase project is not paused

### Page 404 on Refresh
- Already fixed by `netlify.toml` ✓
- If still happening, check file exists

---

## 📱 Share Your Site!

- [✓] Tweet about it
- [✓] Share with friends
- [✓] Test with beta users
- [✓] Gather feedback
- [✓] Iterate!

---

## 🔄 Future Updates

To update your site:
```bash
# Make changes
git add .
git commit -m "Update message"
git push origin main
# Netlify auto-deploys in 2-3 min!
```

---

## 📞 Help Resources

- **Full Guide**: `/NETLIFY_DEPLOYMENT_GUIDE.md`
- **Quick Guide**: `/DEPLOY_TO_NETLIFY.md`
- **Flow Diagram**: `/NETLIFY_DEPLOYMENT_FLOW.md`
- **Setup Details**: `/NETLIFY_SETUP_CHECKLIST.md`

---

## 🎯 Your URLs

**Netlify Site**: _____________________________

**GitHub Repo**: _____________________________

**Custom Domain** (if any): _____________________________

---

**Total Time**: ~20 minutes  
**Difficulty**: Beginner-friendly  
**Cost**: FREE

---

## ✅ Final Confirmation

- [✓] All phases completed
- [✓] Site is live
- [✓] Tests passed
- [✓] Ready for users

---

# 🎊 CONGRATULATIONS! 🎊

**Your Soniya platform is now live on the internet!**

Share it with the world! 🌍

---

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Status**: ✅ LIVE

---

*Keep this checklist for reference when deploying updates!*
