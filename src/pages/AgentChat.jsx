import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Brain, Trash2, X, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import SaveToCaseDialog from '@/components/SaveToCaseDialog';

export default function AgentChat() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [showMemory, setShowMemory] = useState(false);
  const [showSaveToCase, setShowSaveToCase] = useState(false);
  const [memories, setMemories] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Agent.get(id),
      base44.entities.Conversation.filter({ agent_id: id }, '-updated_date', 1)
    ]).then(([a, convs]) => {
      setAgent(a);
      if (convs.length > 0) {
        setConversation(convs[0]);
        setMessages(convs[0].messages || []);
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleAttach = async (files) => {
    for (const file of files) {
      const tempId = Date.now() + Math.random();
      setAttachments(prev => [...prev, { id: tempId, name: file.name, uploading: true, url: null }]);
      try {
        const res = await base44.integrations.Core.UploadFile({ file });
        setAttachments(prev => prev.map(a => a.id === tempId ? { ...a, uploading: false, url: res.file_url } : a));
      } catch (e) {
        setAttachments(prev => prev.filter(a => a.id !== tempId));
      }
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || sending) return;
    const msg = input.trim();
    const readyAttachments = attachments.filter(a => a.url && !a.uploading);
    const fileUrls = readyAttachments.map(a => a.url);
    const attachmentMeta = readyAttachments.map(a => ({ name: a.name, url: a.url }));
    setInput('');
    setAttachments([]);
    setSending(true);
    setError(null);

    setMessages(prev => [...prev, { role: 'user', content: msg || '(Attachment)', attachments: attachmentMeta, timestamp: new Date().toISOString() }]);

    try {
      const res = await base44.functions.invoke('chatWithAgent', {
        agent_id: id,
        conversation_id: conversation?.id,
        message: msg,
        file_urls: fileUrls
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message, timestamp: new Date().toISOString() }]);
      if (!conversation) setConversation({ id: res.data.conversation_id });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setSending(false);
  };

  const loadMemory = async () => {
    const mems = await base44.entities.Memory.filter({ agent_id: id }, '-created_date', 20);
    setMemories(mems);
    setShowMemory(true);
  };

  const deleteMemory = async (memId) => {
    await base44.entities.Memory.delete(memId);
    setMemories(prev => prev.filter(m => m.id !== memId));
  };

  if (loading) return <div className="p-10 text-muted-foreground text-sm">Loading...</div>;
  if (!agent) return <div className="p-10 text-muted-foreground text-sm">Agent not found</div>;

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Link to="/agents"><ArrowLeft className="w-4 h-4 text-muted-foreground" /></Link>
          <div className="w-2 h-6 rounded-full" style={{ background: agent.color || '#4A7FA5' }} />
          <div>
            <p className="font-medium text-sm">{agent.name}</p>
            <p className="text-xs text-muted-foreground">{agent.model}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setShowSaveToCase(true)} disabled={messages.length === 0}>
            <FolderPlus className="w-4 h-4 mr-1" /> Save to Case
          </Button>
          <Button variant="ghost" size="sm" onClick={loadMemory}>
            <Brain className="w-4 h-4 mr-1" /> Memory
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && !sending && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-sm">Start a conversation with {agent.name}</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}
          {sending && (
            <div className="flex justify-start fade-in">
              <div className="bg-card border border-border px-4 py-2.5 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="px-4 md:px-6 py-4 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <ChatInput value={input} onChange={setInput} onSend={handleSend} disabled={sending} attachments={attachments} onAttach={handleAttach} onRemoveAttachment={handleRemoveAttachment} />
        </div>
      </div>

      {showSaveToCase && (
        <SaveToCaseDialog messages={messages} agentName={agent.name} onClose={() => setShowSaveToCase(false)} />
      )}

      {showMemory && (
        <div className="fixed inset-0 bg-black/20 flex justify-end z-50" onClick={() => setShowMemory(false)}>
          <div className="w-full max-w-md bg-background h-full overflow-y-auto p-6 fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Memory</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowMemory(false)}><X className="w-4 h-4" /></Button>
            </div>
            {memories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No memories yet. Memories are auto-generated from conversations.</p>
            ) : (
              <div className="space-y-3">
                {memories.map(m => (
                  <div key={m.id} className="p-3 border border-border rounded-lg group">
                    <p className="text-sm">{m.content}</p>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 mt-2 h-7 text-xs" onClick={() => deleteMemory(m.id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}