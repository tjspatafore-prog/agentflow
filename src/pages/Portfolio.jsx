import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Briefcase, Trash2, Search, Loader2, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';

export default function Portfolio() {
  const [artifacts, setArtifacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.entities.Artifact.list('-created_date', 100).then(data => {
      setArtifacts(data);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id) => {
    await base44.entities.Artifact.delete(id);
    setArtifacts(prev => prev.filter(a => a.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const filtered = artifacts.filter(a =>
    !search ||
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.team_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.goal?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-10 text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Team Portfolio</h1>
          <p className="text-sm text-muted-foreground">Completed work and outputs from your teams</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, team, or goal..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No completed work yet. Assign a goal to a team to get started.</p>
          <Link to="/teams"><Button variant="outline" size="sm" className="mt-4">Go to Teams</Button></Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(a => (
            <div key={a.id} className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium text-sm line-clamp-2 flex-1 cursor-pointer hover:text-primary" onClick={() => setSelected(a)}>
                  {a.title}
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => handleDelete(a.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                {a.team_name && (
                  <Link to={`/teams/${a.team_id}`} className="text-xs text-primary hover:underline">{a.team_name}</Link>
                )}
                {a.status === 'in_progress' && (
                  <span className="flex items-center gap-1 text-xs text-amber-600"><Loader2 className="w-3 h-3 animate-spin" /> In Progress</span>
                )}
                {a.status === 'completed' && (
                  <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" /> Completed</span>
                )}
                {a.status === 'failed' && (
                  <span className="flex items-center gap-1 text-xs text-destructive"><X className="w-3 h-3" /> Failed</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{a.goal}</p>
              {a.content && (
                <p className="text-xs text-muted-foreground line-clamp-2 border-t border-border pt-2">
                  {a.content.replace(/[#*`]/g, '').substring(0, 120)}...
                </p>
              )}
              <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setSelected(a)}>View Details</Button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <div className="flex items-center gap-3 mt-1">
                  {selected.team_name && <Link to={`/teams/${selected.team_id}`} className="text-xs text-primary hover:underline">{selected.team_name}</Link>}
                  <span className="text-xs text-muted-foreground">{new Date(selected.created_date).toLocaleDateString()}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSelected(null)}><X className="w-4 h-4" /></Button>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Original Goal</p>
              <p className="text-sm">{selected.goal}</p>
            </div>

            {selected.trace && selected.trace.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Execution Trace</p>
                <div className="space-y-1.5">
                  {selected.trace.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground uppercase tracking-wide shrink-0">{step.step}</span>
                      {step.agent && <span className="text-primary font-medium">{step.agent}</span>}
                      <span className="text-muted-foreground">{step.description || step.task}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.content && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Final Output</p>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{selected.content}</ReactMarkdown>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button>
              <Button variant="destructive" size="sm" onClick={() => { handleDelete(selected.id); }}><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}