import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export default function SaveToCaseDialog({ messages, agentName, conversationId, onClose }) {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.ClientCase.list('-updated_date').then(c => setCases(c));
    setGenerating(true);
    const transcript = messages.filter(m => m.content).map(m => `${m.role}: ${m.content}`).join('\n\n');
    base44.integrations.Core.InvokeLLM({
      prompt: `Summarize the following conversation with an AI assistant named "${agentName}" in a concise professional note suitable for a client case file. Focus on key topics discussed, insights, and any action items. Keep it under 200 words.\n\nConversation:\n${transcript}`,
      response_json_schema: { type: 'object', properties: { summary: { type: 'string' } } }
    }).then(res => {
      setSummary(res.summary || '');
      setGenerating(false);
    }).catch(() => setGenerating(false));
  }, []);

  const handleSave = async () => {
    if (!selectedCase) return;
    setSaving(true);
    const caseItem = cases.find(c => c.id === selectedCase);
    const existingNotes = caseItem?.case_notes || '';
    const newNote = `[${new Date().toLocaleString()}] Session with ${agentName}:\n${summary}`;
    await base44.entities.ClientCase.update(selectedCase, {
      summary,
      case_notes: existingNotes ? existingNotes + '\n\n' + newNote : newNote
    });
    if (conversationId) {
      await base44.entities.Conversation.update(conversationId, { case_id: selectedCase });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(onClose, 1500);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save to Client Case</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Select Case</Label>
            <Select value={selectedCase} onValueChange={setSelectedCase}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a client case" /></SelectTrigger>
              <SelectContent>
                {cases.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Summary</Label>
            {generating ? (
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Generating summary...
              </div>
            ) : (
              <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={6} className="mt-1" />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !selectedCase || generating || !summary}>
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save to Case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}