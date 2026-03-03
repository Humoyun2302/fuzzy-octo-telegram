# 🚀 Deploy Soniya to Netlify in 5 Steps

**Quick visual guide to get your Soniya platform live!**

---

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  STEP 1: EXPORT FROM FIGMA MAKE                                │
│  ─────────────────────────────────                             │
│                                                                 │
│  ✓ Download all files from Figma Make                          │
│  ✓ Save to folder: soniya-barber-booking                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  STEP 2: CREATE CONFIG FILES                                   │
│  ───────────────────────────                                   │
│                                                                 │
│  Create these files in project root:                           │
│                                                                 │
│  📄 package.json          ← Dependencies & scripts             │
│  📄 vite.config.ts        ← Build configuration                │
│  📄 tsconfig.json         ← TypeScript config                  │
│  📄 tsconfig.node.json    ← Node TypeScript config             │
│  📄 index.html            ← HTML entry point                   │
│  📄 main.tsx              ← React entry point                  │
│  📄 .gitignore            ← Git ignore rules                   │
│                                                                 │
│  💡 Copy exact contents from DEPLOY_NOW.md                     │
│                                                                 │
│  Update this file:                                             │
│  📝 /utils/supabase/client.ts  ← Production config             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  STEP 3: PUSH TO GITHUB                                        │
│  ──────────────────────                                        │
│                                                                 │
│  Open Terminal in project folder:                              │
│                                                                 │
│  $ git init                                                     │
│  $ git add .                                                    │
│  $ git commit -m "Initial commit - Soniya platform"            │
│                                                                 │
│  Create repo on GitHub:                                        │
│  🔗 https://github.com/new                                      │
│  Name: soniya-barber-booking                                   │
│                                                                 │
│  $ git remote add origin https://github.com/YOU/soniya-...git  │
│  $ git branch -M main                                           │
│  $ git push -u origin main                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  STEP 4: DEPLOY TO NETLIFY                                     │
│  ─────────────────────────                                     │
│                                                                 │
│  1. Go to: https://app.netlify.com                             │
│  2. Click: "Add new site" → "Import project"                   │
│  3. Choose: GitHub                                             │
│  4. Select: soniya-barber-booking                              │
│  5. Verify settings:                                           │
│     • Branch: main                                             │
│     • Build: npm run build                                     │
│     • Publish: dist                                            │
│                                                                 │
│  6. Add Environment Variables:                                 │
│                                                                 │
│     VITE_SUPABASE_URL                                          │
│     └─ https://gxethvdtqpqtfibpznub.supabase.co               │
│                                                                 │
│     VITE_SUPABASE_ANON_KEY                                     │
│     └─ [Get from Supabase Dashboard → Settings → API]         │
│                                                                 │
│  7. Click: "Deploy site"                                       │
│  8. Wait 2-5 minutes ⏱️                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  STEP 5: CONFIGURE SUPABASE                                    │
│  ──────────────────────────                                    │
│                                                                 │
│  Your site is live! URL: https://your-site.netlify.app        │
│                                                                 │
│  Now configure Supabase:                                       │
│                                                                 │
│  1. Copy your Netlify URL                                      │
│  2. Go to: https://supabase.com/dashboard                      │
│  3. Select project: gxethvdtqpqtfibpznub                       │
│  4. Go to: Authentication → URL Configuration                  │
│  5. Add to Site URL:                                           │
│     └─ https://your-site.netlify.app                           │
│  6. Add to Redirect URLs:                                      │
│     └─ https://your-site.netlify.app/**                        │
│  7. Save changes                                               │
│                                                                 │
│  ✅ TEST YOUR SITE!                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │   🎉 LIVE!    │
                    │   ─────────   │
                    │  Soniya is    │
                    │  deployed!    │
                    └───────────────┘
```

---

## 🔄 Future Updates Are Easy!

After initial deployment, just:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Netlify auto-deploys! 🚀

---

## ⚙️ Where to Get Your Supabase Anon Key

```
1. Visit: https://supabase.com/dashboard
2. Select your project
3. Click: Settings (⚙️) in sidebar
4. Click: API
5. Find: "Project API keys"
6. Copy: anon public key

   ⚠️  NOT the service_role key!
   ✅  Use the anon public key
```

---

## 📋 Quick Checklist

- [ ] Step 1: Export code from Figma Make
- [ ] Step 2: Create config files (7 files)
- [ ] Step 3: Push to GitHub
- [ ] Step 4: Deploy to Netlify with env vars
- [ ] Step 5: Configure Supabase URLs
- [ ] Test: Login works
- [ ] Test: Language switching works
- [ ] Test: Booking works
- [ ] Test: Mobile responsive

---

## 🆘 Something Wrong?

**Build fails?**
→ Run `npm install && npm run build` locally first

**Blank page?**
→ Check browser console, verify env vars in Netlify

**Login doesn't work?**
→ Add Netlify URL to Supabase allowed URLs

**Need detailed help?**
→ See `DEPLOY_NOW.md` for full guide

---

## 🎯 Success Criteria

Your deployment is successful when:

✅ Site loads at your Netlify URL  
✅ No console errors in browser  
✅ Login/signup works  
✅ Language switching works (EN/UZ/RU)  
✅ Barber listings load  
✅ Booking flow works  
✅ Mobile responsive  

---

**You got this! 💪 Follow the steps and you'll be live in 30 minutes!**

Need help? Check:
- 📖 `DEPLOY_NOW.md` - Detailed guide
- ✅ `NETLIFY_QUICK_CHECKLIST.md` - Checkbox checklist
- 🌐 https://docs.netlify.com - Netlify docs
