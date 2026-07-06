import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import AgentChat from './pages/AgentChat';
import Teams from './pages/Teams';
import TeamChat from './pages/TeamChat';
import Settings from './pages/Settings';
import Research from './pages/Research';
import CreativeWriting from './pages/CreativeWriting';
import Portfolio from './pages/Portfolio';
import Cases from './pages/Cases';
import Staff from './pages/Staff';
import SharedKnowledge from './pages/SharedKnowledge';
import WhatsAppConnect from './pages/WhatsAppConnect';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/agents/:id" element={<AgentChat />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:id" element={<TeamChat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/research" element={<Research />} />
        <Route path="/writing" element={<CreativeWriting />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/knowledge" element={<SharedKnowledge />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/whatsapp" element={<WhatsAppConnect />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App