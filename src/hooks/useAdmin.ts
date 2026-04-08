"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminRole(null);
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("admin_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (data?.role) {
          setIsAdmin(true);
          setAdminRole(data.role);
        } else {
          setIsAdmin(false);
          setAdminRole(null);
        }
      } catch {
        setIsAdmin(false);
        setAdminRole(null);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user]);

  return { isAdmin, adminRole, loading };
}
