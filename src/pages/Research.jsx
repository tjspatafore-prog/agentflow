import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Plus, Trash2, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';

export default function Research() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ topic: '', abstract: '', full_content: '', source_url: '', tags: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Research.list('-created_date', 50);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Research.create({
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    });
    setSaving(false);
    setShowForm(false);
    setForm({ topic: '', abstract: '', full_content: '', source_url: '', tags: '' });
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.Research.delete(id);
    if (selected?.id === id) setSelected(null);
    load();
  };

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={() => setSelected(null)} className="mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Archive
        </Button>
        <h1 className="text-2xl font-heading font-semibold mb-2">{selected.topic}</h1>
        {selected.source_url && (
          <a href={selected.source_url} target="_blank" rel="noreferrer" className="text-sm text-primary flex items-center gap-1 mb-4 hover:underline">
            <ExternalLink className="w-3 h-3" /> View Source
          </a>
        )}
        {selected.abstract && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground font-medium mb-1">Abstract</p>
            <p className="text-sm">{selected.abstract}</p>
          </div>
        )}
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{selected.full_content || ''}</ReactMarkdown>
        </div>
        {selected.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {selected.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded">{tag}</span>
            ))}
          </div>
        )}
        <div className="mt-8">
          <Button variant="outline" onClick={() => handleDelete(selected.id)}>
            <Trash2 className="w-4 h-4" /> Delete Entry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Research Archive</h1>
          <p className="text-sm text-muted-foreground">Synthesized research and academic findings</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Entry
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No research entries yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="p-4 border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => setSelected(item)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{item.topic}</h3>
                  {item.abstract && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.abstract}</p>}
                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Research Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Topic</Label>
              <Input value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} className="mt-1" placeholder="e.g., Neuroplasticity and meditation" />
            </div>
            <div>
              <Label>Abstract</Label>
              <Textarea value={form.abstract} onChange={e => setForm({...form, abstract: e.target.value})} className="mt-1" rows={2} placeholder="Brief summary of findings" />
            </div>
            <div>
              <Label>Full Content</Label>
              <Textarea value={form.full_content} onChange={e => setForm({...form, full_content: e.target.value})} className="mt-1 font-mono text-sm" rows={10} placeholder="Full synthesized research (markdown supported)" />
            </div>
            <div>
              <Label>Source URL</Label>
              <Input value={form.source_url} onChange={e => setForm({...form, source_url: e.target.value})} className="mt-1" placeholder="https://..." />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="mt-1" placeholder="neuroscience, epigenetics" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.topic || saving}>{saving ? 'Saving...' : 'Save Entry'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}