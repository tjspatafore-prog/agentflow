import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, FileText } from 'lucide-react';

export default function AgentResearchConfig({ config, setConfig }) {
  const update = (key, value) => setConfig({ ...config, [key]: value });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between p-4 bg-accent/40 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Autonomous Daily Research</p>
            <p className="text-xs text-muted-foreground">Agent will search the web and save findings automatically</p>
          </div>
        </div>
        <Switch checked={config.enabled || false} onCheckedChange={v => update('enabled', v)} />
      </div>

      {config.enabled && (
        <div className="space-y-4 fade-in">
          <div>
            <Label>Report Time</Label>
            <p className="text-xs text-muted-foreground mb-2">When the agent should run its daily research (your timezone)</p>
            <Input type="time" value={config.report_time || '07:00'} onChange={e => update('report_time', e.target.value)} className="max-w-[160px]" />
          </div>

          <div>
            <Label>Number of Documents</Label>
            <p className="text-xs text-muted-foreground mb-2">How many research documents to save each day</p>
            <Input type="number" min={1} max={20} value={config.document_count || 5} onChange={e => update('document_count', Math.min(Math.max(parseInt(e.target.value) || 1, 1), 20))} className="max-w-[100px]" />
          </div>

          <div>
            <Label>Focus Topics / Tags</Label>
            <p className="text-xs text-muted-foreground mb-2">Comma-separated topics the agent should prioritize when researching</p>
            <Textarea
              value={config.focus_topics || ''}
              onChange={e => update('focus_topics', e.target.value)}
              rows={3}
              placeholder="e.g. CBT techniques, trauma-informed care, adolescent anxiety, mindfulness interventions"
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-lg flex items-start gap-2">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Findings are saved to the Research Archive and agent memory. You can download all documents from the Research page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}