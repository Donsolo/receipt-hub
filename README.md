# Receipt Hub - Deployment Guide

This project is a Next.js application designed to be deployed on **Vercel** with a **PostgreSQL** (or SQLite for testing) database.

## 🚀 Quick Deploy (Vercel)

1.  **Push to GitHub**: Push this repository to your GitHub account.
2.  **Import to Vercel**:
    - Go to [Vercel Dashboard](https://vercel.com/dashboard).
    - Click **Add New** -> **Project**.
    - Select this repository.
3.  **Configure Project**:
    - **Framework Preset**: Next.js (Auto-detected).
    - **Environment Variables**:
      - `DATABASE_URL`: Connection string to your database (e.g., Vercel Postgres, Supabase, or Neon).
4.  **Deploy**: Click **Deploy**.

## 🛠 Database Setup

Since this app uses Prisma, you need a database.
- **Vercel Postgres (Recommended)**: Create a store in Vercel Storage and link it. Vercel will auto-set `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`.
- **SQLite (Local only)**: The default `dev.db` is ignored to prevent conflicts. Do not use SQLite for serverless production unless you know what you are doing (data will vanish on re-deploy).

## ⚠️ Important Notes
- **Puppeteer (PDFs)**: Capturing PDFs in serverless builds (Vercel) can be tricky due to size limits.
  - This project uses `puppeteer`. Vercel *may* require `puppeteer-core` and `@sparticuz/chromium` for serverless function size limits.
  - If PDF generation fails in production, you might need to swap to `puppeteer-core`.

## commands
- `npm run dev`: Start local server.
- `npm run build`: Build for production.
- `npx prisma studio`: View database locally.
