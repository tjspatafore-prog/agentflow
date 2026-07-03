import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Mail, Key, Search, ExternalLink, MessageCircle, HardDrive } from 'lucide-react';
import OrgSettingsSection from '@/components/OrgSettingsSection';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [openaiKey, setOpenaiKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [cseId, setCseId] = useState('');
  const [perplexityKey, setPerplexityKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(null);
  const [driveConnected, setDriveConnected] = useState(null);

  useEffect(() => {
    base44.entities.AppSettings.list().then(s => {
      if (s.length > 0) {
        setSettings(s[0]);
        setOpenaiKey(s[0].openai_api_key || '');
        setGoogleKey(s[0].google_api_key || '');
        setCseId(s[0].google_cse_id || '');
        setPerplexityKey(s[0].perplexity_api_key || '');
        setAnthropicKey(s[0].anthropic_api_key || '');
      }
    });
    base44.functions.invoke('checkGmailStatus', {}).then(res => setGmailConnected(res.data.connected)).catch(() => setGmailConnected(false));
    base44.functions.invoke('checkDriveStatus', {}).then(res => setDriveConnected(res.data.connected)).catch(() => setDriveConnected(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const data = { openai_api_key: openaiKey, google_api_key: googleKey, google_cse_id: cseId, perplexity_api_key: perplexityKey, anthropic_api_key: anthropicKey };
    if (settings) {
      await base44.entities.AppSettings.update(settings.id, data);
    } else {
      const created = await base44.entities.AppSettings.create(data);
      setSettings(created);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">Settings</h1>

      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">API Keys</h2>
          </div>
          <div className="space-y-4 p-5 border border-border rounded-lg">
            <div>
              <Label>OpenAI API Key</Label>
              <Input type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} placeholder="sk-..." className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Used for all agent LLM calls</p>
            </div>
            <div>
              <Label>Google API Key</Label>
              <Input type="password" value={googleKey} onChange={e => setGoogleKey(e.target.value)} placeholder="AIza..." className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">For Google Custom Search and Gemini AI models. Enable the Generative Language API in Google Cloud.</p>
            </div>
            <div>
              <Label>Google Custom Search Engine ID</Label>
              <Input value={cseId} onChange={e => setCseId(e.target.value)} placeholder="e.g. 012345678901234567890:abcdefg" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Create a Custom Search Engine at cse.google.com</p>
            </div>
            <div>
              <Label>Perplexity API Key</Label>
              <Input type="password" value={perplexityKey} onChange={e => setPerplexityKey(e.target.value)} placeholder="pplx-..." className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">For Perplexity Sonar models with built-in web search</p>
            </div>
            <div>
              <Label>Anthropic API Key</Label>
              <Input type="password" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} placeholder="sk-ant-..." className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">For Claude models (Sonnet, Opus, Haiku)</p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Keys'}
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Gmail Integration</h2>
          </div>
          <div className="p-5 border border-border rounded-lg">
            {gmailConnected === null ? (
              <p className="text-sm text-muted-foreground">Checking connection...</p>
            ) : gmailConnected ? (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <p className="text-sm">Gmail is connected. Agents can read and send emails.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Gmail is not connected. Ask in the chat to connect your Gmail account.</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Google Drive Integration</h2>
          </div>
          <div className="p-5 border border-border rounded-lg">
            {driveConnected === null ? (
              <p className="text-sm text-muted-foreground">Checking connection...</p>
            ) : driveConnected ? (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <p className="text-sm">Google Drive is connected. Agents can search and read your documents, sheets, and slides.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Google Drive is not connected. Ask in the chat to connect your Drive account.</p>
            )}
          </div>
        </div>

        <OrgSettingsSection />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">WhatsApp</h2>
          </div>
          <div className="p-5 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">Connect your WhatsApp to chat with your AI agents on the go. The Nexus Gateway will automatically route your message to the right assistant — Therapy Assistant for clinical and counseling questions, or Devotional Therapist for spiritual guidance and devotionals. You can also switch agents anytime by saying "switch to [agent name]".</p>
            <a href={base44.agents.getWhatsAppConnectURL('nexus_assistant')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
              <MessageCircle className="w-4 h-4" />
              Connect WhatsApp
            </a>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Web Search Setup</h2>
          </div>
          <div className="p-5 border border-border rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">To enable web search for your agents:</p>
            <ol className="text-sm text-muted-foreground list-decimal pl-4 space-y-1">
              <li>Create a project at <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-3 h-3" /></a></li>
              <li>Enable the Custom Search API and create an API key</li>
              <li>Create a Custom Search Engine at <a href="https://cse.google.com" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">cse.google.com <ExternalLink className="w-3 h-3" /></a></li>
              <li>Enter both keys above and save</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}