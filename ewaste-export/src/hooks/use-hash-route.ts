"use client";

import { useEffect, useState, useCallback } from "react";

export interface Route {
  path: string;          // e.g. "/dashboard"
  segments: string[];   // e.g. ["dashboard"]
  query: URLSearchParams;
  hash: string;          // full hash without the leading '#'
}

function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "") || "/";
  const [path, queryString = ""] = raw.split("?");
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  return {
    path: normalisedPath,
    segments: normalisedPath.split("/").filter(Boolean),
    query: new URLSearchParams(queryString),
    hash: raw,
  };
}

export function useHashRoute(): [Route, (to: string) => void] {
  const [route, setRoute] = useState<Route>(() =>
    parseHash(typeof window !== "undefined" ? window.location.hash : ""),
  );

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    // Initial sync in case the hash changed before hydration.
    setRoute(parseHash(window.location.hash));
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    const target = to.startsWith("#") ? to : `#${to}`;
    if (window.location.hash === target) {
      // Force update if user navigates to the same hash again.
      setRoute(parseHash(target));
    } else {
      window.location.hash = target;
    }
  }, []);

  return [route, navigate];
}
