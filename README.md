# Verihub

Generate. Share. Done.

Verihub is a lightweight, professional web app for generating clean, client-ready PDF receipts in seconds. Built for contractors, small business owners, freelancers, and service providers who need fast, polished documentation without complicated accounting software.

---

## 🚀 Overview

Verihub allows users to:

- Create professional receipts instantly
- Export clean PDF documents
- Store and manage receipt history
- Upgrade for enhanced features
- Share receipts directly with clients

Designed to be fast, simple, and modern — without feature bloat.

---

## ✨ Core Features

- 🧾 Instant PDF Receipt Generation  
- 📁 Secure Receipt Storage  
- 🔐 Role-Based Access (User / Admin)  
- 💳 Stripe Subscription Integration (Pro Tier)  
- 📊 Admin Dashboard Monitoring  
- ⚡ Atomic Database Upserts (Race Condition Safe)  
- 🧠 Case-Insensitive Duplicate Protection  

---

## 🛠 Tech Stack

- Next.js (App Router)
- Prisma ORM
- PostgreSQL
- Stripe API
- Vercel Deployment
- Secure API Routes

---

## 🏢 Built By

**Tektriq LLC**  
https://tektriq.com  

Detroit-based digital infrastructure and platform development.

---

## 📦 Deployment & Environment Architecture

This project strictly adheres to a three-environment workflow to ensure data integrity and safe feature delivery.

### 1. Local Development (Sandbox)
Runs locally on developer machines.
- **Database:** Local PostgreSQL (`postgresql://localhost:5432/verihub_dev`).
- **Prisma Policy:** `npx prisma migrate dev`
- **Purpose:** All feature development, schema edits, and testing occur locally first. Safe to wipe and seed.

### 2. Staging / Preview
Triggered automatically by pushing to the GitHub `staging` branch.
- **Database:** Neon PostgreSQL *staging* database branch.
- **Deployment:** Vercel Preview Deployments.
- **Prisma Policy:** `npx prisma migrate deploy`
- **Purpose:** Safe testing environment before production validating cloud behavior. Note that AI agents must treat the staging database as a testing environment and never assume it contains production data.

### 3. Production
Triggered automatically by pushing or merging into the GitHub `main` branch.
- **Database:** Neon PostgreSQL *main* database branch.
- **Deployment:** Vercel Production.
- **Prisma Policy:** `npx prisma migrate deploy`
- **Purpose:** Live user usage. Production data must never be altered by destructive migrations without explicit confirmation.

---

## 🔒 License

This project is proprietary software owned by Tektriq LLC.  
All rights reserved.

Unauthorized copying, distribution, or modification is prohibited.

---

## 🚫 CRITICAL DATABASE SAFETY RULES

AI Agents and developers **must never** execute the following destructive Prisma commands against the **Staging** or **Production** databases under any circumstances:

- `prisma migrate reset`
- `prisma db push` (or `--force-reset`)
- `prisma migrate dev` (Interactive override tests)

Agents must implicitly assume:
- **Local** = Safe development sandbox.
- **Staging** = Pre-production validation.
- **Production** = Live user data.
