import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
const COLORS = ['#4A7FA5', '#6B8E5A', '#B5739E', '#C77D4A', '#7B6CB0', '#5A8B8B'];

export default function AgentForm({ agent, onClose }) {
  const [name, setName] = useState(agent?.name || '');
  const [roleDescription, setRoleDescription] = useState(agent?.role_description || '');
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt || '');
  const [model, setModel] = useState(agent?.model || 'gpt-4o');
  const [color, setColor] = useState(agent?.color || '#4A7FA5');
  const [tools, setTools] = useState(agent?.tools_enabled || { web_search: false, gmail_read: false, gmail_send: false, memory: true });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data = { name, role_description: roleDescription, system_prompt: systemPrompt, model, color, tools_enabled: tools };
    if (agent) {
      await base44.entities.Agent.update(agent.id, data);
    } else {
      await base44.entities.Agent.create(data);
    }
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agent ? 'Edit Agent' : 'New Agent'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Research Assistant" className="mt-1" />
          </div>
          <div>
            <Label>Role Description</Label>
            <Input value={roleDescription} onChange={e => setRoleDescription(e.target.value)} placeholder="Short description of what this agent does" className="mt-1" />
          </div>
          <div>
            <Label>System Prompt</Label>
            <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={5} placeholder="Define the agent's behavior, personality, and instructions..." className="mt-1" />
          </div>
          <div>
            <Label>Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-colors ${color === c ? 'border-foreground' : 'border-transparent'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div>
            <Label>Tools</Label>
            <div className="space-y-2 mt-2">
              {[
                { key: 'web_search', label: 'Web Search' },
                { key: 'gmail_read', label: 'Gmail Read' },
                { key: 'gmail_send', label: 'Gmail Send' },
                { key: 'memory', label: 'Memory (auto-summarize conversations)' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox checked={tools[key] || false} onCheckedChange={v => setTools({ ...tools, [key]: v })} id={key} />
                  <label htmlFor={key} className="text-sm cursor-pointer">{label}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name || !systemPrompt}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}