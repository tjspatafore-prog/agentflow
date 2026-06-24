import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Sparkles, Users, Settings, FileText, PenLine } from 'lucide-react';

const NAV = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/agents', label: 'Agents', icon: Sparkles },
  { path: '/teams', label: 'Teams', icon: Users },
  { path: '/research', label: 'Research', icon: FileText },
  { path: '/writing', label: 'Writing', icon: PenLine },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="flex h-screen">
      <aside className="hidden md:flex flex-col w-60 bg-sidebar border-r border-sidebar-border shrink-0">
        <div className="px-6 py-6">
          <h1 className="text-lg font-semibold text-sidebar-foreground tracking-tight">Nexus AI</h1>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map(({ path, label, icon: Icon }) => {
            const active = pathname === path;
            return (
              <Link key={path} to={path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex justify-around py-2 z-50">
        {NAV.map(({ path, label, icon: Icon }) => {
          const active = pathname === path;
          return (
            <Link key={path} to={path}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors ${
                active ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground'
              }`}>
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}