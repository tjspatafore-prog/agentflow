import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function CaseForm({ caseItem, onClose }) {
  const [clientName, setClientName] = useState(caseItem?.client_name || '');
  const [caseNotes, setCaseNotes] = useState(caseItem?.case_notes || '');
  const [status, setStatus] = useState(caseItem?.status || 'active');
  const [tags, setTags] = useState((caseItem?.tags || []).join(', '));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data = {
      client_name: clientName,
      case_notes: caseNotes,
      status,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean)
    };
    if (caseItem) {
      await base44.entities.ClientCase.update(caseItem.id, data);
    } else {
      const user = await base44.auth.me();
      data.counselor_id = user.id;
      await base44.entities.ClientCase.create(data);
    }
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{caseItem ? 'Edit Case' : 'New Case'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Client Name (or pseudonym)</Label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Client A" className="mt-1" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="referred">Referred</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Case Notes</Label>
            <Textarea value={caseNotes} onChange={e => setCaseNotes(e.target.value)} rows={6} placeholder="Session notes, observations, treatment plan..." className="mt-1" />
          </div>
          <div>
            <Label>Tags</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="anxiety, CBT, weekly" className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated keywords</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !clientName}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}