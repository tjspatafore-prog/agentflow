import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';

export default function TeamChat() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [agents, setAgents] = useState([]);
  const [goal, setGoal] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [executing, setExecuting] = useState(false);
  const [trace, setTrace] = useState([]);
  const [finalResponse, setFinalResponse] = useState(null);
  const [error, setError] = useState(null);
  const responseRef = useRef(null);

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

  useEffect(() => {
    base44.entities.Team.get(id).then(async t => {
      setTeam(t);
      const agentData = await Promise.all((t.agent_ids || []).map(aid => base44.entities.Agent.get(aid)));
      setAgents(agentData);
    });
  }, [id]);

  const handleExecute = async () => {
    const readyAttachments = attachments.filter(a => a.url && !a.uploading);
    if ((!goal.trim() && readyAttachments.length === 0) || executing) return;
    const fileUrls = readyAttachments.map(a => a.url);
    setExecuting(true);
    setError(null);
    setTrace([]);
    setFinalResponse(null);
    setAttachments([]);

    try {
      const res = await base44.functions.invoke('executeTeamGoal', { team_id: id, goal: goal.trim(), file_urls: fileUrls });
      setTrace(res.data.trace || []);
      setFinalResponse(res.data.final_response);
      setTimeout(() => responseRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setExecuting(false);
  };

  if (!team) return <div className="p-10 text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-border">
        <Link to="/teams"><ArrowLeft className="w-4 h-4 text-muted-foreground" /></Link>
        <div>
          <p className="font-medium text-sm">{team.name}</p>
          <p className="text-xs text-muted-foreground">{agents.length} agents</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex flex-wrap gap-2">
            {agents.map(a => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-full">
                <div className="w-2 h-2 rounded-full" style={{ background: a.color || '#4A7FA5' }} />
                <span className="text-xs">{a.name}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Assign a Goal</p>
            <ChatInput value={goal} onChange={setGoal} onSend={handleExecute} disabled={executing} placeholder="Describe what you want the team to accomplish..." attachments={attachments} onAttach={handleAttach} onRemoveAttachment={handleRemoveAttachment} />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</div>
          )}

          {trace.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Execution Trace</p>
              {trace.map((step, i) => (
                <div key={i} className="p-3 border border-border rounded-lg fade-in">
                  <div className="flex items-center gap-2">
                    {step.status === 'running' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : step.status === 'done' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{step.step}</span>
                    {step.agent && <span className="text-xs text-primary font-medium">{step.agent}</span>}
                  </div>
                  <p className="text-sm mt-1">{step.description || step.task}</p>
                  {step.preview && <p className="text-xs text-muted-foreground mt-1">{step.preview}...</p>}
                </div>
              ))}
            </div>
          )}

          {finalResponse && (
            <div ref={responseRef} className="fade-in">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Final Result
              </p>
              <ChatMessage message={{ role: 'assistant', content: finalResponse }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}