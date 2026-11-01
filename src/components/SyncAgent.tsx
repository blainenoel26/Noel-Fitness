"use client";

import { useEffect } from "react";
import { onSignedIn, syncNow } from "@/lib/store";
import { supabase } from "@/lib/supabase";

// Keeps local data and Supabase in step: on load, on sign-in, and when the
// device comes back online.
export default function SyncAgent() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const sb = supabase();
    if (!sb) return;
    void syncNow();
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setTimeout(() => void onSignedIn(), 0);
    });
    const online = () => void syncNow();
    window.addEventListener("online", online);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("online", online);
    };
  }, []);
  return null;
}
