import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SearchProvider } from '../../stores/search';
import { UIProvider } from '../../stores/ui';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <UIProvider>
      <SearchProvider key={pathname}>
        <div className="min-h-screen bg-canvas">
          <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="lg:pl-[284px] lg:pr-10">
            <div className="mx-auto w-full max-w-[1596px] px-4 pb-10 sm:px-6 lg:px-0">
              <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
              <main className="pt-6">{children}</main>
            </div>
          </div>
        </div>
      </SearchProvider>
    </UIProvider>
  );
}
