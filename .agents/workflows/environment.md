---
description: Project Environment Architecture and Database Safety Rules
---

# Project Environment Architecture

This project strictly adheres to a three-environment workflow to ensure data integrity and safe feature delivery. **As an agent, you must strictly follow these rules.**

## 1. Local Development (Sandbox)

- **Purpose**: All feature development, schema edits, and initial testing occur here. It is a completely safe sandbox.
- **Database**: Local PostgreSQL database.
- **Environment Variable**: `DATABASE_URL` sourced from the local `.env` file.
  - *Example*: `postgresql://localhost:5432/verihub_dev`
- **Prisma Policy**: 
  - You MUST use `npx prisma migrate dev` to generate migrations when making schema changes.
  - It is generally safe to reset/seed here if requested by the user.

## 2. Staging / Preview (Validation)

- **Purpose**: Safe testing environment before production deployment. Used for QA and verifying functionality natively online.
- **Deployment**: Any push to the GitHub `staging` branch automatically triggers a Vercel Preview Deployment.
- **Database**: Neon PostgreSQL staging database branch.
- **Environment Variable**: Cloud-managed `DATABASE_URL`.
- **Prisma Policy**:
  - **CRITICAL**: You must treat this as a testing environment, but **NEVER run destructive commands**.
  - You MUST strictly use `npx prisma migrate deploy` to safely apply migrations.
  - **BANNED COMMANDS**: `npx prisma migrate reset`, `npx prisma migrate dev`, and `npx prisma db push`.

## 3. Production (Live Data)

- **Purpose**: The live, user-facing project. Contains actual user data, receipts, and active subscriptions.
- **Deployment**: Any push or merge into the GitHub `main` branch automatically triggers a Vercel Production Deployment.
- **Database**: Neon PostgreSQL main database branch.
- **Environment Variable**: Cloud-managed `DATABASE_URL`.
- **Prisma Policy**:
  - **CRITICAL**: Production data must NEVER be altered by destructive migrations.
  - You MUST strictly use `npx prisma migrate deploy` to safely apply explicitly reviewed migrations.
  - **BANNED COMMANDS**: `npx prisma migrate reset`, `npx prisma migrate dev`, and `npx prisma db push --force-reset`.

---

## Development Workflow Summary

1. Develop locally using the local PostgreSQL database (Safe Sandbox).
2. Commit changes to the `staging` branch (Pre-production).
3. Verify functionality in the Vercel preview deployment.
4. After validation, merge `staging` into `main`.
5. Production deploy happens automatically through Vercel.

**If you are ever unsure what environment a remote Neon connection string points to, ASSUME IT IS PRODUCTION and NEVER run destructive commands.**
