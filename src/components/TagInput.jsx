import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const SUGGESTED_TAGS = ['CBT', 'DBT', 'Trauma', 'Anxiety', 'Depression', 'General', 'Youth', 'Marriage', 'Grief', 'Addiction'];

export default function TagInput({ tags = [], onChange, placeholder = 'Type a tag and press Enter...' }) {
  const [input, setInput] = useState('');

  const addTag = (tag) => {
    const cleaned = tag.trim().replace(/,$/, '');
    if (cleaned && !tags.includes(cleaned)) {
      onChange([...tags, cleaned]);
    }
    setInput('');
  };

  const removeTag = (tag) => {
    onChange(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const suggested = SUGGESTED_TAGS.filter(t => !tags.includes(t));

  return (
    <div className="mt-1">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={placeholder}
      />
      {suggested.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggested.map(tag => (
            <button key={tag} type="button" onClick={() => addTag(tag)}
              className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground hover:bg-accent/70 hover:text-foreground transition-colors">
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}