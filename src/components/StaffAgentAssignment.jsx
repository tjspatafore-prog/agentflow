import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function StaffAgentAssignment({ user, agents, assignedAgentIds, onClose }) {
  const [selected, setSelected] = useState(assignedAgentIds);
  const [saving, setSaving] = useState(false);

  const toggle = (agentId) => {
    setSelected(prev => prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]);
  };

  const handleSave = async () => {
    setSaving(true);
    const toAdd = selected.filter(id => !assignedAgentIds.includes(id));
    const toRemove = assignedAgentIds.filter(id => !selected.includes(id));
    try {
      for (const agentId of toAdd) {
        const agent = agents.find(a => a.id === agentId);
        const newIds = [...(agent.assigned_user_ids || []), user.id];
        await base44.entities.Agent.update(agentId, { assigned_user_ids: newIds });
      }
      for (const agentId of toRemove) {
        const agent = agents.find(a => a.id === agentId);
        const newIds = (agent.assigned_user_ids || []).filter(id => id !== user.id);
        await base44.entities.Agent.update(agentId, { assigned_user_ids: newIds });
      }
    } catch (e) { /* ignore */ }
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Agents to {user.full_name || user.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agents available. Create agents first.</p>
          ) : agents.map(a => (
            <div key={a.id} className="flex items-center gap-2">
              <Checkbox checked={selected.includes(a.id)} onCheckedChange={() => toggle(a.id)} id={`agent-${a.id}`} />
              <label htmlFor={`agent-${a.id}`} className="text-sm cursor-pointer flex items-center gap-2 flex-1">
                <span className="w-2 h-4 rounded-full" style={{ background: a.color || '#4A7FA5' }} />
                {a.name}
              </label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}