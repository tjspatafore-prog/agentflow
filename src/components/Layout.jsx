import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Sparkles, Users, Settings, FileText, PenLine, FolderOpen, UserCog, BookOpen, Leaf, LayoutDashboard, MessageCircle } from 'lucide-react';

const NAV = [
{ path: '/', label: 'Home', icon: Home },
{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
{ path: '/agents', label: 'Agents', icon: Sparkles },
{ path: '/teams', label: 'Teams', icon: Users },
{ path: '/cases', label: 'Cases', icon: FolderOpen },
{ path: '/knowledge', label: 'Knowledge', icon: BookOpen },
{ path: '/staff', label: 'Staff', icon: UserCog },
{ path: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
{ path: '/research', label: 'Research', icon: FileText },
{ path: '/writing', label: 'Writing', icon: PenLine },
{ path: '/settings', label: 'Settings', icon: Settings }];


export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="flex h-screen">
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border shrink-0">
        <div className="px-6 py-7 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary/10 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-sidebar-primary" />
          </div>
          <h1 className="text-lg font-semibold text-sidebar-foreground tracking-tight [font-family:'Architects_Daughter',_system-ui]">Authentically Unique AI</h1>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ path, label, icon: Icon }) => {
            const active = pathname === path;
            return (
              <Link key={path} to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              active ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`
              }>
                <Icon className="w-4 h-4" />
                {label}
              </Link>);

          })}
        </nav>
        <div className="px-6 py-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/40">Counseling AI Platform</p>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex overflow-x-auto py-2 z-50 px-2">
        {NAV.map(({ path, label, icon: Icon }) => {
          const active = pathname === path;
          return (
            <Link key={path} to={path}
            className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors shrink-0 ${
            active ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'}`
            }>
              <Icon className="w-5 h-5" />
              {label}
            </Link>);

        })}
      </nav>
    </div>);

}