import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FolderOpen, Sparkles, MessageSquare, ArrowRight, Plus, BookOpen, ExternalLink, Clock, ChevronDown } from 'lucide-react';

const STATUS_COLORS = {
  active: 'bg-primary',
  closed: 'bg-muted-foreground',
  referred: 'bg-chart-3',
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [agents, setAgents] = useState([]);
  const [cases, setCases] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [featuredResources, setFeaturedResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResources, setShowResources] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.Agent.list(),
      base44.entities.ClientCase.list('-updated_date'),
      base44.entities.Conversation.list('-updated_date', 5),
      base44.entities.SharedKnowledgeBase.list('-updated_date', 6)
    ]).then(([u, a, c, convs, resources]) => {
      setUser(u);
      const visibleAgents = u.role === 'admin' ? a : a.filter(ag => (ag.assigned_user_ids || []).includes(u.id));
      const visibleCases = u.role === 'admin' ? c : c.filter(cs => cs.counselor_id === u.id);
      setAgents(visibleAgents);
      setCases(visibleCases.filter(cs => cs.status === 'active'));
      setConversations(convs);
      setFeaturedResources(resources || []);
      setLoading(false);
    });
  }, []);

  const totalCases = cases.length;
  const openCases = cases.filter(c => c.status === 'active').length;
  const progressPct = totalCases > 0 ? Math.round((openCases / totalCases) * 100) : 0;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}</h1>
        <p className="text-muted-foreground text-sm">Your counseling AI workspace</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'My Agents', value: agents.length, icon: Sparkles, link: '/agents' },
          { label: 'Active Cases', value: cases.length, icon: FolderOpen, link: '/cases' },
          { label: 'Recent Sessions', value: conversations.length, icon: MessageSquare, link: '/agents' },
        ].map(({ label, value, icon: Icon, link }) => (
          <Link key={label} to={link} className="p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-accent-foreground" />
            </div>
            <p className="text-2xl font-semibold">{loading ? '—' : value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* Action Center — Cases & Sessions */}
      <div className="mb-8">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Action Center</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cases column */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Active Cases</h3>
              </div>
              <Link to="/cases" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Active workload</span>
                <span>{openCases} open</span>
              </div>
              <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            {cases.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No active cases</p>
            ) : (
              <div className="space-y-2">
                {cases.slice(0, 3).map(c => (
                  <Link key={c.id} to="/cases" className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[c.status] || 'bg-muted-foreground'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.client_name}</p>
                      {c.summary && <p className="text-xs text-muted-foreground truncate">{c.summary}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sessions column */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Recent Sessions</h3>
              </div>
              <Link to="/agents" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No recent sessions</p>
            ) : (
              <div className="space-y-2">
                {conversations.slice(0, 3).map(c => (
                  <Link key={c.id} to={c.agent_id ? `/agents/${c.agent_id}` : '/agents'} className="block p-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.summary || `${(c.messages || []).length} messages`}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</h2>
        <Link to="/agents" className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium">Start a session with an agent</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/cases" className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium">Add a client case</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Featured Resources — collapsible */}
      {featuredResources.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowResources(!showResources)} className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Featured Resources</span>
              <span className="text-xs text-muted-foreground">{featuredResources.length}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showResources ? 'rotate-180' : ''}`} />
          </button>
          {showResources && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 fade-in">
              {featuredResources.slice(0, 6).map(r => (
                <a key={r.id} href={r.file_url} target="_blank" rel="noreferrer" className="flex items-start gap-3 p-3 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    {r.tags && r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] bg-accent px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}