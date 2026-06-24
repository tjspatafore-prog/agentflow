import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, MessageSquare, Users, Sparkles, ArrowRight } from 'lucide-react';

export default function Home() {
  const [agents, setAgents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Agent.list(),
      base44.entities.Team.list(),
      base44.entities.Conversation.list('-updated_date', 5)
    ]).then(([a, t, c]) => {
      setAgents(a); setTeams(t); setConversations(c); setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Your personal AI agent workspace</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Agents', value: agents.length, icon: Sparkles },
          { label: 'Teams', value: teams.length, icon: Users },
          { label: 'Conversations', value: conversations.length, icon: MessageSquare },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-4 border border-border rounded-lg">
            <Icon className="w-4 h-4 text-muted-foreground mb-2" />
            <p className="text-2xl font-semibold">{loading ? '—' : value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 mb-10">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
        <Link to="/agents" className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3">
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-sm">Create a new agent</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/teams" className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3">
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-sm">Build a team</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>

      {conversations.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Recent Conversations</h2>
          <div className="space-y-2">
            {conversations.map(c => (
              <div key={c.id} className="p-3 border border-border rounded-lg">
                <p className="text-sm font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.summary || `${(c.messages || []).length} messages`}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}