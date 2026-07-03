import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Copy, Check, Sparkles, Brain, BookOpen } from 'lucide-react';

export default function WhatsAppConnect() {
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setWhatsappUrl(base44.agents.getWhatsAppConnectURL('nexus_assistant'));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp Connect</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Chat with your AI agents from anywhere. The Nexus Gateway automatically routes your message to the right assistant.
      </p>

      <Card className="mb-6 border-border">
        <CardContent className="p-6">
          <h2 className="text-sm font-medium mb-4">How it works</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary text-sm font-medium">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Connect your WhatsApp</p>
                <p className="text-xs text-muted-foreground mt-0.5">Click the button below to open WhatsApp and start your private conversation with the Nexus Gateway.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary text-sm font-medium">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">Send any message</p>
                <p className="text-xs text-muted-foreground mt-0.5">The gateway reads your message and automatically sends it to the right assistant.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary text-sm font-medium">3</span>
              </div>
              <div>
                <p className="text-sm font-medium">Switch anytime</p>
                <p className="text-xs text-muted-foreground mt-0.5">Say "switch to [agent name]" to direct your messages to a specific assistant.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 border-border">
        <CardContent className="p-6">
          <h2 className="text-sm font-medium mb-4">Available Assistants</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
              <Brain className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Therapy Assistant</p>
                <p className="text-xs text-muted-foreground mt-0.5">Clinical questions, counseling techniques (CBT, DBT, REBT, NLP), camper behavior, mental health concerns, and facilitator guidance.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
              <BookOpen className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Devotional Therapist</p>
                <p className="text-xs text-muted-foreground mt-0.5">Spiritual growth, Biblical wisdom, prayer requests, devotionals, scripture, and faith-based reflection.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
          <MessageCircle className="w-4 h-4" />
          Connect on WhatsApp
        </a>
        {whatsappUrl && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground truncate flex-1 bg-accent/50 px-3 py-2 rounded-lg">{whatsappUrl}</p>
            <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}