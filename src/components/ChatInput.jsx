import { useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatInput({ value, onChange, onSend, disabled, placeholder, attachments, onAttach, onRemoveAttachment }) {
  const fileInputRef = useRef(null);
  const hasAttachments = attachments && attachments.length > 0;
  const canSend = value.trim() || (attachments && attachments.some(a => !a.uploading));

  return (
    <div>
      {hasAttachments && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-accent px-2.5 py-1.5 rounded-md text-xs">
              {att.uploading ? (
                <span className="text-muted-foreground animate-pulse">Uploading {att.name}...</span>
              ) : (
                <>
                  <span className="truncate max-w-[150px]">{att.name}</span>
                  <button onClick={() => onRemoveAttachment(i)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={e => { onAttach(Array.from(e.target.files)); e.target.value = ''; }}
          className="hidden"
        />
        <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
          <Paperclip className="w-4 h-4" />
        </Button>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder={placeholder || 'Type a message...'}
          disabled={disabled}
          className="flex-1 px-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
        />
        <Button size="icon" onClick={onSend} disabled={disabled || !canSend}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}