import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Pencil, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AgentForm from '@/components/AgentForm';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    base44.entities.Agent.list().then(a => { setAgents(a); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    await base44.entities.Agent.delete(id);
    load();
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">Your AI specialists</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Agent
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : agents.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm mb-4">No agents yet. Create your first one.</p>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Create Agent
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map(agent => (
            <div key={agent.id} className="group flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => navigate(`/agents/${agent.id}`)}>
                <div className="w-2 h-8 rounded-full" style={{ background: agent.color || '#4A7FA5' }} />
                <div>
                  <p className="font-medium text-sm">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{agent.role_description || agent.model}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/agents/${agent.id}`)}>
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(agent); setShowForm(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(agent.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <AgentForm agent={editing} onClose={() => { setShowForm(false); load(); }} />}
    </div>
  );
}