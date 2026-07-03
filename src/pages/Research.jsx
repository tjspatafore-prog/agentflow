import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Plus, Trash2, ArrowLeft, ExternalLink, Download, Filter, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';

export default function Research() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ topic: '', abstract: '', full_content: '', source_url: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [agentFilter, setAgentFilter] = useState('all');
  const [autoFilter, setAutoFilter] = useState('all');
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Research.list('-created_date', 100);
    setItems(data);
    setLoading(false);
  };

  const agentNames = [...new Set(items.map(i => i.agent_name).filter(Boolean))];

  const filtered = items.filter(item => {
    if (agentFilter !== 'all' && item.agent_name !== agentFilter) return false;
    if (autoFilter === 'auto' && !item.is_auto) return false;
    if (autoFilter === 'manual' && item.is_auto) return false;
    return true;
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (agentFilter !== 'all') params.set('agent_name', agentFilter);
      if (autoFilter === 'auto') params.set('auto', 'true');
      const response = await fetch(`/api/functions/downloadResearchManifest?${params.toString()}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-manifest-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
    setDownloading(false);
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
        <div className="flex items-center gap-3 mb-4">
          {selected.source_url && (
            <a href={selected.source_url} target="_blank" rel="noreferrer" className="text-sm text-primary flex items-center gap-1 hover:underline">
              <ExternalLink className="w-3 h-3" /> View Source
            </a>
          )}
          {selected.is_auto && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" /> Auto-research
            </span>
          )}
          {selected.agent_name && <span className="text-xs text-muted-foreground">by {selected.agent_name}</span>}
        </div>
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
        <div className="mt-8 flex gap-2">
          <Button variant="outline" onClick={() => handleDownload()}>
            <Download className="w-4 h-4" /> Download
          </Button>
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
          <p className="text-sm text-muted-foreground">Synthesized research and auto-generated findings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={downloading || filtered.length === 0}>
            <Download className="w-4 h-4" /> {downloading ? 'Preparing...' : 'Download'}
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> New Entry
          </Button>
        </div>
      </div>

      {/* Filters */}
      {agentNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" /> Filter
          </div>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-[180px] h-8"><SelectValue placeholder="All agents" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {agentNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={autoFilter} onValueChange={setAutoFilter}>
            <SelectTrigger className="w-[150px] h-8"><SelectValue placeholder="All sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="auto">Auto-research</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {items.length}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No research entries yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="p-4 border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => setSelected(item)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{item.topic}</h3>
                    {item.is_auto && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                        <Clock className="w-2.5 h-2.5" /> Auto
                      </span>
                    )}
                  </div>
                  {item.agent_name && <p className="text-xs text-muted-foreground mt-0.5">by {item.agent_name}</p>}
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