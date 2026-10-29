---
Task ID: full-refactor-local-storage
Agent: main
Task: Replace Supabase backend with Prisma + SQLite + local filesystem + NextAuth.js so the portal runs without any external Supabase setup.

Work Log:
- Updated prisma/schema.prisma — added User (email + scrypt password hash + role), Submission (with submissionDate, externalLinks as JSON string, published, ownerEmail), SubmissionFile (with filePath for local storage).
- Ran `bun run db:push` — tables created in SQLite at db/custom.db.
- Created src/lib/password.ts using Node's built-in crypto.scrypt + timingSafeEqual (no external password-hashing deps).
- Created src/lib/storage.ts with buildFilePath, saveFileBuffer, readFileBuffer, deleteFile, deleteSubmissionDir, and resolveStoragePath which blocks path-traversal attacks.
- Created src/lib/auth.config.ts — NextAuth Credentials provider, JWT sessions, callback URLs.
- Created src/app/api/auth/[...nextauth]/route.ts — NextAuth route handler.
- Rewrote src/lib/auth.ts — getServerSessionInfo, isOwner, requireOwner (verifies against the User table).
- Deleted src/middleware.ts (NextAuth uses httpOnly cookies that flow through to routes without intervention; the prior no-op middleware was deleted to silence the Next.js 16 "middleware deprecated, use proxy" warning).
- Deleted src/lib/supabase/, src/lib/db-types.ts, and the old /api/auth/{login,logout,me,callback} routes — Supabase libs no longer referenced anywhere.
- Rewrote src/app/api/submissions/route.ts — Prisma queries, owner sees all their rows; non-authenticated callers see only published rows.
- Rewrote src/app/api/submissions/[id]/route.ts — GET (owner or published), PATCH (owner only), DELETE (owner only; also removes the submission directory from disk).
- Rewrote src/app/api/submissions/[id]/files/route.ts — multipart upload via Prisma + saveFileBuffer.
- Rewrote src/app/api/submissions/[id]/files/[fileId]/route.ts — DELETE (owner only).
- Deleted src/app/api/submissions/[id]/files/[fileId]/url/route.ts — replaced by the direct file-serving route.
- Created src/app/api/files/[fileId]/route.ts — GET streams the file bytes from disk with proper Content-Type and Content-Disposition (inline for preview, attachment for download). Auth check on every request: owner always, anonymous only if the parent submission is published; returns 403 for unpublished, 404 for missing file, 410 if the disk object is gone.
- Rewrote src/app/api/public/submissions/route.ts — published-only list via Prisma.
- Rewrote src/app/api/seed/route.ts — idempotent seed of the 14 initial metadata records via Prisma.
- Rewrote src/app/api/config/route.ts — returns hasOwner based on User table count.
- Created src/app/api/setup/route.ts — one-time owner bootstrap; refuses to create a second owner (returns 409).
- Updated src/hooks/use-auth.ts — reads /api/auth/session (NextAuth), calls /api/auth/csrf + /api/auth/signout for sign-out.
- Updated src/components/file-preview-modal.tsx — uses /api/files/[fileId] directly in iframe (PDF) / img (image); removed submissionId, isPdf, isImage props (derives them from file type).
- Updated dashboard-view.tsx, submission-details-view.tsx, public-portal-view.tsx — replaced signed-URL fetch with direct anchor click to /api/files/[fileId]?download=1.
- Created src/components/views/owner-setup-view.tsx — bootstrap UI for the single owner account; pastel-green panel + clean form.
- Deleted src/components/views/setup-required-view.tsx (no longer needed — no Supabase to configure).
- Rewrote src/components/views/login-view.tsx — uses next-auth/react's signIn helper.
- Rewrote src/app/page.tsx router — phase order: loading → /public → no-owner-yet → login (signed out) → dashboard (signed in).
- Updated src/lib/env.ts — NEXTAUTH_SECRET, OWNER_EMAIL, STORAGE_DIR (no Supabase vars).
- Updated .env and .env.example to match the new vars.
- Rewrote README.md — full local-storage architecture, security model, deployment caveats (need a persistent volume for serverless).

Stage Summary:
- Lint clean (eslint reports no errors or warnings).
- Dev server boots cleanly and serves GET / 200.
- Agent Browser end-to-end verified:
  • OwnerSetup screen renders (no owner yet).
  • Created owner account → redirected to login → signed in → reached the empty dashboard.
  • Clicked "Seed initial 14 submissions" → all 14 records appear, date-grouped (newest first).
  • Opened Edit view on IEEE Paper record → uploaded a real test PDF → file appeared on disk at storage/owner@ewaste.test/<submissionId>/<timestamp>-test-ewaste.pdf AND a SubmissionFile row was created in SQLite.
  • Toggled Publish=Yes and saved.
  • Opened /#/public → public portal lists ONLY the published IEEE Paper submission (drafts/unpublished hidden).
  • Clicked "Preview / Open" on the public card → modal opened, iframe src = /api/files/<fileId>, served the PDF bytes with Content-Type application/pdf (200).
  • Anonymous curl of /api/files/<fileId> on a published submission returns 200 + the PDF bytes.
  • Flipped published=false via Prisma, reloaded /#/public → empty state ("Nothing has been published yet").
  • Anonymous curl of the same /api/files/<fileId> now returns 403 (backend enforces the published check on every request).
- Saved verification screenshots to download/01-dashboard.png, 02-edit.png, 03-public-empty.png, 04-public-with-data.png, 05-add-submission.png, 06-details.png.
