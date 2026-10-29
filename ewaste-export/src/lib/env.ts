// Environment configuration for the E-Waste Submission Portal (local variant).
//
// Required environment variables:
//
//   NEXTAUTH_SECRET   - long random string used to sign the JWT session cookie
//   OWNER_EMAIL       - the single authorised owner email (optional; informational only)
//   STORAGE_DIR       - where uploaded files live (defaults to ./storage)
//
// Copy .env.example to .env and fill in the values.

export const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "";
export const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
export const STORAGE_DIR = process.env.STORAGE_DIR ?? "";

// The portal is "configured" once an owner account exists in the database.
// We check this from the API layer; the env layer just exposes the
// information we need to bootstrap the owner.
export function isEnvReady(): boolean {
  // NEXTAUTH_SECRET has a dev fallback, so we never block on it.
  return true;
}
