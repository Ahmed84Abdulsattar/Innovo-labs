# Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (free)
- Supabase project (free)
- Resend account (free)

## Steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_ORG/innovo-labs-portal.git
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to vercel.com → New Project
2. Import your GitHub repository
3. Set Root Directory to: `apps/web`
4. Add environment variables (from .env.local)
5. Click Deploy

### 3. Add environment variables in Vercel
- `DATABASE_URL`
- `JWT_SECRET`
- `EMAIL_FROM` (after domain verified)
- `NEXT_PUBLIC_APP_URL` (your Vercel URL)

### 4. Custom domain (optional)
1. Buy domain on Namecheap
2. Vercel → Project → Settings → Domains → Add
3. Follow DNS instructions

### 5. Promote first Super Admin
After deployment, run locally:
```bash
node scripts/seed.js your.email@innovogroup.com
```

## Environment Variables Reference
See `.env.example` in the root.
