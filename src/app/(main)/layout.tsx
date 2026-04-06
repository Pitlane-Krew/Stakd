import Navbar from "@/components/layout/Navbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
