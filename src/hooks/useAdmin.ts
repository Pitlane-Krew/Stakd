"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "./useAuth";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side hook to check if current user has an admin role.
 * This is for UI visibility only — actual access control happens
 * server-side in the admin layout and API routes.
 */
export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminRole(null);
      setError(null);
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("admin_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (fetchError) {
          console.error("Error checking admin role:", fetchError);
          setError(fetchError.message);
          setIsAdmin(false);
          setAdminRole(null);
        } else if (data?.role) {
          setIsAdmin(true);
          setAdminRole(data.role);
          setError(null);
        } else {
          setIsAdmin(false);
          setAdminRole(null);
          setError(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Error checking admin role:", errorMessage);
        setError(errorMessage);
        setIsAdmin(false);
        setAdminRole(null);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user, supabase]);

  return { isAdmin, adminRole, loading, error };
}
