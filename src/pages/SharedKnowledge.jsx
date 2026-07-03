import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, BookOpen, ExternalLink, Upload } from 'lucide-react';
import SharedKnowledgeForm from '@/components/SharedKnowledgeForm';
import SharedKnowledgeBulkUpload from '@/components/SharedKnowledgeBulkUpload';

export default function SharedKnowledge() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [filter, setFilter] = useState('All');

  const load = async () => {
    setLoading(true);
    const all = await base44.entities.SharedKnowledgeBase.list('-updated_date');
    setResources(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await base44.entities.SharedKnowledgeBase.delete(pendingDelete);
    setPendingDelete(null);
    load();
  };

  const allTags = ['All', ...new Set(resources.flatMap(r => r.tags || []))];
  const filtered = filter === 'All' ? resources : resources.filter(r => (r.tags || []).includes(filter));

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shared Knowledge</h1>
          <p className="text-sm text-muted-foreground mt-1">A library of vetted resources for your team</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulk(true)}><Upload className="w-4 h-4 mr-1" /> Bulk Upload</Button>
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Add Resource</Button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {allTags.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${filter === c ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground hover:bg-accent/70'}`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No resources yet. Add one to share with your team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(r => (
            <div key={r.id} className="p-4 border border-border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{r.title}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(r.tags || []).map(tag => (
                      <span key={tag} className="text-xs bg-accent px-2 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPendingDelete(r.id)} className="shrink-0"><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
              {r.description && <p className="text-sm text-muted-foreground mb-3">{r.description}</p>}
              <a href={r.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                View file <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      )}

      {showForm && <SharedKnowledgeForm onClose={() => { setShowForm(false); load(); }} />}

      {showBulk && <SharedKnowledgeBulkUpload onClose={() => { setShowBulk(false); load(); }} />}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resource?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the resource from the shared library.</AlertDialogDescription>
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