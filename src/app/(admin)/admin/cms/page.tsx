import { createServiceRoleClient } from "@/lib/supabase/server";
import { FileText, Globe, BellRing, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";

async function getCmsData() {
  const supabase = await createServiceRoleClient();

  const [pagesRes, announcementsRes] = await Promise.all([
    supabase.from("cms_pages").select("*").order("slug"),
    supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(10),
  ]);

  return {
    pages: pagesRes.data ?? [],
    announcements: announcementsRes.data ?? [],
  };
}

const PAGE_LABELS: Record<string, string> = {
  home: "Home Page",
  about: "About",
  faq: "FAQ",
  terms: "Terms of Service",
  privacy: "Privacy Policy",
};

export default async function CmsPage() {
  const { pages, announcements } = await getCmsData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-white/50" />
          Content Management
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Edit pages, announcements, and site content.
        </p>
      </div>

      {/* Pages */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Pages
        </h2>
        <div className="bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Page</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} className="border-b border-white/5 hover:bg-white/2">
                  <td className="px-4 py-3 text-sm font-medium text-white">
                    {PAGE_LABELS[page.slug] ?? page.title}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-white/40">/{page.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      page.is_published
                        ? "text-emerald-400 bg-emerald-400/10"
                        : "text-white/40 bg-white/5"
                    }`}>
                      {page.is_published ? <CheckCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                      {page.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">
                    {new Date(page.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/cms/pages/${page.slug}`}
                      className="text-xs text-[var(--color-accent)] hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Announcements */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
            <BellRing className="w-4 h-4" />
            Announcements
          </h2>
          <Link
            href="/admin/cms/announcements/new"
            className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-semibold hover:bg-[var(--color-accent)]/80 transition-colors"
          >
            + New Announcement
          </Link>
        </div>

        {announcements.length === 0 ? (
          <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-8 text-center">
            <BellRing className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => {
              const typeColors: Record<string, string> = {
                info: "text-blue-400 bg-blue-400/10",
                warning: "text-amber-400 bg-amber-400/10",
                maintenance: "text-red-400 bg-red-400/10",
                feature: "text-purple-400 bg-purple-400/10",
              };
              return (
                <div key={ann.id} className="bg-[#1a1a24] border border-white/10 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${typeColors[ann.type] ?? ""}`}>
                        {ann.type}
                      </span>
                      {ann.is_active && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white">{ann.title}</p>
                    {ann.body && <p className="text-xs text-white/50 mt-1">{ann.body}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-white/30">{new Date(ann.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
