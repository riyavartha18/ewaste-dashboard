"use client";

import { useHashRoute } from "@/hooks/use-hash-route";
import { useAuth } from "@/hooks/use-auth";
import { OwnerSetupView } from "@/components/views/owner-setup-view";
import { LoginView } from "@/components/views/login-view";
import { DashboardView } from "@/components/views/dashboard-view";
import { AddSubmissionView } from "@/components/views/add-submission-view";
import { EditSubmissionView } from "@/components/views/edit-submission-view";
import { SubmissionDetailsView } from "@/components/views/submission-details-view";
import { PublicPortalView } from "@/components/views/public-portal-view";
import { Loader2 } from "lucide-react";
import { Brand } from "@/components/brand";

export default function Home() {
  const [route, navigate] = useHashRoute();
  const auth = useAuth();

  // --- Routing logic ------------------------------------------------------
  // Hash format examples:
  //   #/login            → owner sign-in (discreet; linked from public portal)
  //   #/setup            → one-time owner bootstrap (only if no owner exists)
  //   #/dashboard        → owner dashboard (signed in only)
  //   #/dashboard/new
  //   #/dashboard/submissions/<id>
  //   #/dashboard/edit/<id>
  //   #/public           → public professor portal (the DEFAULT LANDING)
  //   #/public/submissions/<id>
  const seg0 = route.segments[0] ?? ""; // "", "login", "setup", "dashboard", "public"
  const seg1 = route.segments[1] ?? "";
  const seg2 = route.segments[2] ?? "";

  // ---- Render phase 1: still loading -------------------------------------
  if (auth.loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Brand size="lg" showSubtitle />
        <div className="flex items-center gap-2 text-sm text-[#6B7869]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading portal…</span>
        </div>
      </div>
    );
  }

  // ---- Render phase 2: explicit one-time bootstrap ----------------------
  // Only shown if someone explicitly navigates to #/setup AND there is no
  // owner account yet. With OWNER_EMAIL + OWNER_PASSWORD set in .env, the
  // owner is auto-created on first /api/config call, so this view is rarely
  // reached — it remains as a fallback for env-less local dev.
  if (seg0 === "setup") {
    if (auth.hasOwner) {
      // Owner already exists — bounce to login.
      navigate("/login");
      return null;
    }
    return <OwnerSetupView navigate={navigate} onCreated={() => auth.refresh()} />;
  }

  // ---- Render phase 3: explicit login route ------------------------------
  if (seg0 === "login") {
    if (!auth.hasOwner) {
      // No owner yet — send to bootstrap.
      navigate("/setup");
      return null;
    }
    if (auth.session?.user) {
      navigate("/dashboard");
      return null;
    }
    return <LoginView navigate={navigate} />;
  }

  // ---- Render phase 4: owner dashboard area (signed-in only) ------------
  if (seg0 === "dashboard") {
    if (!auth.session?.user) {
      // Not signed in — bounce to the public portal (the discreet "Owner
      // Sign In" button there lets the user reach the login form).
      navigate("/public");
      return null;
    }
    if (seg1 === "new") {
      return <AddSubmissionView navigate={navigate} auth={auth} />;
    }
    if (seg1 === "edit" && seg2) {
      return <EditSubmissionView id={seg2} navigate={navigate} auth={auth} />;
    }
    if (seg1 === "submissions" && seg2) {
      return <SubmissionDetailsView id={seg2} navigate={navigate} auth={auth} />;
    }
    return <DashboardView navigate={navigate} auth={auth} />;
  }

  // ---- Render phase 5: default landing — public portal ------------------
  // Root (`/` or empty hash), `#/public`, and `#/public/submissions/<id>`.
  const initialId = seg0 === "public" && seg1 === "submissions" ? seg2 : "";
  return <PublicPortalView initialId={initialId} onNavigate={navigate} />;
}
