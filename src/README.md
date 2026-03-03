# 💈 Soniya - Barber Booking Platform

A multilingual barber booking platform built with React, TypeScript, Tailwind CSS, and Supabase.

![Platform](https://img.shields.io/badge/Platform-Web-blue)
![Framework](https://img.shields.io/badge/Framework-React-61dafb)
![Backend](https://img.shields.io/badge/Backend-Supabase-3ecf8e)
![Hosting](https://img.shields.io/badge/Hosting-Netlify-00c7b7)

---

## 🌟 Features

- 🌍 **Multilingual Support**: English, Uzbek (Cyrillic & Latin), Russian
- 💈 **Barber Management**: Profile editing, gallery, services, schedule
- 📅 **Smart Booking System**: Real-time availability, instant confirmations
- 💳 **Subscription Plans**: Free trial + Premium tiers
- 📱 **Responsive Design**: Seamless mobile & desktop experience
- 🎨 **Blue/Indigo Branding**: Modern, professional UI
- ⚡ **Fast Performance**: Skeleton loaders, optimized images
- 🔐 **Secure Authentication**: Phone & email login via Supabase

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase account
- Netlify account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/soniya-barber.git
   cd soniya-barber
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   Navigate to `http://localhost:5173`

---

## 📦 Deployment to Netlify

### Option 1: Netlify UI (Recommended)

1. Push code to GitHub
2. Go to [Netlify](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Select your repository
5. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variables (see below)
7. Deploy!

### Option 2: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --prod
```

### Environment Variables

Set these in Netlify Dashboard → Site settings → Environment variables:

```
VITE_SUPABASE_URL=https://gxethvdtqpqtfibpznub.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**📖 Full deployment guide**: See `/NETLIFY_DEPLOYMENT_GUIDE.md`

---

## 🏗️ Project Structure

```
soniya-barber/
├── src/
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Entry point
│   ├── components/             # React components
│   │   ├── BarberDashboard.tsx
│   │   ├── CustomerDashboard.tsx
│   │   ├── BookingModal.tsx
│   │   ├── SubscriptionManagement.tsx
│   │   ├── SubscriptionSkeleton.tsx  # Custom skeleton loader
│   │   └── ...
│   ├── contexts/               # Context providers
│   │   ├── LanguageContext.tsx
│   │   └── ...
│   ├── services/               # Business logic
│   │   └── subscription.service.ts
│   ├── utils/                  # Utilities
│   │   ├── supabase/
│   │   │   ├── client.ts       # Supabase client
│   │   │   └── info.tsx
│   │   └── ...
│   └── styles/
│       └── globals.css         # Global styles
├── supabase/
│   ├── functions/              # Edge functions
│   └── migrations/             # Database migrations
├── public/                     # Static assets
├── netlify.toml                # Netlify configuration
├── vite.config.ts              # Vite configuration
├── package.json
└── tsconfig.json
```

---

## 🎨 Design System

- **Primary Colors**: Blue (#3B82F6) → Indigo (#6366F1) gradients
- **Fonts**: System fonts for optimal performance
- **UI Framework**: Tailwind CSS v4
- **Components**: Custom-built with shadcn/ui patterns
- **Icons**: Lucide React
- **Animations**: Motion (Framer Motion)

---

## 🔧 Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Vite** - Build tool
- **React Hook Form** - Form management
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Motion** - Animations

### Backend
- **Supabase** - Database, Auth, Storage
- **PostgreSQL** - Database
- **Row Level Security** - Data protection
- **Edge Functions** - Serverless API

### Deployment
- **Netlify** - Static hosting + CDN
- **GitHub** - Version control
- **Netlify Functions** - Serverless functions (optional)

---

## 📱 Key Features

### For Barbers
- Create & manage profile
- Upload gallery photos
- Define services & prices
- Set availability schedule
- Accept/reject bookings
- View earnings & analytics
- Subscription management

### For Customers
- Browse barbers by location
- Filter by services, price, rating
- Book appointments instantly
- Manage bookings
- Save favorites
- Multi-language interface

### Admin Features
- User management
- Subscription tracking
- Platform analytics
- Content moderation

---

## 🌍 Localization

Supported languages:
- 🇬🇧 English (en)
- 🇺🇿 O'zbekcha (uz)
- 🇷🇺 Русский (ru)

**Translation files**: `/contexts/LanguageContext.tsx`

---

## 🧪 Testing

```bash
# Run linter
npm run lint

# Type check
npm run type-check

# Build for production (tests compile)
npm run build

# Preview production build
npm run preview
```

---

## 📚 Documentation

- **[Deployment Guide](NETLIFY_DEPLOYMENT_GUIDE.md)** - Complete Netlify setup
- **[Setup Checklist](NETLIFY_SETUP_CHECKLIST.md)** - Quick reference
- **[Architecture](ARCHITECTURE.md)** - System design
- **[Backend Guide](BACKEND_COMPLETE_GUIDE.md)** - API documentation
- **[Testing Guide](TESTING_GUIDE.md)** - Test scenarios

---

## 🔐 Security

- ✅ Environment variables for sensitive data
- ✅ Row Level Security (RLS) on all tables
- ✅ Secure authentication via Supabase
- ✅ HTTPS enforced on production
- ✅ Security headers configured
- ✅ Input validation & sanitization
- ✅ CORS properly configured

**Never commit**:
- `.env` files
- API keys
- Database credentials
- Service role keys

---

## 🚨 Troubleshooting

### Build fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Supabase connection issues
1. Check environment variables
2. Verify Supabase project is active
3. Check allowed URLs in Supabase dashboard

### Images not loading
- Ensure images are in `public/` folder
- Use absolute paths: `/images/logo.png`

**More solutions**: See troubleshooting section in deployment guide

---

## 📞 Support

- **Documentation**: Check `/docs` folder
- **Issues**: Create a GitHub issue
- **Supabase**: [Supabase Docs](https://supabase.com/docs)
- **Netlify**: [Netlify Docs](https://docs.netlify.com)

---

## 🛣️ Roadmap

- [ ] Progressive Web App (PWA)
- [ ] Push notifications
- [ ] SMS reminders via Infobip
- [ ] Payment integration
- [ ] Advanced analytics
- [ ] Barber ratings & reviews
- [ ] Loyalty program
- [ ] Admin dashboard

---

## 📄 License

This project is proprietary. All rights reserved.

---

## 👥 Contributors

Built with ❤️ by the Soniya team

---

## 🎉 Acknowledgments

- Supabase for backend infrastructure
- Netlify for hosting
- Tailwind CSS for styling system
- React community for amazing tools

---

**Ready to deploy?** Check the [Deployment Checklist](NETLIFY_SETUP_CHECKLIST.md)!

🚀 **Happy coding!**
