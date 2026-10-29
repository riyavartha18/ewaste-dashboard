"use client";

import { FormEvent, useState } from "react";
import { Brand } from "@/components/brand";
import {
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Recycle,
  Eye,
  EyeOff,
} from "lucide-react";
import { persistAuthAfterLogin } from "@/hooks/use-auth";

interface Props {
  navigate: (to: string) => void;
  onBootstrapOwner?: () => void;
}

export function LoginView({ navigate, onBootstrapOwner }: Props) {
  const [email, setEmail] = useState("riya.vartha18@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Invalid email or password.");
      } else if (data?.user && data?.token) {
        // Store JWT in localStorage and install the fetch interceptor so
        // the very next request includes the Authorization header.
        persistAuthAfterLogin(data.token, data.user);
        // Hard reload at the dashboard URL. Page.tsx will see the JWT in
        // localStorage (via useAuth's optimistic read) and route to
        // /#/dashboard.
        window.location.hash = "#/dashboard";
        window.location.reload();
      } else {
        setError("Sign-in failed. Try again.");
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
              My E-Waste coursework, assignments and academic submissions.
            </h2>
            <p className="max-w-md text-sm text-[#355844]/80">
              A private dashboard to upload, organise and share your E-Waste coursework
              with your professor — and a clean, read-only portal link they can open
              without logging in.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#355844]">
              <li className="flex items-center gap-2">
                <Recycle className="h-4 w-4" /> Persistent storage on the server filesystem
              </li>
              <li className="flex items-center gap-2">
                <Recycle className="h-4 w-4" /> Owner-only management controls
              </li>
              <li className="flex items-center gap-2">
                <Recycle className="h-4 w-4" /> Auth-checked file serving (owner or published)
              </li>
            </ul>
          </div>
          <p className="text-xs text-[#355844]/70">
            Sustainable academic workflow · {new Date().getFullYear()}
          </p>
        </div>

        {/* Right — login form */}
        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <Brand size="md" showSubtitle />
            </div>

            <div className="ew-card p-8">
              <h1 className="text-xl font-semibold text-[#355844]">Owner sign in</h1>
              <p className="mt-1 text-sm text-[#6B7869]">
                Sign in with the owner email and password you set up.
              </p>

              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#355844]">
                    Email
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

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#355844]">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7869]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="ew-input pl-9 pr-9"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-[#6B7869] hover:bg-[#E3EAE0] hover:text-[#355844]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div role="alert" className="flex items-start gap-2 rounded-lg border border-[#F6E4DC] bg-[#FBF1ED] px-3 py-3 text-sm text-[#B8613C]">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                    <div className="flex-1">
                      <div className="font-medium">Sign-in failed</div>
                      <div className="mt-0.5 text-xs text-[#B8613C]/80">{error}</div>
                      <div className="mt-1 text-[11px] text-[#B8613C]/70">
                        Check that the email is exactly <code className="rounded bg-white px-1 font-mono">riya.vartha18@gmail.com</code> and the password is at least 6 characters. Use the eye icon to reveal what you typed.
                      </div>
                    </div>
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
                  Sign in
                </button>
              </form>

              {onBootstrapOwner && (
                <p className="mt-4 text-center text-xs text-[#6B7869]">
                  No owner account yet?{" "}
                  <button
                    type="button"
                    onClick={onBootstrapOwner}
                    className="font-medium text-[#355844] underline"
                  >
                    Create the first owner account
                  </button>
                </p>
              )}
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
