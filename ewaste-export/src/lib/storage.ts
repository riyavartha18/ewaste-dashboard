import { mkdir, writeFile, readFile, unlink, access } from "fs/promises";
import path from "path";

// Files are stored under STORAGE_ROOT on the server's filesystem, using the
// uploaded file name directly (flat layout, no per-owner / per-submission
// nesting). Override the location with the STORAGE_DIR environment variable.
export function getStorageRoot(): string {
  const dir = process.env.STORAGE_DIR;
  if (dir && !dir.startsWith("/home/z")) {
    if (path.isAbsolute(dir)) return dir;
    return path.resolve(process.cwd(), dir);
  }
  return path.resolve(process.cwd(), "upload");
}


// Build a stable relative path for an uploaded file.
// Pattern: <fileName>  (flat — files live directly under STORAGE_ROOT)
// If a file with the same name already exists, append "_2", "_3", etc.
// This matches the user's chosen layout: /home/z/my-project/upload/<fileName>
export async function buildFilePath(
  _ownerEmail: string,
  _submissionId: string,
  fileName: string,
): Promise<string> {
  const rootDir = getStorageRoot();
  const safe = (fileName || "file").replace(/[^A-Za-z0-9._-]+/g, "_");
  let candidate = safe;
  let suffix = 2;
  while (true) {
    try {
      await access(path.join(rootDir, candidate));
      // File exists — try the next suffix
      const dot = safe.lastIndexOf(".");
      if (dot > 0) {
        candidate = `${safe.slice(0, dot)}_${suffix}${safe.slice(dot)}`;
      } else {
        candidate = `${safe}_${suffix}`;
      }
      suffix += 1;
    } catch {
      // Name is free
      return candidate;
    }
  }
}

// Resolve a relative storage path to an absolute filesystem path.
// Throws if the resolved path escapes STORAGE_ROOT (defence in depth).
export function resolveStoragePath(relPath: string): string {
  const root = path.resolve(getStorageRoot());
  const abs = path.resolve(root, relPath);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error("Path traversal blocked.");
  }
  return abs;
}


export async function saveFileBuffer(relPath: string, buffer: Buffer): Promise<void> {
  const abs = resolveStoragePath(relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buffer);
}

export async function readFileBuffer(relPath: string): Promise<Buffer> {
  const abs = resolveStoragePath(relPath);
  return readFile(abs);
}

export async function deleteFile(relPath: string): Promise<void> {
  const abs = resolveStoragePath(relPath);
  try {
    await unlink(abs);
  } catch {
    // ignore — file may already be gone
  }
}

// Kept for backwards compatibility with existing callers. With the new flat
// storage layout, submission deletion just removes individual files (handled
// by the delete route), so this is a no-op at the directory level.
export async function deleteSubmissionDir(
  _ownerEmail: string,
  _submissionId: string,
): Promise<void> {
  // no-op: files are stored flat by name, not nested per submission
}
