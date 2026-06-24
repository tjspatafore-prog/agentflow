import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Pencil, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TeamForm from '@/components/TeamForm';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    base44.entities.Team.list().then(t => { setTeams(t); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    await base44.entities.Team.delete(id);
    load();
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">Agent collectives that collaborate</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Team
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : teams.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm mb-4">No teams yet. Create your first one.</p>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Create Team
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {teams.map(team => (
            <div key={team.id} className="group flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(`/teams/${team.id}`)}>
              <div>
                <p className="font-medium text-sm">{team.name}</p>
                <p className="text-xs text-muted-foreground">{team.agent_ids?.length || 0} agents · {team.description || 'No description'}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(team); setShowForm(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(team.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <TeamForm team={editing} onClose={() => { setShowForm(false); load(); }} />}
    </div>
  );
}