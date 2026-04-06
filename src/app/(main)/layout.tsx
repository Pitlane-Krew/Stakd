import Navbar from "@/components/layout/Navbar";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileTabBar from "@/components/layout/MobileTabBar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar — hidden on mobile via its own classes */}
      <Navbar />

      {/* Mobile top header — hidden on desktop via its own classes */}
      <MobileHeader />

      {/* Main content — single instance, responsive padding */}
      <main className="flex-1 px-4 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:px-6 lg:pt-6 lg:pb-6 overflow-y-auto">
        {children}
      </main>

      {/* Mobile bottom tab bar — hidden on desktop via its own classes */}
      <MobileTabBar />
    </div>
  );
}
