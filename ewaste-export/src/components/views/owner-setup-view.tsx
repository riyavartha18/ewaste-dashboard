"use client";

import { FormEvent, useState } from "react";
import { Brand } from "@/components/brand";
import {
  ArrowRight,
  Lock,
  Mail,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

interface Props {
  onCreated: () => void;
  navigate: (to: string) => void;
}

export function OwnerSetupView({ onCreated, navigate }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not create owner account.");
      } else {
        // Surface a success message — owner account created. The user must
        // now sign in via the login form.
        await onCreated();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAF5]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left — pastel green accent panel */}
        <div className="relative hidden flex-col justify-between bg-[#E4F0DF] p-12 lg:flex">
          <Brand size="lg" />
          <div className="space-y-4">
            <h2 className="max-w-md text-3xl font-semibold leading-tight text-[#355844]">
              Create the single owner account.
            </h2>
            <p className="max-w-md text-sm text-[#355844]/80">
              This portal runs without Supabase — files and submission metadata are
              stored on your own server. The first account you create becomes the
              sole owner with upload, edit and publish privileges. After this step,
              no one else can register.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#355844]">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Files stored under <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[12px]">./storage/</code>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Passwords hashed with scrypt (Node built-in)
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Owner-only writes — enforced on the backend
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Public professor portal at <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[12px]">/#/public</code>
              </li>
            </ul>
          </div>
          <p className="text-xs text-[#355844]/70">
            Sustainable academic workflow · {new Date().getFullYear()}
          </p>
        </div>

        {/* Right — bootstrap form */}
        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <Brand size="md" showSubtitle />
            </div>

            <div className="ew-card p-8">
              <h1 className="text-xl font-semibold text-[#355844]">Bootstrap owner</h1>
              <p className="mt-1 text-sm text-[#6B7869]">
                Pick an email and password for your single owner account. You will
                use these to sign in afterwards.
              </p>

              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#355844]">
                    Display name <span className="text-[#6B7869]">(optional)</span>
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7869]" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="ew-input pl-9"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#355844]">
                    Owner Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7869]" />
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="ew-input pl-9"
                      placeholder="you@university.edu"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#355844]">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7869]" />
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="ew-input pl-9"
                        placeholder="At least 6 chars"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#355844]">
                      Confirm
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7869]" />
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="ew-input pl-9"
                        placeholder="Re-type"
                        required
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-[#F6E4DC] bg-[#FBF1ED] px-3 py-2 text-xs text-[#B8613C]">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="ew-btn-forest w-full"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Create owner account
                </button>

                <div className="flex items-start gap-2 rounded-lg border border-[#C8DEC1] bg-[#E4F0DF]/60 px-3 py-2 text-xs text-[#355844]">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  <span>
                    After this account exists, the <code className="rounded bg-white/70 px-1 font-mono text-[11px]">/api/setup</code> endpoint
                    refuses to create another one — no one else can register as owner.
                  </span>
                </div>
              </form>
            </div>

            <p className="mt-4 text-center text-xs text-[#6B7869]">
              Professor visiting?{" "}
              <button
                type="button"
                onClick={() => navigate("/public")}
                className="font-medium text-[#355844] underline"
              >
                Open the public portal
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
