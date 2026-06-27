import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';
import CaseForm from '@/components/CaseForm';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
  referred: 'bg-blue-100 text-blue-700'
};

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    const all = await base44.entities.ClientCase.list('-updated_date');
    const visible = user.role === 'admin' ? all : all.filter(c => c.counselor_id === user.id);
    setCases(visible);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await base44.entities.ClientCase.delete(pendingDelete);
    setPendingDelete(null);
    load();
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Client Cases</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage client notes and treatment summaries</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" /> New Case</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : cases.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No cases yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map(c => (
            <div key={c.id} className="p-4 border border-border rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{c.client_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || ''}`}>{c.status}</span>
                  </div>
                  {c.summary && <p className="text-sm text-muted-foreground mb-2">{c.summary}</p>}
                  {c.case_notes && <p className="text-sm text-muted-foreground line-clamp-2">{c.case_notes}</p>}
                  {c.tags?.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {c.tags.map(t => <span key={t} className="text-xs bg-accent px-2 py-0.5 rounded">{t}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setShowForm(true); }}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setPendingDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <CaseForm caseItem={editing} onClose={() => { setShowForm(false); load(); }} />}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this case?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The case and all its notes will be permanently removed.</AlertDialogDescription>
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