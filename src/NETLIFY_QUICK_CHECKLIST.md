# ⚡ Netlify Deployment Checklist for Soniya

Quick reference checklist - check off each item as you complete it.

---

## 📦 Pre-Deployment

- [ ] Export all code from Figma Make to local folder
- [ ] Create `package.json` (see DEPLOY_NOW.md)
- [ ] Create `vite.config.ts` (see DEPLOY_NOW.md)
- [ ] Create `tsconfig.json` (see DEPLOY_NOW.md)
- [ ] Create `tsconfig.node.json` (see DEPLOY_NOW.md)
- [ ] Create `index.html` (see DEPLOY_NOW.md)
- [ ] Create `main.tsx` (see DEPLOY_NOW.md)
- [ ] Create `.gitignore` (see DEPLOY_NOW.md)
- [ ] Update `/utils/supabase/client.ts` for production (see DEPLOY_NOW.md)
- [ ] Verify `netlify.toml` exists ✅ (already created)

---

## 🔧 Local Testing

- [ ] Run `npm install` locally
- [ ] Run `npm run build` to test build
- [ ] Fix any TypeScript/build errors
- [ ] Test the app locally with `npm run dev`

---

## 📁 Git Setup

- [ ] Run `git init`
- [ ] Run `git add .`
- [ ] Run `git commit -m "Initial commit - Soniya platform"`
- [ ] Create repository on GitHub: https://github.com/new
- [ ] Name it: `soniya-barber-booking`
- [ ] Run `git remote add origin https://github.com/YOUR-USERNAME/soniya-barber-booking.git`
- [ ] Run `git branch -M main`
- [ ] Run `git push -u origin main`

---

## 🌐 Netlify Setup

- [ ] Sign up/login at https://app.netlify.com
- [ ] Click "Add new site" → "Import an existing project"
- [ ] Connect to GitHub
- [ ] Select `soniya-barber-booking` repository
- [ ] Verify build settings:
  - Branch: `main`
  - Build command: `npm run build`
  - Publish directory: `dist`
- [ ] Add environment variable: `VITE_SUPABASE_URL` = `https://gxethvdtqpqtfibpznub.supabase.co`
- [ ] Add environment variable: `VITE_SUPABASE_ANON_KEY` = `[your-anon-key]`
- [ ] Click "Deploy site"
- [ ] Wait for deployment to complete (2-5 minutes)

---

## 🔐 Supabase Configuration

- [ ] Copy your Netlify URL (e.g., `https://your-site.netlify.app`)
- [ ] Go to Supabase Dashboard: https://supabase.com/dashboard
- [ ] Select project: `gxethvdtqpqtfibpznub`
- [ ] Go to: **Authentication** → **URL Configuration**
- [ ] Add to **Site URL**: `https://your-site.netlify.app`
- [ ] Add to **Redirect URLs**: `https://your-site.netlify.app/**`
- [ ] Save changes

---

## ✅ Testing

Test on your live Netlify URL:

- [ ] Homepage loads without errors
- [ ] Login works
- [ ] Signup works
- [ ] Language switching works (English/Uzbek/Russian)
- [ ] Barber listings display
- [ ] Booking modal opens
- [ ] Subscription page loads with skeleton
- [ ] Dashboard loads (barber & customer)
- [ ] Profile editing works
- [ ] No console errors
- [ ] Test on mobile device
- [ ] Test on different browsers (Chrome, Safari, Firefox)

---

## 🎨 Optional: Custom Domain

- [ ] Purchase domain (e.g., `soniya.uz`)
- [ ] In Netlify: **Domain management** → **Add custom domain**
- [ ] Enter domain name
- [ ] Configure DNS records (follow Netlify instructions)
- [ ] Wait for DNS propagation (can take 24-48 hours)
- [ ] Verify HTTPS is enabled (automatic)
- [ ] Update Supabase allowed URLs with new domain

---

## 📊 Post-Launch

- [ ] Monitor Netlify deploy logs
- [ ] Check Supabase logs for errors
- [ ] Set up monitoring/analytics (optional)
- [ ] Share site with team for feedback
- [ ] Create backup of Supabase database
- [ ] Document any custom configurations

---

## 🔄 Future Updates

For all future updates, just:

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

Netlify will automatically rebuild and deploy! 🎉

---

## 🆘 Quick Troubleshooting

**Build fails?**
→ Run `npm run build` locally to see errors

**Blank page?**
→ Check browser console for errors
→ Verify environment variables in Netlify

**Login doesn't work?**
→ Verify Netlify URL is in Supabase allowed URLs
→ Check you're using anon key, not service_role key

**Page 404 on refresh?**
→ Verify `netlify.toml` redirects are in place ✅

---

## 📞 Resources

- **Full Guide**: See `DEPLOY_NOW.md`
- **Netlify Docs**: https://docs.netlify.com
- **Supabase Docs**: https://supabase.com/docs
- **Netlify Status**: https://netlifystatus.com

---

**Ready to deploy? Follow DEPLOY_NOW.md step by step!** 🚀
