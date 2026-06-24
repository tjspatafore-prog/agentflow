import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Sparkles, FileText } from 'lucide-react';

export default function AgentTraining({ knowledgeFiles, setKnowledgeFiles, personaProfile, setPersonaProfile }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (files) => {
    for (const file of files) {
      const tempId = Date.now() + Math.random();
      setKnowledgeFiles(prev => [...prev, { id: tempId, name: file.name, uploading: true, url: null }]);
      try {
        const res = await base44.integrations.Core.UploadFile({ file });
        setKnowledgeFiles(prev => prev.map(f => f.id === tempId ? { ...f, uploading: false, url: res.file_url } : f));
      } catch (e) {
        setKnowledgeFiles(prev => prev.filter(f => f.id !== tempId));
      }
    }
  };

  const handleRemove = (index) => {
    setKnowledgeFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    const readyFiles = knowledgeFiles.filter(f => f.url && !f.uploading);
    if (readyFiles.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('generatePersona', {
        file_urls: readyFiles.map(f => f.url)
      });
      setPersonaProfile(res.data.persona_profile);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-2">
      <Label>Training & Tone</Label>
      <p className="text-xs text-muted-foreground">Upload reference files (docs, writing samples, style guides) and generate a persona profile so this agent responds in the same tone and style.</p>

      <input type="file" ref={fileInputRef} multiple onChange={e => { handleUpload(Array.from(e.target.files)); e.target.value = ''; }} className="hidden" />

      {knowledgeFiles.length > 0 && (
        <div className="space-y-1.5">
          {knowledgeFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-2 bg-accent px-2.5 py-1.5 rounded-md text-xs">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{file.name}</span>
              {file.uploading ? (
                <span className="text-muted-foreground animate-pulse">uploading...</span>
              ) : (
                <button onClick={() => handleRemove(i)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-3.5 h-3.5 mr-1" /> Upload Files
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={generating || knowledgeFiles.filter(f => !f.uploading).length === 0}>
          <Sparkles className="w-3.5 h-3.5 mr-1" /> {generating ? 'Analyzing...' : 'Generate Persona'}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {personaProfile && (
        <div>
          <Label className="text-xs">Persona Profile (auto-generated, editable)</Label>
          <Textarea value={personaProfile} onChange={e => setPersonaProfile(e.target.value)} rows={4} placeholder="The agent's writing persona will appear here after generation..." className="mt-1 text-xs" />
        </div>
      )}
    </div>
  );
}