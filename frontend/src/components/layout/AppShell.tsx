import clsx from 'clsx';
import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SearchProvider } from '../../stores/search';
import { UIProvider } from '../../stores/ui';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const isChat = pathname === '/ai-chat';

  return (
    <UIProvider>
      <SearchProvider key={pathname}>
        <div className={clsx('bg-canvas', isChat ? 'h-screen overflow-hidden flex flex-col' : 'min-h-screen')}>
          <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className={clsx('lg:pl-[284px] lg:pr-10', isChat && 'flex-1 flex flex-col min-h-0')}>
            <div
              className={clsx(
                'mx-auto w-full max-w-[1596px] px-4 sm:px-6 lg:px-0',
                isChat ? 'flex-1 flex flex-col min-h-0 pb-3' : 'pb-10',
              )}
            >
              <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
              <main className={clsx(isChat ? 'flex-1 min-h-0 flex flex-col pt-1' : 'pt-6')}>
                {children}
              </main>
            </div>
          </div>
        </div>
      </SearchProvider>
    </UIProvider>
  );
}
