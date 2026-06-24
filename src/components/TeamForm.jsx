import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function TeamForm({ team, onClose }) {
  const [name, setName] = useState(team?.name || '');
  const [description, setDescription] = useState(team?.description || '');
  const [selectedAgents, setSelectedAgents] = useState(team?.agent_ids || []);
  const [agents, setAgents] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { base44.entities.Agent.list().then(setAgents); }, []);

  const toggleAgent = (id) => {
    setSelectedAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { name, description, agent_ids: selectedAgents };
    if (team) {
      await base44.entities.Team.update(team.id, data);
    } else {
      await base44.entities.Team.create(data);
    }
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{team ? 'Edit Team' : 'New Team'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Team Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Content Team" className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What does this team work on?" className="mt-1" />
          </div>
          <div>
            <Label>Select Agents ({selectedAgents.length} selected)</Label>
            <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
              {agents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No agents available. Create agents first.</p>
              ) : agents.map(agent => (
                <div key={agent.id} onClick={() => toggleAgent(agent.id)}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedAgents.includes(agent.id) ? 'border-primary bg-accent' : 'border-border hover:border-primary/30'
                  }`}>
                  <div className="w-2 h-6 rounded-full" style={{ background: agent.color || '#4A7FA5' }} />
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.role_description || agent.model}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name || selectedAgents.length < 1}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}