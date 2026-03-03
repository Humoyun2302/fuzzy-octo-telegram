# 🎯 Soniya Netlify Deployment - Quick Reference Card

**Print this or keep it open during deployment!**

---

## 📋 Pre-Flight Checklist

```
┌─────────────────────────────────────────────┐
│  ✓  Code exported from Figma Make          │
│  ✓  GitHub account ready                   │
│  ✓  Netlify account created                │
│  ✓  Supabase anon key copied              │
└─────────────────────────────────────────────┘
```

---

## 🔐 Credentials Quick Access

### Supabase
```
Project ID: gxethvdtqpqtfibpznub
URL: https://gxethvdtqpqtfibpznub.supabase.co

Anon Key: Get from:
→ https://supabase.com/dashboard
→ Settings → API
→ Copy "anon public" key
```

### Netlify Environment Variables
```
VITE_SUPABASE_URL
└─ https://gxethvdtqpqtfibpznub.supabase.co

VITE_SUPABASE_ANON_KEY
└─ eyJ... (from Supabase Dashboard)
```

---

## ⚡ 5-Step Quick Deploy

```
╔════════════════════════════════════════════╗
║  1. EXPORT CODE                            ║
║     └─ Download from Figma Make            ║
╠════════════════════════════════════════════╣
║  2. CREATE CONFIG FILES                    ║
║     └─ 7 files (see DEPLOY_NOW.md)        ║
╠════════════════════════════════════════════╣
║  3. PUSH TO GITHUB                         ║
║     └─ git init → commit → push           ║
╠════════════════════════════════════════════╣
║  4. DEPLOY TO NETLIFY                      ║
║     └─ Import repo → Add env vars         ║
╠════════════════════════════════════════════╣
║  5. CONFIGURE SUPABASE                     ║
║     └─ Add Netlify URL to allowed URLs    ║
╚════════════════════════════════════════════╝
```

---

## 📁 Required Files to Create

```
Root Directory:
├── package.json           ← Dependencies
├── vite.config.ts         ← Build config
├── tsconfig.json          ← TypeScript
├── tsconfig.node.json     ← Node TS
├── index.html             ← HTML entry
├── main.tsx               ← React entry
├── .gitignore             ← Git ignore
└── netlify.toml           ✓ Already exists

Update:
└── /utils/supabase/client.ts  ← Production config
```

---

## 🔧 Git Commands Flow

```bash
# 1. Initialize
git init

# 2. Stage all files
git add .

# 3. First commit
git commit -m "Initial commit - Soniya platform"

# 4. Add GitHub remote
git remote add origin https://github.com/YOU/soniya-barber-booking.git

# 5. Push to main
git branch -M main
git push -u origin main
```

---

## 🌐 Netlify Build Settings

```
┌──────────────────────────────────────┐
│ Branch:           main               │
│ Build command:    npm run build      │
│ Publish dir:      dist               │
│ Base dir:         (empty)            │
└──────────────────────────────────────┘
```

---

## ✅ Testing Checklist

After deployment, test these:

```
□ Homepage loads
□ Login/signup works
□ Language switch (EN/UZ/RU)
□ Barber listings show
□ Booking modal opens
□ Subscription page loads
□ Dashboard accessible
□ Mobile responsive
□ No console errors
```

---

## 🚨 Emergency Troubleshooting

### Build Failed?
```bash
# Test locally first
npm install
npm run build
# Fix errors, then push
```

### Blank Page?
```
1. Open DevTools (F12)
2. Check Console tab
3. Look for errors
4. Verify env vars in Netlify
```

### Login Broken?
```
1. Check Supabase Dashboard
2. Authentication → URL Configuration
3. Add: https://your-site.netlify.app
4. Add: https://your-site.netlify.app/**
```

### Wrong Env Vars?
```
1. Site Settings → Environment variables
2. Verify VITE_ prefix
3. Save changes
4. Trigger new deploy
```

---

## 🔄 Update Workflow

```
┌─────────────────────────────────────┐
│  Make changes                       │
│         ↓                           │
│  git add .                          │
│         ↓                           │
│  git commit -m "message"            │
│         ↓                           │
│  git push origin main               │
│         ↓                           │
│  Netlify auto-deploys! 🎉          │
└─────────────────────────────────────┘
```

---

## 📊 Success Indicators

```
✅ Build log shows "Site is live"
✅ Netlify URL loads without errors
✅ Browser console has no errors
✅ Login redirects work
✅ Data loads from Supabase
✅ All languages work
```

---

## 🔗 Quick Links

```
Netlify Dashboard:
→ https://app.netlify.com

Supabase Dashboard:
→ https://supabase.com/dashboard

GitHub Repo:
→ https://github.com/YOUR-USERNAME/soniya-barber-booking

Your Live Site:
→ https://your-site.netlify.app
```

---

## 📞 Help Resources

```
┌────────────────────────────────────┐
│  BUILD FAILS                       │
│  → NETLIFY_TROUBLESHOOTING.md     │
├────────────────────────────────────┤
│  STEP-BY-STEP                      │
│  → NETLIFY_5_STEPS.md             │
├────────────────────────────────────┤
│  COMPLETE GUIDE                    │
│  → DEPLOY_NOW.md                  │
├────────────────────────────────────┤
│  CHECKBOX LIST                     │
│  → NETLIFY_QUICK_CHECKLIST.md     │
└────────────────────────────────────┘
```

---

## ⏱️ Time Estimates

```
Export code:          2 min
Create config files:  10 min
Git setup:            5 min
Netlify deploy:       5 min
Supabase config:      3 min
Testing:              10 min
─────────────────────────────
TOTAL:                ~35 min
```

---

## 🎯 Critical Don'ts

```
❌ Don't commit .env files
❌ Don't use service_role key in frontend
❌ Don't forget VITE_ prefix on env vars
❌ Don't skip Supabase URL configuration
❌ Don't deploy without testing locally
```

---

## 💡 Pro Tips

```
💡 Test `npm run build` locally first
💡 Use GitHub for version control
💡 Clear Netlify cache if build acts weird
💡 Deploy small changes frequently
💡 Check logs when something breaks
💡 Add custom domain after testing
```

---

## 📱 Multi-Device Test

```
Desktop:
□ Chrome
□ Firefox
□ Safari

Mobile:
□ iOS Safari
□ Android Chrome

Tablet:
□ iPad Safari
□ Android tablet
```

---

## 🎊 Post-Deploy Actions

```
Immediate:
□ Test all features
□ Share with team
□ Get initial feedback

Next:
□ Custom domain (optional)
□ Analytics setup
□ Error monitoring

Ongoing:
□ Monitor logs
□ Update dependencies
□ Gather user feedback
```

---

## 🔑 Environment Variables Template

Copy this for Netlify:

```
Name: VITE_SUPABASE_URL
Value: https://gxethvdtqpqtfibpznub.supabase.co

Name: VITE_SUPABASE_ANON_KEY
Value: [PASTE YOUR ANON KEY HERE]
```

Get anon key from:
**Supabase Dashboard → Settings → API → anon public**

---

## 🚀 Command Cheat Sheet

```bash
# Build & Test
npm install              # Install deps
npm run build            # Build project
npm run preview          # Preview build

# Git
git status               # Check changes
git add .                # Stage all
git commit -m "msg"      # Commit
git push origin main     # Deploy!

# Netlify CLI (optional)
netlify login            # Login
netlify init             # Setup
netlify deploy --prod    # Deploy
netlify open:site        # Open site
```

---

## 📈 Deployment Flow Visual

```
Figma Make
    ↓
Local Files
    ↓
Git Repo
    ↓
GitHub
    ↓
Netlify Build
    ↓
Production Site
    ↓
Happy Users! 🎉
```

---

## ⚠️ Common Mistakes

```
1. Forgot to add env vars
   → Site Settings → Environment variables

2. Used wrong Supabase key
   → Use anon, not service_role

3. Didn't update Supabase URLs
   → Authentication → URL Configuration

4. Build command wrong
   → Should be: npm run build

5. Publish directory wrong
   → Should be: dist
```

---

**🎯 You've got this! Follow the steps and you'll be live in 35 minutes!**

**Need help? Check:**
- 📖 `DEPLOY_NOW.md` for detailed guide
- 🔧 `NETLIFY_TROUBLESHOOTING.md` for fixes
- ⚡ `NETLIFY_5_STEPS.md` for visual guide

---

**Deployed successfully? Awesome! 🎊**

**Now share your site and celebrate! 🥳**
