import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, X } from 'lucide-react';
import TagInput from '@/components/TagInput';

export default function SharedKnowledgeForm({ onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (selectedFile) => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setFile({ name: selectedFile.name, url: res.file_url });
    } catch (e) { /* upload failed */ }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    await base44.entities.SharedKnowledgeBase.create({
      title,
      description,
      tags,
      file_url: file.url,
      file_type: file.name.split('.').pop().toLowerCase()
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Knowledge Resource</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. CBT Anxiety Workbook" className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Brief description of this resource..." className="mt-1" />
          </div>
          <div>
            <Label>Tags</Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
          <div>
            <Label>File</Label>
            <input type="file" ref={fileInputRef} onChange={e => handleUpload(e.target.files[0])} className="hidden" />
            {file ? (
              <div className="flex items-center gap-2 bg-accent px-3 py-2 rounded-md mt-1">
                <span className="text-sm flex-1 truncate">{file.name}</span>
                <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-1">
                <Upload className="w-3.5 h-3.5 mr-1" /> {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !file || !title}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}