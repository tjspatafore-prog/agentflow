import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Pencil, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import AgentForm from '@/components/AgentForm';

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
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
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
        <div className="space-y-2">
          {visibleAgents.map(agent => (
            <div key={agent.id} className="group flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => navigate(`/agents/${agent.id}`)}>
                <div className="w-9 h-9 rounded-lg shrink-0" style={{ background: agent.color || '#4A6761' }} />
                <div>
                  <p className="font-medium text-sm">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{agent.role_description || agent.model}</p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/agents/${agent.id}`)}>
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(agent); setShowForm(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPendingDelete(agent.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
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