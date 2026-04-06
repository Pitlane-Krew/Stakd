import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin-auth";
import AdminShell from "@/components/admin/AdminShell";

/**
 * Admin layout — server component.
 * Checks admin role on every render. No role = redirect to /dashboard.
 * This is the second line of defense after middleware.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAdminContext();

  if (!ctx) {
    redirect("/dashboard");
  }

  return (
    <AdminShell role={ctx.role}>
      {children}
    </AdminShell>
  );
}
