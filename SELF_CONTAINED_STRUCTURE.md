# Sharp Shot - Self-Contained Structure

## ✅ CURRENT STATUS: READY FOR INDEPENDENT DEPLOYMENT

`sharpshot-main` is now **completely self-contained** and ready to be uploaded as an independent fork.

---

## 📁 DIRECTORY STRUCTURE

```
sharpshot-main/
├── client/                 # Frontend React application
│   ├── src/               # React components, pages, hooks
│   ├── public/            # Static assets
│   └── index.html         # Entry HTML
│
├── server/                # Backend Express server
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route definitions
│   ├── services/          # Business logic services
│   └── middleware/        # Express middleware
│
├── shared/                # ✅ SELF-CONTAINED shared code
│   ├── lib/               # Shared utilities
│   │   ├── evCalculations.ts
│   │   ├── oddsConversion.ts
│   │   ├── robustEVCalculation.ts
│   │   └── __tests__/     # Shared tests
│   ├── market/            # Market calculations
│   ├── betCategories.ts   # Bet type definitions
│   ├── presets.ts         # Preset configurations
│   └── schema.ts          # Database schema
│
├── api/                   # Vercel serverless functions
│   ├── betting/
│   ├── trading-terminal/
│   └── *.js               # API endpoints
│
├── public/                # Public static files
│   └── booklogos/         # Sportsbook logos
│
├── tests/                 # Test files
├── dist/                  # Build output
├── node_modules/          # Dependencies
│
├── package.json           # Dependencies & scripts
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite bundler config
├── vercel.json            # Vercel deployment config
└── README.md              # Documentation
```

---

## 🔧 PATH ALIASES (tsconfig.json)

```json
{
  "paths": {
    "@/*": ["./client/src/*"],      // Frontend code
    "@shared/*": ["./shared/*"]      // ✅ Internal shared code
  }
}
```

**All imports use these aliases:**
- `import { calculateEV } from '@shared/lib/evCalculations'`
- `import { Button } from '@/components/ui/button'`

---

## 📦 DEPENDENCIES

All dependencies are defined in `sharpshot-main/package.json`:

### Frontend
- React 18
- TanStack Query (React Query)
- Wouter (routing)
- Tailwind CSS
- Radix UI components
- Lucide icons

### Backend
- Express.js
- Drizzle ORM
- Neon Database
- Passport (authentication)
- WebSocket (ws)

### Build Tools
- Vite
- TypeScript
- ESBuild

---

## 🚀 DEPLOYMENT READY

### Local Development
```bash
cd sharpshot-main
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Vercel Deployment
```bash
vercel deploy
```

---

## ✅ VERIFICATION CHECKLIST

- ✅ All imports use `@shared/*` alias (internal to sharpshot-main)
- ✅ No imports from `../../shared` (parent directory)
- ✅ Complete `shared/` directory with all utilities
- ✅ All dependencies in `package.json`
- ✅ TypeScript paths configured correctly
- ✅ Vite aliases configured correctly
- ✅ Vercel config present
- ✅ Build scripts working
- ✅ No external dependencies outside sharpshot-main

---

## 🗑️ CLEANUP PERFORMED

**Removed:**
- `OneDrive/Desktop/VERCEL/` - Old project files (not needed)

**Kept:**
- `shared/` - Complete shared library (self-contained)
- `client/` - Frontend application
- `server/` - Backend application
- `api/` - Serverless functions
- All configuration files

---

## 📋 NEXT STEPS

### For sharpshot-main (Production)
1. ✅ Structure is complete and self-contained
2. Ready to upload to GitHub as independent repository
3. Can deploy to Vercel immediately

### For sharpshot-Dev (Development)
1. Copy the same self-contained structure
2. Ensure it has its own `shared/` directory
3. Configure as separate repository

---

## 🔄 CREATING TWO INDEPENDENT FORKS

### Option 1: Upload Both Separately
```bash
# sharpshot-main (production)
cd sharpshot-main
git init
git add .
git commit -m "Initial commit - Production build"
git remote add origin https://github.com/ItsDembo/sharpshot-main.git
git push -u origin main

# sharpshot-Dev (development)
cd ../sharpshot-Dev
git init
git add .
git commit -m "Initial commit - Development build"
git remote add origin https://github.com/ItsDembo/sharpshot-dev.git
git push -u origin main
```

### Option 2: Use Git Branches
```bash
# Create main branch for production
cd sharpshot-main
git checkout -b production

# Create dev branch for development
cd ../sharpshot-Dev
git checkout -b development
```

---

## 🎯 KEY BENEFITS

1. **Independent Deployment** - Each fork can be deployed separately
2. **No Shared Dependencies** - No conflicts between main and dev
3. **Clean Structure** - Easy to understand and maintain
4. **Version Control** - Can track changes independently
5. **Vercel Ready** - Both can deploy to Vercel without conflicts

---

## 📝 IMPORTANT NOTES

- Both `sharpshot-main` and `sharpshot-Dev` should have identical structure
- Each has its own `node_modules/` (not shared)
- Each has its own `shared/` directory (not shared between forks)
- Each has its own `.env` file for environment variables
- Each can have different feature flags (e.g., `VITE_NEW_TERMINAL`)

---

## ✅ READY TO UPLOAD!

`sharpshot-main` is now **100% self-contained** and ready to be uploaded as an independent repository or fork!

