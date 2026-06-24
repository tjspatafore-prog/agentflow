import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatInput({ value, onChange, onSend, disabled, placeholder }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        placeholder={placeholder || 'Type a message...'}
        disabled={disabled}
        className="flex-1 px-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
      />
      <Button size="icon" onClick={onSend} disabled={disabled || !value.trim()}>
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}