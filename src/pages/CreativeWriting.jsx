import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { PenLine, Plus, Trash2, ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';

const STATUS_OPTIONS = [
  { value: 'idea', label: 'Idea', color: 'bg-blue-100 text-blue-700' },
  { value: 'drafting', label: 'Drafting', color: 'bg-amber-100 text-amber-700' },
  { value: 'revising', label: 'Revising', color: 'bg-purple-100 text-purple-700' },
  { value: 'final', label: 'Final', color: 'bg-green-100 text-green-700' },
];

export default function CreativeWriting() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ project_title: '', content: '', genre: '', outline_notes: '', status: 'drafting' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.CreativeWriting.list('-updated_date', 50);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.CreativeWriting.create(form);
    setSaving(false);
    setShowForm(false);
    setForm({ project_title: '', content: '', genre: '', outline_notes: '', status: 'drafting' });
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.CreativeWriting.delete(id);
    if (selected?.id === id) setSelected(null);
    load();
  };

  const handleUpdate = async (id, data) => {
    await base44.entities.CreativeWriting.update(id, data);
    setSelected({ ...selected, ...data });
    load();
  };

  const getStatusBadge = (status) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[1];
    return <span className={`px-2 py-0.5 text-xs rounded font-medium ${opt.color}`}>{opt.label}</span>;
  };

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={() => setSelected(null)} className="mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Button>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-heading font-semibold">{selected.project_title}</h1>
          {getStatusBadge(selected.status)}
        </div>
        {selected.genre && <p className="text-sm text-muted-foreground mb-4">{selected.genre}</p>}
        {selected.outline_notes && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground font-medium mb-1">Outline Notes</p>
            <p className="text-sm whitespace-pre-wrap">{selected.outline_notes}</p>
          </div>
        )}
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{selected.content || ''}</ReactMarkdown>
        </div>
        <div className="mt-8 flex items-center gap-3">
          <Select value={selected.status} onValueChange={(v) => handleUpdate(selected.id, { status: v })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleDelete(selected.id)}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Creative Writing</h1>
          <p className="text-sm text-muted-foreground">Your books, stories, and writing projects</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No writing projects yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(item => (
            <div key={item.id} className="p-4 border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => setSelected(item)}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium">{item.project_title}</h3>
                {getStatusBadge(item.status)}
              </div>
              {item.genre && <p className="text-xs text-muted-foreground mb-2">{item.genre}</p>}
              {item.content && <p className="text-sm text-muted-foreground line-clamp-3">{item.content.replace(/[#*]/g, '')}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Writing Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Project Title</Label>
              <Input value={form.project_title} onChange={e => setForm({...form, project_title: e.target.value})} className="mt-1" placeholder="e.g., The Last Frontier" />
            </div>
            <div>
              <Label>Genre</Label>
              <Input value={form.genre} onChange={e => setForm({...form, genre: e.target.value})} className="mt-1" placeholder="e.g., Sci-fi, Literary, Thriller" />
            </div>
            <div>
              <Label>Outline Notes</Label>
              <Textarea value={form.outline_notes} onChange={e => setForm({...form, outline_notes: e.target.value})} className="mt-1" rows={3} placeholder="Plot points, character arcs, world-building..." />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="mt-1 font-mono text-sm" rows={10} placeholder="Begin writing... (markdown supported)" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.project_title || saving}>{saving ? 'Saving...' : 'Create Project'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}