import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2 } from 'lucide-react';

export default function OrgSettingsSection() {
  const [settings, setSettings] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [orgTone, setOrgTone] = useState('');
  const [emergencyKeywords, setEmergencyKeywords] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.OrganizationSettings.list().then(s => {
      if (s.length > 0) {
        setSettings(s[0]);
        setOrgName(s[0].org_name || '');
        setOrgTone(s[0].org_tone || '');
        setEmergencyKeywords((s[0].emergency_keywords || []).join(', '));
        setEmergencyContact(s[0].emergency_contact || '');
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const data = {
      org_name: orgName,
      org_tone: orgTone,
      emergency_keywords: emergencyKeywords.split(',').map(k => k.trim()).filter(Boolean),
      emergency_contact: emergencyContact
    };
    if (settings) {
      await base44.entities.OrganizationSettings.update(settings.id, data);
    } else {
      const created = await base44.entities.OrganizationSettings.create(data);
      setSettings(created);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Organization Settings</h2>
      </div>
      <div className="space-y-4 p-5 border border-border rounded-lg">
        <div>
          <Label>Organization Name</Label>
          <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Hope Counseling Center" className="mt-1" />
        </div>
        <div>
          <Label>Organization Tone</Label>
          <Textarea value={orgTone} onChange={e => setOrgTone(e.target.value)} rows={4} placeholder="Define a tone that all agents will adopt. e.g. 'Always respond with empathy and warmth. Use plain language. Avoid clinical jargon unless asked...'" className="mt-1" />
          <p className="text-xs text-muted-foreground mt-1">This is automatically injected into every agent's system prompt.</p>
        </div>
        <div>
          <Label>Emergency Keywords</Label>
          <Input value={emergencyKeywords} onChange={e => setEmergencyKeywords(e.target.value)} placeholder="suicide, self-harm, crisis, emergency" className="mt-1" />
          <p className="text-xs text-muted-foreground mt-1">Comma-separated. When detected in a chat, an alert is triggered.</p>
        </div>
        <div>
          <Label>Emergency Contact</Label>
          <Input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} placeholder="e.g. supervisor@org.com or 988" className="mt-1" />
          <p className="text-xs text-muted-foreground mt-1">Contact info shown or notified when emergency keywords are detected.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Organization Settings'}
        </Button>
      </div>
    </div>
  );
}