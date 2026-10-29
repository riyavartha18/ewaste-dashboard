# E-Waste Submission Portal (no Supabase)

A clean, minimal academic portal for managing **E-Waste coursework, assignments and academic submissions**. This variant uses **no Supabase** — submissions and file metadata live in a local **Prisma + SQLite** database, and uploaded files are stored on the **server's filesystem** under `storage/`. Owner authentication is handled by **NextAuth.js** (email + password, single owner only).

The site has two separate experiences:

1. **Private owner dashboard** — sign in with the owner email/password you bootstrap to upload, edit, delete and publish submissions.
2. **Public, read-only professor portal** — a shareable link (`/#/public`) that lets anyone browse only the submissions the owner has marked as published. No login required, no admin controls exposed.

Built with **Next.js 16 + TypeScript + Tailwind CSS 4 + Prisma + NextAuth.js**.

---

## Visual design

Pastel green & white palette, applied consistently across login, owner-setup, dashboard, upload form, submission cards, document preview and the public portal:

| Token | Hex | Use |
|---|---|---|
| Background | `#F7FAF5` | Page background |
| Card | `#FFFFFF` | Cards & form panels |
| Pastel green | `#E4F0DF` | Sections, drop zones, status badges |
| Sage green | `#C8DEC1` | Primary buttons, active nav, selected chips |
| Forest green | `#355844` | Headings, primary text accents |
| Charcoal | `#303832` | Body text |
| Border | `#E3EAE0` | Card & input borders |

A tiny recycling symbol identifies the brand. Layouts are responsive, rounded corners, minimal shadows, no neon or dark-mode backgrounds.

---

## What's stored where

| Concern | Storage location |
|---|---|
| Owner account (email + scrypt-hashed password) | Prisma + SQLite (`User` table) |
| Submission metadata | Prisma + SQLite (`Submission` table) |
| File metadata (name, type, size, path) | Prisma + SQLite (`SubmissionFile` table) |
| Actual file bytes | Local filesystem under `storage/<ownerEmail>/<submissionId>/<unique>-<filename>` |
| Auth session | httpOnly cookie signed by `NEXTAUTH_SECRET` (NextAuth JWT) |

The portal does **not** use `localStorage` as the permanent file database, and does **not** use mock buttons or fake upload success messages. Every upload writes to disk + DB; every list view reads from the DB.

---

## How users navigate the portal

The **landing page is the public portal** (`/#/public`). When anyone opens the app — including your professor — they see only the published submissions, with no login required and no admin controls visible.

The **Owner Sign In** button is discreetly placed in the top-right of the public portal header (small sage-green button with a key icon). Clicking it takes you to the login screen at `/#/login`. After signing in, you are redirected to `/#/dashboard`. Signing out returns you to the public portal.

| Route | Who can access | What it shows |
|---|---|---|
| `/#/public` (also the default landing) | Anyone | Public professor portal — published submissions only |
| `/#/public/submissions/<id>` | Anyone | Public submission detail |
| `/#/login` | Anyone (but only useful if you're the owner) | Owner sign-in form |
| `/#/setup` | Anyone, only when no owner exists yet | One-time owner bootstrap (fallback) |
| `/#/dashboard` | Signed-in owner only | Owner dashboard |
| `/#/dashboard/new` | Signed-in owner only | Add submission form |
| `/#/dashboard/edit/<id>` | Signed-in owner only | Edit a submission |
| `/#/dashboard/submissions/<id>` | Signed-in owner only | Submission details |

## Owner account auto-bootstrap

The owner account is auto-created on the first request to `/api/config` if the env vars `OWNER_EMAIL` + `OWNER_PASSWORD` are set. For this deployment they are pre-set to:

- **Email:** `riya.vartha18@gmail.com`
- **Password:** `Yash@22`

You can change them by editing `.env` and restarting `bun run dev`. To recreate the owner with different credentials, clear the SQLite DB file (`rm db/custom.db && bun run db:push`) and restart.

---

### Owner dashboard (`/#/dashboard`, after login)

- Stats: total submissions, completed, categories, recently uploaded documents
- Search by title / category / description
- Filters: All · Completed · Drafts; per-category dropdown
- Sort: newest first, oldest first, A→Z
- Date-grouped submission list (inspired by Google Classroom's completed assignments view)
- Prominent "+ Add Submission" button
- "Copy Public Link" action — copies `https://<your-domain>/#/public` to share with the professor
- Per-card View Details / Edit / Delete controls (visible only to the owner)

### Add / Edit submission

- Title, Category, Submission Date, Status (Completed/Draft), Description (optional), External resource links (optional), Published Yes/No
- Drag-and-drop file uploader with progress, validation, success/error messages
- Files are saved to `storage/<ownerEmail>/<submissionId>/<unique>-<filename>`
- 50 MB max per file
- Allowed types: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV, ZIP, PNG, JPG

### Submission details & file actions

- Each card shows title, date, category, status, attached file count, View Details
- Per-file View/Open and Download buttons
- In-browser PDF and image previews. Published Office documents use Microsoft Office Online on a public deployment to show the original document layout. Localhost uses a best-effort browser preview; PPTX slide text and Excel cell data may not preserve the original layout, charts, images, or animations. Legacy DOC, XLS, and PPT files require a public deployment for the Office Online preview.
- File access control: owner always; everyone else only when the parent submission is `published = true` — enforced on the backend at every request

### Public professor portal (`/#/public`)

- Browse only submissions the owner has marked as published
- Search, category filter, sort by date
- Open submission details and preview/download published files
- No admin controls, no upload, no edit, no delete — these views are not rendered at all
- Drafts and unpublished submissions never appear in public endpoints

### Owner login and security

- **NextAuth.js** Credentials provider — email + password
- Passwords hashed with **scrypt** (Node's built-in `crypto.scrypt`, no external dependencies)
- A single bootstrap screen creates the **one and only owner account** — after that, the `/api/setup` endpoint refuses to create another
- Owner-only writes enforced on the backend via `requireOwner()` checks in every API route
- The owner's session is a JWT signed with `NEXTAUTH_SECRET`, stored in an httpOnly cookie

---

## Project structure

```
prisma/
  schema.prisma                  # User, Submission, SubmissionFile models
src/
  app/
    api/
      auth/[...nextauth]/route.ts  # NextAuth route (sign-in / sign-out / session / csrf)
      config/route.ts            # GET hasOwner (so frontend can render OwnerSetupView)
      setup/route.ts             # POST one-time owner bootstrap
      public/submissions/route.ts  # GET published-only list (public)
      seed/route.ts              # POST owner-only idempotent seed (14 submissions)
      submissions/
        route.ts                 # GET list (owner=all, public=published)  POST create
        [id]/route.ts            # GET / PATCH / DELETE single submission
        [id]/files/route.ts      # POST upload file (multipart)
        [id]/files/[fileId]/route.ts  # DELETE file
      files/[fileId]/route.ts    # GET file bytes (auth-checked, preview/download)
    layout.tsx                   # Root layout + metadata
    page.tsx                     # Hash router: #/login #/dashboard #/dashboard/new
                                  # #/dashboard/edit/<id> #/dashboard/submissions/<id>
                                  # #/public #/public/submissions/<id>
    globals.css                  # Pastel-green theme tokens + utility classes
  components/
    brand.tsx
    sidebar.tsx
    submission-card.tsx
    file-uploader.tsx
    file-preview-modal.tsx
    status-badge.tsx
    empty-state.tsx
    views/
      owner-setup-view.tsx
      login-view.tsx
      dashboard-view.tsx
      add-submission-view.tsx
      edit-submission-view.tsx
      submission-details-view.tsx
      public-portal-view.tsx
  hooks/
    use-auth.ts
    use-hash-route.ts
  lib/
    env.ts                       # NEXTAUTH_SECRET, OWNER_EMAIL, STORAGE_DIR
    types.ts                    # Shared types, allowed file types, formatFileSize
    auth.ts                     # requireOwner, getServerSessionInfo
    auth.config.ts              # NextAuth config (Credentials provider, JWT)
    password.ts                 # scrypt hash + verify
    storage.ts                  # Filesystem helpers (save, read, delete, path traversal guard)
    db.ts                       # Prisma client (already provided by scaffold)
    seed.ts                     # 14 initial submission metadata records
    submissions-api.ts          # requireOwner + row-to-TS mapper
README.md
.env.example
```

---

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | yes (already set) | SQLite file location |
| `NEXTAUTH_SECRET` | strongly recommended | Signs the session JWT. Generate with `openssl rand -base64 32` |
| `OWNER_EMAIL` | optional | Informational — locks the bootstrap form to a specific email |
| `STORAGE_DIR` | optional | Where uploaded files live. Defaults to `./storage` |

### 3. Push the Prisma schema

```bash
bun run db:push
```

This creates the `User`, `Submission`, and `SubmissionFile` tables in SQLite.

### 4. Start the dev server

```bash
bun run dev
```

The app runs at `http://localhost:3000`. Routes are hash-based:

- `/#/` — root: shows OwnerSetup if no owner exists, login if owner exists but signed out, dashboard if signed in
- `/#/dashboard` — owner dashboard
- `/#/dashboard/new` — add submission
- `/#/dashboard/edit/<id>` — edit a submission
- `/#/dashboard/submissions/<id>` — view submission details
- `/#/public` — public professor portal
- `/#/public/submissions/<id>` — public submission details

### 5. Create the owner account

When you first open the app, you'll see the **Bootstrap owner** screen. Enter an email and password (8+ chars) and click "Create owner account." The `/api/setup` endpoint creates the `User` row and **refuses to create a second one** — no one else can register afterwards.

After the owner account is created, you're redirected to the login screen. Sign in with the email and password you just set.

### 6. Seed initial 14 submissions

After signing in, when the dashboard is empty the empty-state offers a **"Seed initial 14 submissions"** button. This calls `POST /api/seed`, which inserts the 14 metadata records listed in the assignment spec. Each record is created with `published = false` and no attached files. You then attach files by clicking **Edit** on each card.

The seed endpoint is idempotent: re-running it does not duplicate records (matched by `title + submissionDate`).

The 14 records (all with explicit 2026 dates):

| Title | Date | Category |
|---|---|---|
| IEEE Paper Submission Folder | 2026-10-20 | Research Paper |
| Case Study Report Submission | 2026-10-04 | Case Study |
| LEED Certificate Rating System of Green Building in India | 2026-09-28 | Report |
| E-waste Campaign Documents — Class Activity | 2026-09-07 | Class Activity |
| Companies Following E-waste Rules in India | 2026-08-31 | Report |
| E-waste Recovery Process — Description with Suggested Changes | 2026-08-25 | Report |
| E-waste — Comparison of Rules of Different Countries | 2026-08-25 | Comparison |
| Novel Ideas for E-waste — PPT Submission for Pitch Deck | 2026-08-21 | Pitch Deck |
| Carbon Footprint Tracker — Data Upload | 2026-08-11 | Data Tracker |
| State-wise E-waste Tracker — PPT | 2026-08-11 | Data Tracker |
| E-waste India Scenario — Comparison | 2026-08-04 | Comparison |
| Assignment ZERO | 2026-07-26 | Assignment |
| Assignment 1 — E-waste Tracker by Excel | 2026-07-23 | Assignment |
| Class Task — Upload the Write-up Done in Class | 2026-07-22 | Class Activity |

---

## Security model

- **One-time owner bootstrap**: `/api/setup` refuses to create a second owner if one already exists (returns 409 Conflict). No one else can register.
- **Owner-only writes**: every mutating API route calls `requireOwner()` which checks the NextAuth JWT against the `User` table. Failed checks return 401/403 regardless of whether the buttons are hidden in the UI.
- **Public read**: only `published = true` rows are returned by `/api/public/submissions` and the public branch of `/api/submissions/[id]`.
- **File serving**: `/api/files/[fileId]` reads the file from disk and streams the bytes with the correct `Content-Type`. It checks auth on every request — owner always; everyone else only if the parent submission is published. Drafts and their files are never accessible without signing in.
- **Path traversal guard**: `storage.ts` resolves every relative path against `STORAGE_ROOT` and rejects any attempt to escape it (`../../etc/passwd`-style attacks return an error rather than reading the file).
- **Password hashing**: scrypt with a 16-byte random salt and 64-byte derived hash, constant-time comparison via `timingSafeEqual`.

---

## Deployment

The app is a standard Next.js 16 project and can be deployed to any Node host (Vercel, Netlify Functions, Railway, Fly.io, a VPS, etc.).

⚠ **Important — filesystem caveat**: uploaded files live on the server's filesystem under `storage/`. On serverless platforms (e.g., Vercel functions, AWS Lambda) the filesystem is ephemeral — uploads would not survive a cold start. For production deployments, use one of:

- A **persistent volume** mounted at `STORAGE_DIR` (Railway, Fly.io, Render, a VPS)
- A long-running Node server on a single VM
- A persistent disk attached to your container

Build & start:

```bash
bun run build
bun run start
```

Set the env vars (`DATABASE_URL`, `NEXTAUTH_SECRET`, optionally `STORAGE_DIR`) on your hosting provider. Push the Prisma schema before first start: `bun run db:push`.

To reset the owner password (e.g., if forgotten), delete the SQLite DB file at the `DATABASE_URL` location and re-run `bun run db:push`, then re-bootstrap from the OwnerSetupView.

---

## Allowed file types

PDF · DOC · DOCX · PPT · PPTX · XLS · XLSX · CSV · ZIP · PNG · JPG — up to 50 MB per file.

---

## Tech stack

- Next.js 16 (App Router) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons
- Prisma 6 + SQLite (file-backed)
- NextAuth.js v4 (Credentials provider, JWT sessions)
- Node's built-in `crypto.scrypt` for password hashing (no extra deps)
- `date-fns` for date formatting
