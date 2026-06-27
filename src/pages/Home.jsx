import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FolderOpen, Sparkles, MessageSquare, ArrowRight, Plus } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [agents, setAgents] = useState([]);
  const [cases, setCases] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.Agent.list(),
      base44.entities.ClientCase.list('-updated_date'),
      base44.entities.Conversation.list('-updated_date', 5)
    ]).then(([u, a, c, convs]) => {
      setUser(u);
      const visibleAgents = u.role === 'admin' ? a : a.filter(ag => (ag.assigned_user_ids || []).includes(u.id));
      const visibleCases = u.role === 'admin' ? c : c.filter(cs => cs.counselor_id === u.id);
      setAgents(visibleAgents);
      setCases(visibleCases.filter(cs => cs.status === 'active'));
      setConversations(convs);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}</h1>
        <p className="text-muted-foreground text-sm">Your counseling AI workspace</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'My Agents', value: agents.length, icon: Sparkles, link: '/agents' },
          { label: 'Active Cases', value: cases.length, icon: FolderOpen, link: '/cases' },
          { label: 'Recent Sessions', value: conversations.length, icon: MessageSquare, link: '/agents' },
        ].map(({ label, value, icon: Icon, link }) => (
          <Link key={label} to={link} className="p-4 border border-border rounded-lg hover:border-primary/40 transition-colors">
            <Icon className="w-4 h-4 text-muted-foreground mb-2" />
            <p className="text-2xl font-semibold">{loading ? '—' : value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Link>
        ))}
      </div>

      <div className="space-y-3 mb-10">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
        <Link to="/agents" className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm">Start a session with an agent</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/cases" className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3">
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-sm">Add a client case</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>

      {cases.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Active Cases</h2>
          <div className="space-y-2">
            {cases.slice(0, 4).map(c => (
              <Link key={c.id} to="/cases" className="block p-3 border border-border rounded-lg hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{c.client_name}</p>
                  <span className="text-xs text-muted-foreground capitalize">{c.status}</span>
                </div>
                {c.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.summary}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {conversations.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Recent Sessions</h2>
          <div className="space-y-2">
            {conversations.map(c => (
              <Link key={c.id} to={c.agent_id ? `/agents/${c.agent_id}` : '/agents'} className="block p-3 border border-border rounded-lg hover:border-primary/40 transition-colors">
                <p className="text-sm font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.summary || `${(c.messages || []).length} messages`}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}