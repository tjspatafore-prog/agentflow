import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

const CATEGORIES = ['CBT', 'DBT', 'Trauma', 'Anxiety', 'Depression', 'General'];

export default function SharedKnowledgeBulkUpload({ onClose }) {
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef(null);

  const handleSelect = (selected) => {
    const newFiles = Array.from(selected).map(f => ({ file: f, name: f.name, status: 'pending' }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    const records = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item));
      try {
        const res = await base44.integrations.Core.UploadFile({ file: f.file });
        records.push({
          title: f.name.replace(/\.[^.]+$/, ''),
          description,
          category,
          file_url: res.file_url,
          file_type: f.name.split('.').pop().toLowerCase()
        });
        setFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'done' } : item));
      } catch (e) {
        setFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error' } : item));
      }
      setProgress({ done: i + 1, total: files.length });
    }
    if (records.length > 0) {
      await base44.entities.SharedKnowledgeBase.bulkCreate(records);
    }
    setUploading(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add Resources</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Category (applies to all)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description (optional, applies to all)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." className="mt-1" />
          </div>
          <div>
            <Label>Files</Label>
            <input type="file" multiple ref={fileInputRef} onChange={e => { handleSelect(e.target.files); e.target.value = ''; }} className="hidden" />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-1">
              <Upload className="w-3.5 h-3.5 mr-1" /> Select Files
            </Button>
            {files.length > 0 && (
              <div className="space-y-1.5 mt-3">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-accent px-3 py-2 rounded-md">
                    {f.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> :
                     f.status === 'error' ? <AlertCircle className="w-4 h-4 text-destructive shrink-0" /> :
                     <FileText className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <span className="text-sm flex-1 truncate">{f.name}</span>
                    {f.status === 'uploading' && <span className="text-xs text-muted-foreground">Uploading...</span>}
                    {f.status === 'error' && <span className="text-xs text-destructive">Failed</span>}
                    {!uploading && f.status === 'pending' && (
                      <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {uploading && (
              <p className="text-xs text-muted-foreground mt-2">Uploading {progress.done} of {progress.total}...</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
            {uploading ? `Uploading ${progress.done}/${progress.total}...` : `Add ${files.length || ''} Resource${files.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}