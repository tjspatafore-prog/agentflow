import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageSquare, FolderOpen, Users, TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

const STATUS_COLORS = { active: '#4A6761', closed: '#8BA8B3', referred: '#C9876A' };

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [cases, setCases] = useState([]);
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.Conversation.list('-created_date', 500),
      base44.entities.ClientCase.list('-created_date', 500),
      base44.entities.Agent.list(),
      base44.entities.User.list()
    ]).then(([u, convs, cs, ags, us]) => {
      setUser(u);
      setConversations(convs);
      setCases(cs);
      setAgents(ags);
      setUsers(us);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-sm text-muted-foreground">Loading dashboard...</div>;

  if (user?.role !== 'admin') {
    return (
      <div className="p-10 max-w-2xl mx-auto text-center">
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-accent-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Team Dashboard</h1>
        <p className="text-sm text-muted-foreground">This dashboard is available to administrators only.</p>
      </div>
    );
  }

  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (13 - i));
    return d;
  });

  const convTrend = last14Days.map(d => {
    const dateStr = d.toISOString().split('T')[0];
    const count = conversations.filter(c => c.created_date && c.created_date.split('T')[0] === dateStr).length;
    return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), conversations: count };
  });

  const casesByStatus = ['active', 'closed', 'referred'].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: cases.filter(c => c.status === s).length,
    color: STATUS_COLORS[s]
  })).filter(s => s.value > 0);

  const staffActivity = users.map(u => ({
    name: (u.full_name || u.email || '').split(' ')[0],
    conversations: conversations.filter(c => c.created_by_id === u.id).length
  })).filter(s => s.conversations > 0).sort((a, b) => b.conversations - a.conversations).slice(0, 8);

  const agentUsage = agents.map(a => ({
    name: a.name,
    conversations: conversations.filter(c => c.agent_id === a.id).length
  })).filter(a => a.conversations > 0).sort((a, b) => b.conversations - a.conversations).slice(0, 8);

  const casesPerCounselor = users.map(u => ({
    name: (u.full_name || u.email || '').split(' ')[0],
    cases: cases.filter(c => c.counselor_id === u.id).length
  })).filter(c => c.cases > 0).sort((a, b) => b.cases - a.cases).slice(0, 8);

  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Team Dashboard</h1>
        <p className="text-sm text-muted-foreground">Usage trends and case progress across your team</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Sessions', value: conversations.length, icon: MessageSquare },
          { label: 'Active Cases', value: cases.filter(c => c.status === 'active').length, icon: FolderOpen },
          { label: 'Total Cases', value: cases.length, icon: TrendingUp },
          { label: 'Active Staff', value: staffActivity.length, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-5 bg-card border border-border rounded-xl shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-accent-foreground" />
            </div>
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="p-5 bg-card border border-border rounded-xl shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium">Agent Sessions — Last 14 Days</h2>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={convTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="conversations" fill="#4A6761" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium">Cases by Status</h2>
          </div>
          {casesByStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={casesByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {casesByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {casesByStatus.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-xs text-muted-foreground">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground text-center py-16">No cases yet</p>}
        </div>

        <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium">Staff Activity (by sessions)</h2>
          </div>
          {staffActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={staffActivity} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="conversations" fill="#8BA8B3" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-16">No activity yet</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium">Most Used Agents</h2>
          </div>
          {agentUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={agentUsage} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="conversations" fill="#4A6761" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-16">No agent usage yet</p>}
        </div>

        <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium">Cases per Counselor</h2>
          </div>
          {casesPerCounselor.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={casesPerCounselor} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cases" fill="#C9876A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-16">No cases assigned yet</p>}
        </div>
      </div>
    </div>
  );
}