import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Pencil, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import AgentForm from '@/components/AgentForm';

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'admin';
  const visibleAgents = isAdmin ? agents : agents.filter(a => (a.assigned_user_ids || []).includes(currentUser?.id));

  const load = () => {
    base44.entities.Agent.list().then(a => { setAgents(a); setLoading(false); });
  };

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    load();
  }, []);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await base44.entities.Agent.delete(pendingDelete);
    setPendingDelete(null);
    load();
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">Your AI specialists</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }} size="sm">
            <Plus className="w-4 h-4 mr-1" /> New Agent
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : visibleAgents.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">{isAdmin ? 'No agents yet. Create your first one.' : 'No agents have been assigned to you yet.'}</p>
          {isAdmin && (
            <Button onClick={() => { setEditing(null); setShowForm(true); }} className="mt-4">
              <Plus className="w-4 h-4 mr-1" /> Create Agent
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleAgents.map(agent => {
            const color = agent.color || '#4A7FA5';
            const isDevotional = (agent.name || '').toLowerCase().includes('devotional') || (agent.role_description || '').toLowerCase().includes('devotional');
            const lastActive = timeAgo(agent.updated_date);
            return (
              <div key={agent.id} className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => navigate(`/agents/${agent.id}`)}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                        <Sparkles className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{agent.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{agent.role_description || agent.model}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditing(agent); setShowForm(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPendingDelete(agent.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isDevotional ? 'bg-orange-500/10 text-orange-600' : 'bg-primary/10 text-primary'}`}>
                      {isDevotional ? 'Devotional' : 'Therapy'}
                    </span>
                    {lastActive && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" /> {lastActive}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <AgentForm agent={editing} onClose={() => { setShowForm(false); load(); }} />}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The agent and all its conversations will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}