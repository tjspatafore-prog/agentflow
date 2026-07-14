import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AgentTraining from '@/components/AgentTraining';
import AgentResearchConfig from '@/components/AgentResearchConfig';

const MODEL_GROUPS = [
  { label: 'OpenAI', models: [
    { value: 'gpt-5.6-sol', label: 'GPT-5.6 Sol', pricing: 'High cost' },
    { value: 'gpt-5.5', label: 'GPT-5.5', pricing: '$5 in / $30 out' },
    { value: 'gpt-5.4', label: 'GPT-5.4', pricing: '$2.50 in / $15 out' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', pricing: '$0.40 in / $1.60 out' },
  ]},
  { label: 'Anthropic Claude', models: [
    { value: 'claude-fable-5', label: 'Claude Fable 5', pricing: 'Mythos-class — high cost' },
    { value: 'claude-opus-4-8', label: 'Claude Opus 4.8', pricing: '$5 in / $25 out' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', pricing: '$3 in / $15 out' },
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', pricing: '$1 in / $5 out' },
  ]},
  { label: 'Google Gemini', models: [
    { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Preview)', pricing: '$2 in / $12 out' },
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', pricing: '$1.50 in / $9 out' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', pricing: '$0.10 in / $0.40 out' },
  ]},
  { label: 'Perplexity', models: [
    { value: 'sonar-pro', label: 'Sonar Pro', pricing: '$3 in / $15 out + req fee' },
    { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro', pricing: '$2 in / $8 out + req fee' },
    { value: 'sonar-deep-research', label: 'Sonar Deep Research', pricing: '$2 in / $8 out + search fee' },
  ]},
];
const COLORS = ['#4A7FA5', '#6B8E5A', '#B5739E', '#C77D4A', '#7B6CB0', '#5A8B8B'];

export default function AgentForm({ agent, onClose }) {
  const [name, setName] = useState(agent?.name || '');
  const [roleDescription, setRoleDescription] = useState(agent?.role_description || '');
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt || '');
  const [model, setModel] = useState(agent?.model || 'gpt-5.4');
  const [color, setColor] = useState(agent?.color || '#4A7FA5');
  const [tools, setTools] = useState(agent?.tools_enabled || { web_search: false, gmail_read: false, gmail_send: false, memory: true });
  const [knowledgeFiles, setKnowledgeFiles] = useState((agent?.knowledge_files || []).map(url => ({ name: decodeURIComponent(url.split('?')[0].split('/').pop()), url })));
  const [personaProfile, setPersonaProfile] = useState(agent?.persona_profile || '');
  const [saving, setSaving] = useState(false);
  const [assignedUserIds, setAssignedUserIds] = useState(agent?.assigned_user_ids || []);
  const [researchConfig, setResearchConfig] = useState(agent?.research_config || { enabled: false, report_time: '07:00', focus_topics: '', document_count: 5 });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    base44.entities.User.list().then(setUsers).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const fileUrls = knowledgeFiles.filter(f => f.url).map(f => f.url);
    const data = { name, role_description: roleDescription, system_prompt: systemPrompt, persona_profile: personaProfile, knowledge_files: fileUrls, model, color, tools_enabled: tools, assigned_user_ids: assignedUserIds, research_config: researchConfig };
    let savedAgentId;
    if (agent) {
      await base44.entities.Agent.update(agent.id, data);
      savedAgentId = agent.id;
    } else {
      const created = await base44.entities.Agent.create(data);
      savedAgentId = created.id;
    }
    try {
      const existingKB = await base44.entities.KnowledgeBase.filter({ agent_id: savedAgentId });
      const existingUrls = existingKB.map(kb => kb.file_url);
      for (const kb of existingKB) {
        if (!fileUrls.includes(kb.file_url)) {
          await base44.entities.KnowledgeBase.delete(kb.id);
        }
      }
      const newFiles = knowledgeFiles.filter(f => f.url && !existingUrls.includes(f.url));
      if (newFiles.length > 0) {
        await base44.entities.KnowledgeBase.bulkCreate(newFiles.map(f => ({ agent_id: savedAgentId, file_name: f.name, file_url: f.url, file_type: f.name.split('.').pop().toLowerCase() })));
      }
    } catch (e) { /* KB sync failed, don't block save */ }
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agent ? 'Edit Agent' : 'New Agent'}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general" className="py-2">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="autonomy">Autonomy</TabsTrigger>
            <TabsTrigger value="access">Access</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-4 mt-4">
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
                {MODEL_GROUPS.map(group => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.models.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        <span className="flex items-center justify-between w-full">
                          <span>{m.label}</span>
                          <span className="text-xs text-muted-foreground ml-3">{m.pricing}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
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
          </TabsContent>
          <TabsContent value="tools" className="space-y-4 mt-4">
            <div>
              <Label>Tools</Label>
            <div className="space-y-2 mt-2">
              {[
                { key: 'web_search', label: 'Web Search' },
                { key: 'gmail_read', label: 'Gmail Read' },
                { key: 'gmail_send', label: 'Gmail Send' },
                { key: 'drive_read', label: 'Google Drive Read' },
                { key: 'fetch_url', label: 'Fetch URL (deep browse)' },
                { key: 'memory', label: 'Memory (auto-summarize conversations)' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox checked={tools[key] || false} onCheckedChange={v => setTools({ ...tools, [key]: v })} id={key} />
                  <label htmlFor={key} className="text-sm cursor-pointer">{label}</label>
                </div>
              ))}
            </div>
          </div>
          </TabsContent>
          <TabsContent value="training" className="space-y-4 mt-4">
            <AgentTraining knowledgeFiles={knowledgeFiles} setKnowledgeFiles={setKnowledgeFiles} personaProfile={personaProfile} setPersonaProfile={setPersonaProfile} />
          </TabsContent>
          <TabsContent value="autonomy" className="space-y-4 mt-4">
            <AgentResearchConfig config={researchConfig} setConfig={setResearchConfig} />
          </TabsContent>
          <TabsContent value="access" className="space-y-4 mt-4">
            <div>
              <Label>Staff Access</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Select which staff members can use this agent. Admins always have access.</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {users.filter(u => u.role !== 'admin').length === 0 ? (
                  <p className="text-sm text-muted-foreground">No staff members found. Invite staff from the Staff page.</p>
                ) : users.filter(u => u.role !== 'admin').map(u => (
                  <div key={u.id} className="flex items-center gap-2">
                    <Checkbox checked={assignedUserIds.includes(u.id)} onCheckedChange={v => setAssignedUserIds(prev => v ? [...prev, u.id] : prev.filter(id => id !== u.id))} id={`user-${u.id}`} />
                    <label htmlFor={`user-${u.id}`} className="text-sm cursor-pointer">{u.full_name || u.email}</label>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name || !systemPrompt}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}