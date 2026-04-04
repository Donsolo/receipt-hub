# Verihub

**Bill. Sign. Store. Network.**

Verihub is a highly secure, professional web app built for contractors, freelancers, and small businesses who need an uncompromising suite for invoicing, receipt generation, and client networking without the bloat of traditional accounting software. It functions as your billing engine, audit-ready record hub, and secure business network all in one visually stunning platform.

---

## 🚀 Overview

Verihub has evolved far beyond simple receipt generation. It is designed to act as a complete digital administration pipeline that allows users to:

- **Create Interactive Invoices:** Draft, manage, and dispatch stunning high-fidelity invoices.
- **Authorize via Public Portals:** Send secure unique links allowing clients to digitally sign, authorize, and confirm payments directly from their phone or browser.
- **Seamlessly Convert to Receipts:** Lock and convert settled invoices into immutable, audit-ready receipts with a single click.
- **Connect on the Verihub Network:** Verify connections and securely beam invoices directly to other Verihub users' private inboxes.
- **Store & Manage Backups:** Attach optimized image documentation to records to permanently retain visual proof.

Designed to be fast, undeniably premium, and highly secure.

---

## ✨ Core Features

### 🧾 The Billing & Document Engine
- **Wizard-Driven Invoices & Receipts:** Intuitive step-by-step builders with inline itemization, taxes, and custom discounts.
- **Public Viewer Portals:** Cryptographically secure public invoice URLs with document lockdown logic.
- **Digital Signatures:** Integrated Canvas API drawing and typed initials for client authorization.
- **One-Click PDF Export:** Instantly generate clean, printable PDFs of any invoice or receipt.
- **Optimized Media Attachments:** Client-side WebP image scaling to attach photos directly to invoices for proof of work.

### 🧠 AI & Automation
- **Smart Line Categorization:** Automated, intelligent extraction and categorization of items from uploaded receipts.
- **Receipt OCR Parsing:** Upload a photo of a receipt and have the system automatically draft a digitized, line-by-line digital receipt.
- **Automated Conversions:** Instantly transition settled, paid professional invoices accurately into locked, immutable receipts.

### 🌐 The Business Network
- **Peer-to-Peer Inbox:** Search, verify, and connect with other businesses on the platform.
- **Instant Secure Dispatch:** Bypass email entirely by beaming invoices directly into a client's secure Verihub vault.

### 🔐 Architecture & Security
- **Atomic Database Upserts:** Strict transaction enforcement to prevent race conditions during invoice-to-receipt conversion.
- **Role-Based Access Control:** Highly restricted endpoints separating Free, Pro, Admin, and Super Admin privileges.
- **Stripe Integration:** Frictionless upgrade paths to the Pro Tier for advanced networking and unlimited generation.
- **Dashboards & Reporting:** Bird's eye view of pending vs. paid totals, recent activity, and historical compliance exports.

---

## 🛠 Tech Stack

- **Framework:** Next.js (App Router)
- **Database / ORM:** PostgreSQL & Prisma ORM
- **Visuals & Styling:** Tailwind CSS, Framer Motion, and Custom Canvas/GL Effects
- **Infrastructure:** Vercel (Edge network), Neon (Serverless Postgres)
- **Payments:** Stripe API

---

## 🏢 Built By

**Tektriq LLC**  
https://tektriq.com  

Detroit-based digital infrastructure and premium platform development.

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
